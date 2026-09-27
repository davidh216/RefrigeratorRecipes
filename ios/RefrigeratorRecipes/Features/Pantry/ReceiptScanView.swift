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
        /// The receipt line(s) as printed, shown in mono under the name. Empty when unknown.
        var rawText: String = ""

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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
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
    /// Review rows fade up into place once this flips on.
    @State private var rowsShown = false
    @State private var successTick = 0
    @State private var failureTick = 0

    @ScaledMetric(relativeTo: .body) private var ledeTileSide: CGFloat = 44

    private var includedCount: Int { items.filter(\.include).count }

    private var coveredShoppingItems: [ShoppingItem] {
        let purchased = items.filter(\.include).map(\.name)
        return ReceiptImport.purchasedShoppingIndexes(purchased: purchased, shoppingList: shopping.map(\.name))
            .map { shopping[$0] }
    }

    var body: some View {
        NavigationStack {
            phaseContent
                .navigationTitle("Scan receipt")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
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
                        if images.isEmpty {
                            errorMessage = "Couldn't open those photos. Try other ones."
                            failureTick += 1
                        } else {
                            await read(images)
                        }
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
                .hapticSuccess(trigger: successTick)
                .sensoryFeedback(.error, trigger: failureTick)
        }
        .sheetChrome()
    }

    @ViewBuilder
    private var phaseContent: some View {
        switch phase {
        case .capture:
            List { captureSection }
                .listChrome()
        case .reading:
            List { readingSection }
                .listChrome()
        case .review:
            reviewList
        }
    }

    // MARK: - Capture

    private var captureSection: some View {
        Section {
            SheetLede(
                systemImage: "doc.text.viewfinder",
                text: "Add a whole shop at once. Expiry dates are estimated from the day you shopped."
            )
            .captureClearRow()

            if let errorMessage {
                ReceiptErrorCard(message: errorMessage)
                    .captureClearRow()
            }

            VStack(spacing: Theme.Space.s) {
                if VNDocumentCameraViewController.isSupported {
                    Button { showDocumentCamera = true } label: {
                        Label("Scan with camera", systemImage: "doc.text.viewfinder")
                    }
                    .buttonStyle(PrimaryButtonStyle(fullWidth: true))

                    photoPicker
                        .buttonStyle(SecondaryButtonStyle(fullWidth: true))
                } else {
                    // Without a document camera, the library is the one way in, so it leads.
                    photoPicker
                        .buttonStyle(PrimaryButtonStyle(fullWidth: true))
                }
            }
            .captureClearRow()

            VStack(alignment: .leading, spacing: Theme.Space.s) {
                ReceiptTip(text: "Lay it flat in good light", systemImage: "sun.max.fill")
                ReceiptTip(text: "Long receipt? Capture it top to bottom in pages", systemImage: "doc.on.doc.fill")
                ReceiptTip(text: "Photos are sent to Claude to read the items", systemImage: "sparkles")
            }
            .padding(.top, Theme.Space.xs)
            .captureClearRow()
        }
    }

    private var photoPicker: some View {
        PhotosPicker(selection: $pickerItems, maxSelectionCount: Self.maxPages, matching: .images) {
            Label("Choose receipt photos", systemImage: "photo.on.rectangle")
        }
    }

    // MARK: - Reading

    private var readingSection: some View {
        Section {
            readingRow
                .captureClearRow()
        }
    }

    private var readingRow: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: Theme.Space.l))
            : AnyLayout(HStackLayout(alignment: .center, spacing: Theme.Space.l))
        return layout {
            ReceiptPageStack(pages: pages, showsBand: !reduceMotion)
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                if reduceMotion {
                    ProgressView()
                        .tint(Theme.Colors.beet)
                } else {
                    Image(systemName: "doc.text.viewfinder")
                        .font(.title)
                        .foregroundStyle(Theme.Colors.beetText)
                        .symbolEffect(.variableColor.iterative, options: .repeating)
                        .accessibilityHidden(true)
                }
                Text(pages.count > 1 ? "Reading \(pages.count) pages…" : "Reading receipt…")
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .combine)
            Spacer(minLength: 0)
        }
        .padding(.vertical, Theme.Space.s)
    }

    // MARK: - Review

    private var reviewList: some View {
        let order = arrivalOrder
        return List {
            Section {
                summaryCard
                    .captureClearRow()
            }

            ForEach(StorageLocation.allCases) { location in
                let group = items.filter { $0.location == location }
                if !group.isEmpty {
                    Section {
                        ForEach(group) { item in
                            reviewRow(item, arrival: order[item.id] ?? 0)
                        }
                    } header: {
                        SectionHeader(location.title, count: group.count, systemImage: location.glyph)
                    }
                    .listRowBackground(Theme.Colors.surface)
                    .listRowSeparatorTint(Theme.Colors.separator)
                }
            }

            let covered = coveredShoppingItems
            if !covered.isEmpty {
                Section {
                    shoppingCard(covered)
                        .captureClearRow()
                }
            }

            if !skippedLines.isEmpty {
                Section {
                    skippedGroup
                }
                .listRowBackground(Theme.Colors.surface)
                .listRowSeparatorTint(Theme.Colors.separator)
            }

            Section {
                Button {
                    items = []
                    rowsShown = false
                    phase = .capture
                } label: {
                    Label("Scan a different receipt", systemImage: "doc.text.viewfinder")
                }
                .buttonStyle(NeutralButtonStyle(fullWidth: true))
                .captureClearRow()
            }
        }
        .listChrome()
        .actionBar {
            Button(action: putAway) {
                Label("Add \(includedCount) to Fridge", systemImage: StorageLocation.fridge.glyph)
                    .contentTransition(.numericText())
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
            .disabled(includedCount == 0)
        }
        .task {
            // Let the first rows lay out hidden, then bring them in.
            try? await Task.sleep(for: .milliseconds(60))
            rowsShown = true
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            Text(store.isEmpty ? "Your receipt" : store)
                .font(Theme.Fonts.section)
                .foregroundStyle(Theme.Colors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            DatePicker("Purchased", selection: $purchasedAt, in: ...Date.now, displayedComponents: .date)
                .foregroundStyle(Theme.Colors.ink)

            ViewThatFits(in: .horizontal) {
                HStack(alignment: .bottom, spacing: Theme.Space.xl) {
                    figures
                }
                VStack(alignment: .leading, spacing: Theme.Space.s) {
                    figures
                }
            }

            FreshnessStrip(counts: estimates, filter: .constant(nil), showsHeadline: false)

            Text("Expiry dates are estimated from the purchase date. Tap an item to change it.")
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .surfaceCard()
    }

    @ViewBuilder
    private var figures: some View {
        figure("\(includedCount)", label: includedCount == 1 ? "item" : "items")
        if let spent = spentTotal {
            figure(spent.formatted(.currency(code: Self.currencyCode)), label: "spent")
        }
    }

    private func figure(_ value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value)
                .font(Theme.Fonts.displayNumber)
                .foregroundStyle(Theme.Colors.ink)
                .contentTransition(.numericText())
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(label)
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text2)
        }
        .accessibilityElement(children: .combine)
    }

    private func reviewRow(_ item: ReviewItem, arrival: Int) -> some View {
        HStack(spacing: Theme.Space.xs) {
            CheckToggle(
                isOn: includeBinding(for: item.id),
                accessibilityLabel: item.include ? "Don't add \(item.name)" : "Add \(item.name)"
            )
            Button { editing = EditTarget(id: item.id) } label: {
                FoodRow(
                    name: item.name,
                    detail: detail(for: item),
                    category: FoodCategory(category: item.category, name: item.name),
                    status: status(for: item),
                    location: item.location,
                    estimated: item.manualExpiry == nil,
                    isDimmed: !item.include,
                    rawText: item.rawText.isEmpty ? nil : item.rawText
                )
            }
            .buttonStyle(.plain)
            .accessibilityHint("Edit")
        }
        .modifier(ReceiptRowArrival(index: arrival, isShown: rowsShown))
        .listRowInsets(EdgeInsets(top: 0, leading: Theme.Space.xs, bottom: 0, trailing: Theme.Space.m))
    }

    private func shoppingCard(_ covered: [ShoppingItem]) -> some View {
        let side = min(ledeTileSide, 64)
        return VStack(alignment: .leading, spacing: Theme.Space.xs) {
            HStack(spacing: Theme.Space.s) {
                Image(systemName: Theme.symbol("basket.fill", fallback: "cart.fill"))
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Theme.Colors.beetText)
                    .frame(width: side, height: side)
                    .background(Theme.Colors.beetSoft, in: RoundedRectangle(cornerRadius: Theme.Radius.tile, style: .continuous))
                    .accessibilityHidden(true)
                Toggle(isOn: $checkOffShopping) {
                    Text("Check off \(covered.count) item\(covered.count == 1 ? "" : "s") on your shopping list")
                        .font(Theme.Fonts.body)
                        .foregroundStyle(Theme.Colors.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .tint(Theme.Colors.beet)
            }
            Text(covered.map(\.name).joined(separator: ", "))
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .surfaceCard()
    }

    private var skippedGroup: some View {
        DisclosureGroup {
            ForEach(skippedLines.indices, id: \.self) { index in
                Text(skippedLines[index])
                    .font(Theme.Fonts.mono)
                    .foregroundStyle(Theme.Colors.text2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        } label: {
            Text("Skipped \(skippedLines.count) non-food line\(skippedLines.count == 1 ? "" : "s")")
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.text2)
        }
    }

    // MARK: - Derived values

    private static var currencyCode: String { Locale.current.currency?.identifier ?? "USD" }

    private var soonDays: Int { KitchenPreferences.current.soonThresholdDays }

    private func status(for item: ReviewItem) -> ExpiryStatus {
        ExpiryStatus.of(expiresAt: item.expiresAt(purchasedAt: purchasedAt), soonThresholdDays: soonDays)
    }

    /// Freshness of what's being put away, for the mini strip on the summary card.
    private var estimates: FreshnessCounts {
        let soon = soonDays
        var counts = FreshnessCounts()
        for item in items where item.include {
            let status = ExpiryStatus.of(expiresAt: item.expiresAt(purchasedAt: purchasedAt), soonThresholdDays: soon)
            counts.add(status, inFreezer: item.location == .freezer)
        }
        return counts
    }

    /// Sum of the known prices of included items; nil when none are known.
    private var spentTotal: Double? {
        let prices = items.filter(\.include).compactMap(\.price)
        guard !prices.isEmpty else { return nil }
        return prices.reduce(0, +)
    }

    /// Display position of each row across the location sections, for the staggered arrival.
    private var arrivalOrder: [UUID: Int] {
        var order: [UUID: Int] = [:]
        var next = 0
        for location in StorageLocation.allCases {
            for item in items where item.location == location {
                order[item.id] = next
                next += 1
            }
        }
        return order
    }

    private func includeBinding(for id: UUID) -> Binding<Bool> {
        Binding(
            get: { items.first(where: { $0.id == id })?.include ?? false },
            set: { newValue in
                if let index = items.firstIndex(where: { $0.id == id }) {
                    items[index].include = newValue
                }
            }
        )
    }

    /// "1 bag · $3.49"
    private func detail(for item: ReviewItem) -> String {
        var parts: [String] = []
        let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
        if !qty.isEmpty { parts.append(qty) }
        if let price = item.price { parts.append(price.formatted(.currency(code: Self.currencyCode))) }
        return parts.joined(separator: " · ")
    }

    /// The printed line(s) behind an item. Repeated scans of one product show once.
    private static func rawText(from lines: [String]) -> String {
        var unique: [String] = []
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty && !unique.contains(trimmed) {
                unique.append(trimmed)
            }
        }
        return unique.joined(separator: " · ")
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
                failureTick += 1
                phase = .capture
                return
            }
            store = scan.store
            purchasedAt = ReceiptImport.purchaseDate(from: scan.purchase_date)
            skippedLines = scan.items.filter { !$0.is_food }.map { $0.raw_text.isEmpty ? $0.name : $0.raw_text }
            items = receiptItems.map {
                ReviewItem(
                    name: $0.name, quantity: $0.quantity, unit: $0.unit, price: $0.price, category: $0.category,
                    location: StorageLocation(rawValue: $0.location) ?? .fridge, shelfLifeDays: $0.shelfLifeDays,
                    rawText: Self.rawText(from: $0.rawLines)
                )
            }
            checkOffShopping = true
            rowsShown = false
            successTick += 1
            phase = .review
        } catch {
            errorMessage = error.localizedDescription
            failureTick += 1
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
        successTick += 1
        dismiss()
    }
}

