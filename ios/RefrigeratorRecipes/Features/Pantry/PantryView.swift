import SwiftUI
import SwiftData
import VisionKit
import FridgeCore

struct PantryView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \PantryItem.name) private var items: [PantryItem]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var filter: StorageLocation?
    @State private var search = ""
    @State private var editorDraft: PantryItemEditor.Draft?
    @State private var editingItem: PantryItem?
    @State private var showBarcodeScanner = false
    @State private var showPhotoScan = false
    @State private var showReceiptScan = false
    @State private var showSettings = false
    @State private var lookupMessage: String?

    private var filtered: [PantryItem] {
        items.filter { item in
            (filter == nil || item.location == filter)
                && (search.isEmpty || item.name.localizedCaseInsensitiveContains(search))
        }
    }

    private var urgent: [PantryItem] {
        filtered
            .filter { $0.expiryStatus(soonThresholdDays: soonDays).isUrgent }
            .sorted { $0.expiryStatus(soonThresholdDays: soonDays).urgency < $1.expiryStatus(soonThresholdDays: soonDays).urgency }
    }

    private func stored(in location: StorageLocation) -> [PantryItem] {
        filtered
            .filter { $0.location == location && !$0.expiryStatus(soonThresholdDays: soonDays).isUrgent }
            .sorted { $0.expiryStatus(soonThresholdDays: soonDays).urgency < $1.expiryStatus(soonThresholdDays: soonDays).urgency }
    }

    private var barcodeScanningAvailable: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }

    var body: some View {
        NavigationStack {
            List {
                Picker("Location", selection: $filter) {
                    Text("All").tag(StorageLocation?.none)
                    ForEach(StorageLocation.allCases) { Text($0.title).tag(Optional($0)) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())

                if !urgent.isEmpty {
                    Section("Use soon") {
                        ForEach(urgent) { row(for: $0) }
                    }
                }
                ForEach(StorageLocation.allCases) { location in
                    let group = stored(in: location)
                    if !group.isEmpty {
                        Section(location.title) {
                            ForEach(group) { row(for: $0) }
                        }
                    }
                }
            }
            .overlay {
                if items.isEmpty {
                    ContentUnavailableView {
                        Label("Your fridge is empty", systemImage: "refrigerator")
                    } description: {
                        Text("Scan your last grocery receipt to fill it in one go, or add items yourself. Then you'll see which recipes you can make and get reminders before food goes bad.")
                    } actions: {
                        Button("Scan a receipt") { showReceiptScan = true }
                            .buttonStyle(.borderedProminent)
                        Button("Add an item") { editorDraft = .init() }
                    }
                } else if filtered.isEmpty {
                    ContentUnavailableView.search(text: search)
                }
            }
            .searchable(text: $search, prompt: "Search items")
            .navigationTitle("Fridge")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                        .accessibilityLabel("Settings")
                }
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button { showReceiptScan = true } label: {
                            Label("Scan receipt", systemImage: "doc.text.viewfinder")
                        }
                        Button { editorDraft = .init(location: filter ?? .fridge) } label: {
                            Label("Add item", systemImage: "square.and.pencil")
                        }
                        if barcodeScanningAvailable {
                            Button { showBarcodeScanner = true } label: {
                                Label("Scan barcode", systemImage: "barcode.viewfinder")
                            }
                        }
                        Button { showPhotoScan = true } label: {
                            Label("Photo of groceries", systemImage: "camera.viewfinder")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add")
                }
            }
            .sheet(item: $editorDraft) { draft in
                PantryItemEditor(draft: draft, item: nil)
            }
            .sheet(item: $editingItem) { item in
                PantryItemEditor(draft: .init(item: item), item: item)
            }
            .sheet(isPresented: $showBarcodeScanner) {
                BarcodeScannerSheet { code in
                    showBarcodeScanner = false
                    Task { await handleBarcode(code) }
                }
            }
            .sheet(isPresented: $showPhotoScan) {
                PhotoScanView()
            }
            .sheet(isPresented: $showReceiptScan) {
                ReceiptScanView()
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .alert("Barcode", isPresented: Binding(get: { lookupMessage != nil }, set: { if !$0 { lookupMessage = nil } })) {
                Button("OK") {}
            } message: {
                Text(lookupMessage ?? "")
            }
        }
    }

    private func row(for item: PantryItem) -> some View {
        Button { editingItem = item } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name).foregroundStyle(.primary)
                    let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
                    if !qty.isEmpty || !item.category.isEmpty {
                        Text([qty, item.category].filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                ExpiryBadge(status: item.expiryStatus(soonThresholdDays: soonDays))
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { context.delete(item) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading) {
            Button {
                context.insert(ShoppingItem(name: item.name, quantity: item.quantity, unit: item.unit, reason: "Used up"))
                context.delete(item)
            } label: {
                Label("Used up", systemImage: "cart.badge.plus")
            }
            .tint(.blue)
        }
    }

    private func handleBarcode(_ code: String) async {
        var draft = PantryItemEditor.Draft(location: filter ?? .fridge)
        draft.barcode = code
        do {
            if let product = try await ProductLookup.lookup(barcode: code) {
                draft.name = product.name
                draft.category = product.category ?? ""
                draft.notes = [product.brand, product.quantityText].compactMap { $0 }.joined(separator: " · ")
            } else {
                lookupMessage = "No product found for \(code). You can enter it manually."
            }
        } catch {
            lookupMessage = "Couldn't look up \(code): \(error.localizedDescription)"
        }
        editorDraft = draft
    }
}
