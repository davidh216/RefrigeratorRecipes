import SwiftUI
import SwiftData
import VisionKit
import FridgeCore

/// The Fridge tab: the freshness strip, location chips, the weekly check-in entry,
/// then the food grouped by urgency and by where it's stored (DESIGN.md §8.3).
struct PantryView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \PantryItem.name) private var items: [PantryItem]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.lastCheckInAt) private var lastCheckInAt = SettingsDefault.lastCheckInAt

    @State private var filter: StorageLocation?
    @State private var toneFilter: FreshTone?
    @State private var search = ""
    @State private var editorDraft: PantryItemEditor.Draft?
    @State private var editingItem: PantryItem?
    @State private var chefQuestion: ChefQuestion?
    @State private var showBarcodeScanner = false
    @State private var showPhotoScan = false
    @State private var showReceiptScan = false
    @State private var showSettings = false
    @State private var lookupMessage: String?
    @State private var usedUpCount = 0

    /// Scroll target for the strip headline: the Use soon section (or Past date when nothing is soon).
    private static let useSoonID = "useSoon"
    private static let basketSymbol = Theme.symbol("basket", fallback: "cart")
    private static let basketFillSymbol = Theme.symbol("basket.fill", fallback: "cart.fill")

    private struct ChefQuestion: Identifiable {
        let id = UUID()
        let text: String
    }

    // MARK: - Data

    private func status(of item: PantryItem) -> ExpiryStatus {
        item.expiryStatus(soonThresholdDays: soonDays)
    }

    /// Items in the selected location, before search. The strip counts these.
    private var inLocation: [PantryItem] {
        items.filter { filter == nil || $0.location == filter }
    }

    private var filtered: [PantryItem] {
        inLocation.filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }
    }

    private var counts: FreshnessCounts {
        var result = FreshnessCounts()
        for item in inLocation {
            result.add(status(of: item), inFreezer: item.inFreezer)
        }
        return result
    }

    private func isExpiringSoon(_ status: ExpiryStatus) -> Bool {
        if case .expiringSoon = status { return true }
        return false
    }

    private func daysPast(_ status: ExpiryStatus) -> Int? {
        if case .expired(let days) = status { return days }
        return nil
    }

    /// Most urgent first, unknown dates last; ties by name.
    private func byUrgency(_ a: PantryItem, _ b: PantryItem) -> Bool {
        let ua = status(of: a).urgency
        let ub = status(of: b).urgency
        if ua != ub { return ua < ub }
        return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
    }

    /// `.expiringSoon` items, fewest days first.
    private var soonItems: [PantryItem] {
        filtered
            .filter { isExpiringSoon(status(of: $0)) }
            .sorted { byUrgency($0, $1) }
    }

    /// `.expired` items, most recent first.
    private var pastItems: [PantryItem] {
        filtered
            .filter { daysPast(status(of: $0)) != nil }
            .sorted { a, b in
                let da = daysPast(status(of: a)) ?? 0
                let db = daysPast(status(of: b)) ?? 0
                if da != db { return da < db }
                return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
            }
    }

    /// Non-urgent items in one location, sorted by urgency.
    private func stored(in location: StorageLocation) -> [PantryItem] {
        filtered
            .filter { $0.location == location && !status(of: $0).isUrgent }
            .sorted { byUrgency($0, $1) }
    }

    /// Items whose freshness tone matches the strip legend filter.
    private func toneItems(_ tone: FreshTone) -> [PantryItem] {
        filtered
            .filter { status(of: $0).tone(inFreezer: $0.inFreezer) == tone }
            .sorted { byUrgency($0, $1) }
    }

    /// Indexes into `items` that a check-in would ask about.
    private var checkInQueue: [Int] {
        CheckIn.queue(items.map(\.checkInCandidate), soonThresholdDays: soonDays)
    }

    private var checkInDue: Bool {
        CheckIn.isDue(lastCheckInAt: lastCheckInAt == 0 ? nil : Date(timeIntervalSince1970: lastCheckInAt))
    }

    private var barcodeScanningAvailable: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }

    /// "1.5 lbs · Fridge", or just "Fridge" when there's no quantity.
    private func rowDetail(_ item: PantryItem, _ trailing: String) -> String {
        let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
        return [qty, trailing].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                if items.isEmpty {
                    emptyFridge
                } else {
                    inventory(proxy)
                }
            }
            .searchable(text: $search, prompt: "Search items")
            .navigationTitle("Fridge")
            .toolbar { toolbarContent }
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
            .sheet(item: $chefQuestion) { question in
                ChefView(initialPrompt: question.text, showsDone: true)
            }
            .alert("Barcode", isPresented: Binding(get: { lookupMessage != nil }, set: { if !$0 { lookupMessage = nil } })) {
                Button("OK") {}
            } message: {
                Text(lookupMessage ?? "")
            }
            .hapticSuccess(trigger: usedUpCount)
            .onChange(of: counts) { _, newCounts in
                // A legend filter whose bucket just emptied would show an empty list; drop it.
                if let tone = toneFilter, newCounts.count(for: tone) == 0 {
                    toneFilter = nil
                }
            }
        }
    }

    // MARK: - Empty

    private var emptyFridge: some View {
        ScrollView {
            EmptyStateView(
                tiles: [.produce, .dairy, .seafood],
                title: "Your fridge is empty",
                message: "Fill it in one go from your last grocery receipt, or add things as you unpack.",
                actions: [
                    EmptyAction(title: "Scan", step: "Scan your last grocery receipt", action: { showReceiptScan = true }),
                    EmptyAction(title: "Photo", step: "Or snap a photo of your groceries", action: { showPhotoScan = true }),
                    EmptyAction(title: "Add", step: "Or add items one at a time", action: { editorDraft = .init(location: filter ?? .fridge) }),
                ]
            )
        }
        .background(Theme.Colors.canvas)
    }

    // MARK: - Inventory list

    private func inventory(_ proxy: ScrollViewProxy) -> some View {
        let hasMatches = !filtered.isEmpty
        let isSmallPantry = items.count < 5
        return List {
            freshnessRow(proxy)
            if isSmallPantry {
                stockUpSection
            }
            locationChipsRow
            checkInRow

            if let tone = toneFilter {
                toneFilterRows(tone)
            } else if !hasMatches {
                noMatchesRow
            } else {
                useSoonSection
                pastSection
                locationSections
            }

            if !isSmallPantry {
                stockUpSection
            }
        }
        .listStyle(.insetGrouped)
        .listChrome()
        .motionAnimation(Theme.Motion.smooth, value: filter)
        .motionAnimation(Theme.Motion.smooth, value: toneFilter)
    }

    private func freshnessRow(_ proxy: ScrollViewProxy) -> some View {
        let current = counts
        var headlineAction: (() -> Void)? = nil
        if current.past + current.byTomorrow + current.soon > 0 {
            headlineAction = { showUseSoon(proxy) }
        }
        return FreshnessStrip(counts: current, filter: $toneFilter, onHeadlineTap: headlineAction)
            .fridgeClearRow()
    }

    private var locationChipsRow: some View {
        ChipPicker("Location", selection: $filter, options: locationOptions, contentInset: 0)
            .fridgeClearRow()
    }

    private var locationOptions: [ChipOption<StorageLocation?>] {
        var options: [ChipOption<StorageLocation?>] = [
            ChipOption<StorageLocation?>(nil, "All", count: items.count),
        ]
        for location in StorageLocation.allCases {
            let count = items.filter { $0.location == location }.count
            options.append(ChipOption<StorageLocation?>(location, location.title, systemImage: location.glyph, count: count))
        }
        return options
    }

    @ViewBuilder
    private var checkInRow: some View {
        if checkInDue {
            let queue = checkInQueue
            if !queue.isEmpty {
                FridgeCheckInCard(count: queue.count,
                                  categories: queue.prefix(3).map { items[$0].foodCategory }) {
                    AppRouter.shared.checkInRequested = true
                }
                .fridgeClearRow()
            }
        }
    }

    @ViewBuilder
    private var noMatchesRow: some View {
        if !search.isEmpty {
            ContentUnavailableView.search(text: search)
                .fridgeClearRow()
        } else if let filter {
            Label {
                Text("Nothing in the \(filter.title.lowercased()) yet")
            } icon: {
                Image(systemName: filter.glyph)
                    .foregroundStyle(Theme.Colors.text3)
            }
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
            .padding(.vertical, Theme.Space.s)
            .fridgeClearRow()
        }
    }

    // MARK: Tone filter

    @ViewBuilder
    private func toneFilterRows(_ tone: FreshTone) -> some View {
        Chip("Showing: \(tone.legendLabel)", systemImage: "xmark", isSelected: true,
             accessibilityLabel: "Showing \(tone.legendLabel). Clear filter") {
            clearToneFilter()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .fridgeClearRow()

        let matches = toneItems(tone)
        Section {
            if matches.isEmpty {
                Text("Nothing here matches your search.")
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text3)
                    .fridgeClearRow()
            } else {
                ForEach(matches) { item in
                    row(for: item, detail: rowDetail(item, item.location.title))
                }
            }
        } header: {
            SectionHeader(sentenceCase(tone.legendLabel), count: matches.count,
                          systemImage: tone.symbol, symbolColor: toneHeaderColor(tone))
        }
    }

    // MARK: Sections

    @ViewBuilder
    private var useSoonSection: some View {
        let soon = soonItems
        if !soon.isEmpty {
            Section {
                ForEach(soon) { item in
                    row(for: item, detail: rowDetail(item, item.location.title))
                }
            } header: {
                SectionHeader("Use soon", count: soon.count, systemImage: "timer",
                              symbolColor: Theme.Colors.todayText)
            }
            .id(Self.useSoonID)
        }
    }

    @ViewBuilder
    private var pastSection: some View {
        let past = pastItems
        if !past.isEmpty {
            Section {
                ForEach(past) { item in
                    row(for: item, detail: rowDetail(item, item.location.title))
                }
            } header: {
                SectionHeader("Past date", count: past.count, systemImage: "exclamationmark.triangle",
                              symbolColor: Theme.Colors.past, actionTitle: "Check them",
                              action: { AppRouter.shared.checkInRequested = true })
            } footer: {
                Text("Check these before using. The weekly check-in can clear them out.")
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text3)
            }
            .id(soonItems.isEmpty ? Self.useSoonID : "pastDate")
        }
    }

    private var locationSections: some View {
        ForEach(StorageLocation.allCases) { location in
            let group = stored(in: location)
            if !group.isEmpty {
                Section {
                    ForEach(group) { item in
                        row(for: item, detail: rowDetail(item, item.foodCategory.title))
                    }
                } header: {
                    SectionHeader(location.title, count: group.count, systemImage: location.glyph)
                }
            }
        }
    }

    private var stockUpSection: some View {
        Section {
            FridgeStockUpGrid(options: stockUpOptions)
                .fridgeClearRow()
        } header: {
            SectionHeader("Stock up")
        }
    }

    private var stockUpOptions: [FridgeStockUpOption] {
        var options: [FridgeStockUpOption] = [
            FridgeStockUpOption(id: "receipt", title: "Receipt", systemImage: "doc.text.viewfinder",
                                spokenLabel: "Scan a receipt", action: { showReceiptScan = true }),
        ]
        if barcodeScanningAvailable {
            options.append(FridgeStockUpOption(id: "barcode", title: "Barcode", systemImage: "barcode.viewfinder",
                                               spokenLabel: "Scan a barcode", action: { showBarcodeScanner = true }))
        }
        options.append(FridgeStockUpOption(id: "photo", title: "Photo", systemImage: "camera.viewfinder",
                                           spokenLabel: "Photo of groceries", action: { showPhotoScan = true }))
        options.append(FridgeStockUpOption(id: "type", title: "Type it", systemImage: "square.and.pencil",
                                           spokenLabel: "Add by hand",
                                           action: { editorDraft = .init(location: filter ?? .fridge) }))
        return options
    }

    // MARK: Rows

    private func row(for item: PantryItem, detail: String) -> some View {
        Button {
            editingItem = item
        } label: {
            FoodRow(name: item.name, detail: detail, category: item.foodCategory,
                    status: status(of: item), location: item.location)
        }
        .accessibilityHint("Edit")
        .listRowInsets(EdgeInsets(top: 0, leading: Theme.Space.m, bottom: 0, trailing: Theme.Space.m))
        .listRowBackground(Theme.Colors.surface)
        .listRowSeparatorTint(Theme.Colors.separator)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { context.delete(item) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading) {
            Button { useUp(item) } label: {
                Label("Used up", systemImage: Self.basketFillSymbol)
            }
            .tint(Theme.Colors.fresh)
        }
        .contextMenu {
            Button { editingItem = item } label: {
                Label("Edit", systemImage: "pencil")
            }
            Button { useUp(item) } label: {
                Label("Used up", systemImage: Self.basketSymbol)
            }
            Button {
                chefQuestion = ChefQuestion(text: "What can I make with the \(item.name)?")
            } label: {
                Label("Ask the chef about this", systemImage: "sparkles")
            }
            Divider()
            Button(role: .destructive) { context.delete(item) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button { showSettings = true } label: { Image(systemName: "gearshape") }
                .accessibilityLabel("Settings")
        }
        ToolbarItem(placement: .primaryAction) {
            Menu {
                Button { showReceiptScan = true } label: {
                    Label("Scan receipt", systemImage: "doc.text.viewfinder")
                }
                Button { showPhotoScan = true } label: {
                    Label("Photo of groceries", systemImage: "camera.viewfinder")
                }
                if barcodeScanningAvailable {
                    Button { showBarcodeScanner = true } label: {
                        Label("Scan barcode", systemImage: "barcode.viewfinder")
                    }
                }
                Button { editorDraft = .init(location: filter ?? .fridge) } label: {
                    Label("Add by hand", systemImage: "square.and.pencil")
                }
                Divider()
                Button { AppRouter.shared.checkInRequested = true } label: {
                    Label("Check what's still here", systemImage: "checklist")
                }
            } label: {
                addMenuLabel
            }
            .accessibilityLabel("Add")
        }
    }

    /// A beet circle with a white plus, inside a 44pt target.
    private var addMenuLabel: some View {
        Image(systemName: "plus")
            .font(.body.weight(.bold))
            .foregroundStyle(Theme.Colors.onBeet)
            .frame(width: 32, height: 32)
            .background(Theme.Colors.beet, in: Circle())
            .frame(minWidth: Theme.Metrics.minTap, minHeight: Theme.Metrics.minTap)
            .contentShape(Rectangle())
    }

    // MARK: - Actions

    private func useUp(_ item: PantryItem) {
        context.insert(ShoppingItem(name: item.name, quantity: item.quantity, unit: item.unit, reason: "Used up"))
        context.delete(item)
        usedUpCount += 1
    }

    private func clearToneFilter() {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            toneFilter = nil
        }
    }

    /// The strip headline jumps to the food to use first.
    private func showUseSoon(_ proxy: ScrollViewProxy) {
        let hadFilter = toneFilter != nil
        if hadFilter {
            toneFilter = nil
        }
        let animation = Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)
        Task { @MainActor in
            // Let the unfiltered sections render before scrolling to one of them.
            if hadFilter {
                try? await Task.sleep(for: .milliseconds(150))
            }
            withAnimation(animation) {
                proxy.scrollTo(Self.useSoonID, anchor: .top)
            }
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

    // MARK: - Helpers

    /// "past date" → "Past date" (sentence case, not Title Case).
    private func sentenceCase(_ text: String) -> String {
        guard let first = text.first else { return text }
        return first.uppercased() + String(text.dropFirst())
    }

    private func toneHeaderColor(_ tone: FreshTone) -> Color {
        switch tone {
        case .today: return Theme.Colors.todayText
        case .soon: return Theme.Colors.soonText
        case .fresh: return Theme.Colors.fresh
        case .paused: return Theme.Colors.frost
        case .past: return Theme.Colors.past
        case .none: return Theme.Colors.text3
        }
    }
}

