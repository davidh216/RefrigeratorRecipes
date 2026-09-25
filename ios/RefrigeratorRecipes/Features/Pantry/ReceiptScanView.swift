import SwiftUI
import SwiftData
import PhotosUI
import VisionKit
import FridgeCore

/// Scan a grocery receipt, review what Claude read, then put it all away in one tap.
struct ReceiptScanView: View {
    struct ReviewItem: Identifiable {
        let id = UUID()
        var include = true
        var name: String
        var quantity: Double
        var unit: String
        var price: Double?
        var category: String
        var location: StorageLocation
        /// Estimated days until it spoils, counted from the purchase date.
        var shelfLifeDays: Int?
        /// A date the user picked by hand; wins over the estimate.
        var manualExpiry: Date?

        func expiresAt(purchasedAt: Date) -> Date? {
            if let manualExpiry { return manualExpiry }
            guard let shelfLifeDays else { return nil }
            let calendar = Calendar.current
            return calendar.date(byAdding: .day, value: shelfLifeDays, to: calendar.startOfDay(for: purchasedAt))
        }
    }

    private enum Phase { case capture, reading, review }
    private struct EditTarget: Identifiable { let id: UUID }
    private static let maxPages = 5

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(filter: #Predicate<ShoppingItem> { !$0.isChecked }) private var shopping: [ShoppingItem]

    @State private var phase: Phase = .capture
    @State private var pages: [UIImage] = []
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showDocumentCamera = false
    @State private var errorMessage: String?
    @State private var store = ""
    @State private var purchasedAt = Date.now
    @State private var items: [ReviewItem] = []
    @State private var skippedLines: [String] = []
    @State private var checkOffShopping = true
    @State private var editing: EditTarget?

    private var includedCount: Int { items.filter(\.include).count }

    private var coveredShoppingItems: [ShoppingItem] {
        let purchased = items.filter(\.include).map(\.name)
        return ReceiptImport.purchasedShoppingIndexes(purchased: purchased, shoppingList: shopping.map(\.name))
            .map { shopping[$0] }
    }

    var body: some View {
        NavigationStack {
            List {
                switch phase {
                case .capture: captureSections
                case .reading: readingSection
                case .review: reviewSections
                }
            }
            .navigationTitle("Scan receipt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                if phase == .review {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Add \(includedCount)", action: putAway)
                            .disabled(includedCount == 0)
                    }
                }
            }
            .onChange(of: pickerItems) { _, newItems in
                guard !newItems.isEmpty else { return }
                Task {
                    var images: [UIImage] = []
                    for item in newItems.prefix(Self.maxPages) {
                        if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                            images.append(image)
                        }
                    }
                    pickerItems = []
                    await read(images)
                }
            }
            .fullScreenCover(isPresented: $showDocumentCamera) {
                DocumentCamera { images in
                    showDocumentCamera = false
                    if !images.isEmpty { Task { await read(Array(images.prefix(Self.maxPages))) } }
                }
                .ignoresSafeArea()
            }
            .sheet(item: $editing) { target in
                if let index = items.firstIndex(where: { $0.id == target.id }) {
                    ReceiptItemEditor(item: $items[index], purchasedAt: purchasedAt)
                }
            }
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private var captureSections: some View {
        Section {
            if VNDocumentCameraViewController.isSupported {
                Button { showDocumentCamera = true } label: {
                    Label("Scan with camera", systemImage: "doc.text.viewfinder")
                }
            }
            PhotosPicker(selection: $pickerItems, maxSelectionCount: Self.maxPages, matching: .images) {
                Label("Choose receipt photos", systemImage: "photo.on.rectangle")
            }
        } footer: {
            Text("Lay the receipt flat in good light. For a long receipt, capture it in several pages, top to bottom. Photos are sent to Claude to read the items.")
        }
        if let errorMessage {
            Section { Text(errorMessage).foregroundStyle(.red) }
        }
    }

    private var readingSection: some View {
        Section {
            HStack(spacing: 12) {
                ProgressView()
                Text(pages.count > 1 ? "Reading \(pages.count) pages…" : "Reading receipt…")
                    .foregroundStyle(.secondary)
            }
            ScrollView(.horizontal) {
                HStack {
                    ForEach(pages.indices, id: \.self) { index in
                        Image(uiImage: pages[index])
                            .resizable()
                            .scaledToFit()
                            .frame(height: 160)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var reviewSections: some View {
        Section {
            if !store.isEmpty { LabeledContent("Store", value: store) }
            DatePicker("Purchased", selection: $purchasedAt, in: ...Date.now, displayedComponents: .date)
        } footer: {
            Text("Expiry dates are estimated from the purchase date. Tap an item to change it.")
        }

        ForEach(StorageLocation.allCases) { location in
            let indexes = items.indices.filter { items[$0].location == location }
            if !indexes.isEmpty {
                Section(location.title) {
                    ForEach(indexes, id: \.self) { index in
                        row(index)
                    }
                }
            }
        }

        let covered = coveredShoppingItems
        if !covered.isEmpty {
            Section {
                Toggle(isOn: $checkOffShopping) {
                    Text("Check off \(covered.count) item\(covered.count == 1 ? "" : "s") on your shopping list")
                }
            } footer: {
                Text(covered.map(\.name).joined(separator: ", "))
            }
        }

        if !skippedLines.isEmpty {
            Section {
                DisclosureGroup("Skipped \(skippedLines.count) non-food line\(skippedLines.count == 1 ? "" : "s")") {
                    ForEach(skippedLines, id: \.self) { Text($0).font(.caption.monospaced()) }
                }
            }
        }

        Section {
            Button("Scan a different receipt") {
                items = []
                phase = .capture
            }
        }
    }

    private func row(_ index: Int) -> some View {
        let item = items[index]
        return HStack(spacing: 12) {
            Button { items[index].include.toggle() } label: {
                Image(systemName: item.include ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(item.include ? Color.accentColor : Color.secondary)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(item.include ? "Don't add \(item.name)" : "Add \(item.name)")

            Button { editing = EditTarget(id: item.id) } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name).foregroundStyle(item.include ? Color.primary : Color.secondary)
                        Text(detail(for: item)).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    ExpiryBadge(status: ExpiryStatus.of(
                        expiresAt: item.expiresAt(purchasedAt: purchasedAt),
                        soonThresholdDays: KitchenPreferences.current.soonThresholdDays
                    ))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
        }
    }

    private func detail(for item: ReviewItem) -> String {
        var parts: [String] = []
        let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
        if !qty.isEmpty { parts.append(qty) }
        if let price = item.price { parts.append(price.formatted(.currency(code: Locale.current.currency?.identifier ?? "USD"))) }
        if !item.category.isEmpty { parts.append(item.category) }
        return parts.joined(separator: " · ")
    }

    // MARK: - Actions

    private func read(_ images: [UIImage]) async {
        guard !images.isEmpty else { return }
        pages = images
        errorMessage = nil
        phase = .reading
        do {
            let jpegs = images.compactMap { $0.resized(maxDimension: 1568).jpegData(compressionQuality: 0.85) }
            let scan = try await ClaudeClient.fromSettings().readReceipt(pages: jpegs)
            let lines = scan.items.map {
                ReceiptLine(
                    rawText: $0.raw_text, name: $0.name, quantity: $0.quantity, unit: $0.unit, price: $0.price,
                    category: $0.category, location: $0.location, shelfLifeDays: $0.shelf_life_days, isFood: $0.is_food
                )
            }
            let receiptItems = ReceiptImport.items(from: lines)
            guard !receiptItems.isEmpty else {
                errorMessage = "No food items found on that receipt. Try a sharper photo with the whole receipt in frame."
                phase = .capture
                return
            }
            store = scan.store
            purchasedAt = ReceiptImport.purchaseDate(from: scan.purchase_date)
            skippedLines = scan.items.filter { !$0.is_food }.map { $0.raw_text.isEmpty ? $0.name : $0.raw_text }
            items = receiptItems.map {
                ReviewItem(
                    name: $0.name, quantity: $0.quantity, unit: $0.unit, price: $0.price, category: $0.category,
                    location: StorageLocation(rawValue: $0.location) ?? .fridge, shelfLifeDays: $0.shelfLifeDays
                )
            }
            checkOffShopping = true
            phase = .review
        } catch {
            errorMessage = error.localizedDescription
            phase = .capture
        }
    }

    private func putAway() {
        let note = store.isEmpty ? "" : "From \(store)"
        for item in items where item.include {
            let pantryItem = PantryItem(
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                location: item.location,
                category: item.category,
                expiresAt: item.expiresAt(purchasedAt: purchasedAt)
            )
            pantryItem.price = item.price
            pantryItem.notes = note
            context.insert(pantryItem)
        }
        if checkOffShopping {
            for shoppingItem in coveredShoppingItems { context.delete(shoppingItem) }
        }
        dismiss()
    }
}

/// Edit one item from the receipt before it goes in the fridge.
private struct ReceiptItemEditor: View {
    @Binding var item: ReceiptScanView.ReviewItem
    let purchasedAt: Date
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $item.name)
                    HStack {
                        TextField("Qty", value: $item.quantity, format: .number)
                            .keyboardType(.decimalPad)
                            .frame(maxWidth: 80)
                        TextField("Unit", text: $item.unit)
                            .textInputAutocapitalization(.never)
                    }
                    Picker("Stored in", selection: $item.location) {
                        ForEach(StorageLocation.allCases) { Label($0.title, systemImage: $0.symbol).tag($0) }
                    }
                    TextField("Category", text: $item.category)
                        .textInputAutocapitalization(.never)
                }
                Section("Expiration") {
                    Toggle("Has an expiration date", isOn: hasExpiry.animation())
                    if item.expiresAt(purchasedAt: purchasedAt) != nil {
                        DatePicker("Expires", selection: expiry, displayedComponents: .date)
                    }
                }
                Section {
                    Toggle("Add this item", isOn: $item.include)
                }
            }
            .navigationTitle(item.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var hasExpiry: Binding<Bool> {
        Binding(
            get: { item.expiresAt(purchasedAt: purchasedAt) != nil },
            set: { on in
                if on {
                    item.manualExpiry = Calendar.current.date(byAdding: .day, value: 7, to: Calendar.current.startOfDay(for: purchasedAt))
                } else {
                    item.manualExpiry = nil
                    item.shelfLifeDays = nil
                }
            }
        )
    }

    private var expiry: Binding<Date> {
        Binding(
            get: { item.expiresAt(purchasedAt: purchasedAt) ?? .now },
            set: { item.manualExpiry = $0 }
        )
    }
}

/// VisionKit's document scanner: auto-detects edges, flattens, and supports multiple pages.
struct DocumentCamera: UIViewControllerRepresentable {
    let onFinish: ([UIImage]) -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let controller = VNDocumentCameraViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onFinish: ([UIImage]) -> Void
        init(onFinish: @escaping ([UIImage]) -> Void) { self.onFinish = onFinish }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            onFinish((0..<scan.pageCount).map { scan.imageOfPage(at: $0) })
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            onFinish([])
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            onFinish([])
        }
    }
}