// MARK: - Receipt item editor

/// Edit one item from the receipt before it goes in the fridge.
private struct ReceiptItemEditor: View {
    @Binding var item: ReceiptScanView.ReviewItem
    let purchasedAt: Date
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var category: FoodCategory { FoodCategory(category: item.category, name: item.name) }
    private var expiresAt: Date? { item.expiresAt(purchasedAt: purchasedAt) }
    private var isEstimated: Bool { item.manualExpiry == nil }

    private var liveStatus: ExpiryStatus {
        ExpiryStatus.of(expiresAt: expiresAt, soonThresholdDays: KitchenPreferences.current.soonThresholdDays)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: Theme.Space.s) {
                        CategoryTile(category, size: .large, style: .crate)
                            .motionAnimation(Theme.Motion.snappy, value: category)
                        TextField("Name", text: $item.name)
                            .font(Theme.Fonts.titleHeavy)
                            .foregroundStyle(Theme.Colors.ink)
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: Theme.Space.xs, leading: 0, bottom: Theme.Space.xs, trailing: 0))
                }

                Section {
                    HStack(spacing: Theme.Space.s) {
                        TextField("Qty", value: $item.quantity, format: .number)
                            .keyboardType(.decimalPad)
                            .font(Theme.Fonts.number)
                            .frame(minWidth: 72, maxWidth: 96)
                        TextField("Unit", text: $item.unit)
                            .textInputAutocapitalization(.never)
                    }
                    TextField("Category", text: $item.category)
                        .textInputAutocapitalization(.never)
                }
                .listRowBackground(Theme.Colors.surface)

                Section("Stored in") {
                    ReceiptLocationTiles(selection: $item.location)
                        .padding(.vertical, Theme.Space.xxs)
                }
                .listRowBackground(Theme.Colors.surface)

                Section("Expiration") {
                    Toggle("Has an expiration date", isOn: hasExpiry.animation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)))
                    if expiresAt != nil {
                        liveRow
                        ChipPicker("Quick dates", selection: quickSelection, options: quickOptions)
                            .listRowInsets(EdgeInsets())
                        DatePicker("Expires", selection: expiry, displayedComponents: .date)
                    }
                }
                .listRowBackground(Theme.Colors.surface)

                Section {
                    Toggle("Add this item", isOn: $item.include)
                }
                .listRowBackground(Theme.Colors.surface)
            }
            .listChrome()
            .navigationTitle(item.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
        .sheetChrome()
    }

    /// Kitchen timer, tape and date, plus how long the receipt estimate says it keeps.
    private var liveRow: some View {
        let status = liveStatus
        return HStack(spacing: Theme.Space.s) {
            FreshnessDial(status: status, location: item.location, size: .small)
            VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                FreshnessTag(status: status, location: item.location, estimated: isEstimated, showsNoDate: true)
                if let date = expiresAt {
                    Text(date, format: .dateTime.weekday(.wide).month().day())
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                }
                if isEstimated, let days = item.shelfLifeDays {
                    Text("Estimated: keeps about \(days) day\(days == 1 ? "" : "s")")
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.text3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, Theme.Space.xxs)
        .accessibilityElement(children: .combine)
    }

    private var quickOptions: [ChipOption<ReceiptQuickExpiry?>] {
        ReceiptQuickExpiry.allCases.map { ChipOption<ReceiptQuickExpiry?>($0, $0.title) }
    }

    /// The quick chip matching the current date, if any; picking one sets the date by hand.
    private var quickSelection: Binding<ReceiptQuickExpiry?> {
        Binding(
            get: {
                guard let current = expiresAt else { return nil }
                let calendar = Calendar.current
                return ReceiptQuickExpiry.allCases.first { option in
                    guard let date = option.date(from: .now) else { return false }
                    return calendar.isDate(date, inSameDayAs: current)
                }
            },
            set: { newValue in
                guard let newValue, let date = newValue.date(from: .now) else { return }
                item.manualExpiry = date
            }
        )
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

/// Quick expiry choices in the receipt item editor, counted from today.
private enum ReceiptQuickExpiry: CaseIterable, Hashable {
    case tomorrow, threeDays, oneWeek, twoWeeks, oneMonth

    var title: String {
        switch self {
        case .tomorrow: return "Tomorrow"
        case .threeDays: return "3 days"
        case .oneWeek: return "1 week"
        case .twoWeeks: return "2 weeks"
        case .oneMonth: return "1 month"
        }
    }

    func date(from start: Date) -> Date? {
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: start)
        switch self {
        case .tomorrow: return calendar.date(byAdding: .day, value: 1, to: day)
        case .threeDays: return calendar.date(byAdding: .day, value: 3, to: day)
        case .oneWeek: return calendar.date(byAdding: .day, value: 7, to: day)
        case .twoWeeks: return calendar.date(byAdding: .day, value: 14, to: day)
        case .oneMonth: return calendar.date(byAdding: .month, value: 1, to: day)
        }
    }
}

/// Three equal location tiles: glyph over title. Selected is beet.
private struct ReceiptLocationTiles: View {
    @Binding var selection: StorageLocation

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: Theme.Space.xs))
            : AnyLayout(HStackLayout(spacing: Theme.Space.xs))
        layout {
            ForEach(StorageLocation.allCases) { location in
                tile(location)
            }
        }
        .hapticSelection(trigger: selection)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Stored in")
    }

    private func tile(_ location: StorageLocation) -> some View {
        let isSelected = selection == location
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous)
        return Button {
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                selection = location
            }
        } label: {
            VStack(spacing: Theme.Space.xxs) {
                Image(systemName: location.glyph)
                    .font(.title3)
                    .accessibilityHidden(true)
                Text(location.title)
                    .font(Theme.Fonts.detailStrong)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(isSelected ? Theme.Colors.onBeet : Theme.Colors.ink)
            .padding(.vertical, Theme.Space.xs)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(isSelected ? Theme.Colors.beet : Theme.Colors.fill, in: shape)
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Pieces

private extension View {
    /// A List row with no card behind it: the content sits on the canvas, as wide as the sections.
    func captureClearRow() -> some View {
        self
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Theme.Space.xs, leading: 0, bottom: Theme.Space.xs, trailing: 0))
    }
}