// MARK: - Check-in entry

/// "Weekly check-in · 10 items · about 2 minutes" with a fan of the first items' crates.
private struct FridgeCheckInCard: View {
    let count: Int
    let categories: [FoodCategory]
    let action: () -> Void

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(count: Int, categories: [FoodCategory], action: @escaping () -> Void) {
        self.count = count
        self.categories = categories
        self.action = action
    }

    private var itemsText: String {
        count == 1 ? "1 item" : "\(count) items"
    }

    var body: some View {
        let isAX = dynamicTypeSize.isAccessibilitySize
        let layout = isAX
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        Button(action: action) {
            layout {
                TileFan(categories, size: .small)
                    .padding(.vertical, 4)
                    .padding(.leading, 2)
                    .padding(.trailing, 6)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Weekly check-in")
                        .font(Theme.Fonts.tileTitle)
                        .foregroundStyle(Theme.Colors.ink)
                    Text("\(itemsText) · about 2 minutes")
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                }
                .multilineTextAlignment(.leading)
                if !isAX {
                    Spacer(minLength: 8)
                }
                Text("Start")
                    .font(Theme.Fonts.buttonCompact)
                    .foregroundStyle(Theme.Colors.onBeet)
                    .lineLimit(1)
                    .fixedSize()
                    .padding(.horizontal, Theme.Space.m)
                    .padding(.vertical, 9)
                    .background(Theme.Colors.beet, in: Capsule())
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .surfaceCard()
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Weekly check-in, \(itemsText), about 2 minutes")
    }
}

// MARK: - Stock up

private struct FridgeStockUpOption: Identifiable {
    let id: String
    let title: String
    let systemImage: String
    let spokenLabel: String
    let action: () -> Void
}

/// Four action tiles across, or a 2×2 grid when they don't fit.
private struct FridgeStockUpGrid: View {
    let options: [FridgeStockUpOption]

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(options: [FridgeStockUpOption]) {
        self.options = options
    }

    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            twoColumns
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Theme.Space.xs) {
                    ForEach(options) { option in
                        tile(option)
                    }
                }
                twoColumns
            }
        }
    }

    private var twoColumns: some View {
        VStack(spacing: Theme.Space.xs) {
            ForEach(Array(stride(from: 0, to: options.count, by: 2)), id: \.self) { index in
                HStack(spacing: Theme.Space.xs) {
                    tile(options[index])
                    if index + 1 < options.count {
                        tile(options[index + 1])
                    } else {
                        Color.clear
                            .frame(maxWidth: .infinity, maxHeight: 0)
                            .accessibilityHidden(true)
                    }
                }
            }
        }
    }

    private func tile(_ option: FridgeStockUpOption) -> some View {
        ActionTile(option.title, systemImage: option.systemImage, action: option.action)
            .accessibilityLabel(option.spokenLabel)
    }
}

// MARK: - Row chrome

private extension View {
    /// A List row with no chrome: the content sits straight on the canvas.
    func fridgeClearRow() -> some View {
        self.listRowInsets(EdgeInsets(top: Theme.Space.xxs, leading: 0, bottom: Theme.Space.xxs, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}