/// One capture tip: a small fill tile with a glyph, then the words.
private struct ReceiptTip: View {
    let text: String
    let systemImage: String

    @ScaledMetric(relativeTo: .body) private var tileSide: CGFloat = 28

    var body: some View {
        let side = min(tileSide, 42)
        HStack(spacing: Theme.Space.s) {
            Image(systemName: systemImage)
                .font(Theme.Fonts.footnote.weight(.semibold))
                .foregroundStyle(Theme.Colors.text2)
                .frame(width: side, height: side)
                .background(Theme.Colors.fill, in: RoundedRectangle(cornerRadius: Theme.Radius.tileSmall, style: .continuous))
                .accessibilityHidden(true)
            Text(text)
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
    }
}

/// Says what went wrong and what to do, in tomato on a soft card.
private struct ReceiptErrorCard: View {
    let message: String

    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
                .accessibilityHidden(true)
            Text(message)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .font(Theme.Fonts.detail)
        .foregroundStyle(Theme.Colors.todayText)
        .padding(Theme.Space.cardPadding)
        .background(Theme.Colors.todaySoft, in: shape)
        .overlay {
            if colorSchemeContrast == .increased {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .accessibilityElement(children: .combine)
        .onAppear {
            UIAccessibility.post(notification: .announcement, argument: message)
        }
    }
}

/// The receipt pages, stacked like paper slips; the scan band sweeps the top one. Decorative.
private struct ReceiptPageStack: View {
    let pages: [UIImage]
    let showsBand: Bool

    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1

    /// Top page first, then the ones underneath.
    private static let rotations: [Double] = [-1, 2, -3]
    /// The white paper border around each page.
    private static let paperBorder: CGFloat = 6

    var body: some View {
        let factor = min(scale, 1.3)
        let size = CGSize(width: 132 * factor, height: 172 * factor)
        let shown = Array(pages.prefix(Self.rotations.count))
        ZStack {
            ForEach(Array(shown.indices.reversed()), id: \.self) { index in
                page(shown[index], size: size, isTop: index == 0)
                    .rotationEffect(.degrees(Self.rotations[index]))
            }
        }
        .frame(width: size.width + Theme.Space.m, height: size.height + Theme.Space.m)
        .accessibilityHidden(true)
    }

    private func page(_ image: UIImage, size: CGSize, isTop: Bool) -> some View {
        let outer = RoundedRectangle(cornerRadius: Theme.Radius.tile, style: .continuous)
        let inner = RoundedRectangle(cornerRadius: Theme.Radius.tile - Self.paperBorder, style: .continuous)
        return Color.clear
            .frame(width: size.width - 2 * Self.paperBorder, height: size.height - 2 * Self.paperBorder)
            .overlay {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            }
            .overlay {
                if isTop && showsBand {
                    ReceiptScanBand()
                }
            }
            .clipShape(inner)
            .padding(Self.paperBorder)
            .background(Color.white, in: outer)
            .overlay {
                outer.strokeBorder(Theme.Colors.separator, lineWidth: 0.5)
            }
            .accessibilityIgnoresInvertColors()
    }
}

/// A thin beet line that sweeps top to bottom and back while Claude reads. Decorative.
private struct ReceiptScanBand: View {
    @State private var sweeping = false

    var body: some View {
        GeometryReader { geo in
            LinearGradient(
                colors: [Theme.Colors.beet.opacity(0), Theme.Colors.beet, Theme.Colors.beet.opacity(0)],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(width: geo.size.width, height: 3)
            .offset(y: sweeping ? max(geo.size.height - 3, 0) : 0)
            .animation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true), value: sweeping)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear { sweeping = true }
        .onDisappear { sweeping = false }
    }
}

/// Review rows fade and rise 8pt into place, staggered by 0.03 s × min(index, 12).
/// Under Reduce Motion they only fade, all together.
private struct ReceiptRowArrival: ViewModifier {
    let index: Int
    let isShown: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .opacity(isShown ? 1 : 0)
            .offset(y: isShown || reduceMotion ? 0 : 8)
            .animation(arrival, value: isShown)
    }

    private var arrival: Animation {
        if reduceMotion {
            return Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: true)
        }
        return Theme.Motion.smooth.delay(0.03 * Double(min(index, 12)))
    }
}

// MARK: - Document camera

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
