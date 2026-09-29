import SwiftUI
import SwiftData
import FridgeCore

/// Add or edit one pantry item: a crate header, amount, where it's stored,
/// its category, and a kitchen-timer view of when it expires (DESIGN.md §8.4).
struct PantryItemEditor: View {
    struct Draft: Identifiable {
        let id = UUID()
        var name = ""
        var quantity = "1"
        var unit = ""
        var location: StorageLocation = .fridge
        var category = ""
        var hasExpiry = false
        var expiresAt = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now
        var barcode: String?
        var notes = ""

        init(location: StorageLocation = .fridge) {
            self.location = location
        }

        init(item: PantryItem) {
            name = item.name
            quantity = item.quantity.editableString
            unit = item.unit
            location = item.location
            category = item.category
            hasExpiry = item.expiresAt != nil
            expiresAt = item.expiresAt ?? expiresAt
            barcode = item.barcode
            notes = item.notes
        }
    }

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @ScaledMetric(relativeTo: .caption) private var categoryColumnWidth: CGFloat = 76
    @State private var unitTaps = 0
    @State private var quickDateTaps = 0
    @State var draft: Draft
    let item: PantryItem?

    /// Same signature callers already use: `PantryItemEditor(draft: .init(item: item), item: item)`.
    init(draft: Draft, item: PantryItem?) {
        self._draft = State(initialValue: draft)
        self.item = item
    }

    private static let unitChoices = ["pcs", "lb", "oz", "cups", "bag", "bunch", "loaf", "bottle"]
    private static let quickDates: [EditorQuickDate] = [
        EditorQuickDate(days: 1, title: "Tomorrow"),
        EditorQuickDate(days: 3, title: "3 days"),
        EditorQuickDate(days: 7, title: "1 week"),
        EditorQuickDate(days: 14, title: "2 weeks"),
        EditorQuickDate(days: 30, title: "1 month"),
    ]

    /// The chosen category or, when none is chosen, a guess from the free text and the name.
    private var displayCategory: FoodCategory {
        FoodCategory.guess(category: draft.category, name: draft.name)
    }

    private var liveStatus: ExpiryStatus {
        ExpiryStatus.of(expiresAt: draft.expiresAt, soonThresholdDays: soonDays)
    }

    var body: some View {
        NavigationStack {
            Form {
                headerSection
                amountSection
                locationSection
                categorySection
                expirySection
                notesSection
                if let item {
                    deleteSection(item)
                }
            }
            .listChrome()
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(item == nil ? "Add item" : "Edit item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(action: save) {
                        Text("Save").bold()
                    }
                    .disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .sheetChrome()
    }

    // MARK: - 1. Header

    private var headerSection: some View {
        Section {
            HStack(spacing: Theme.Space.s) {
                CategoryTile(displayCategory, size: .large, style: .crate)
                    .motionAnimation(Theme.Motion.snappy, value: displayCategory)
                TextField("Name", text: $draft.name)
                    .font(Theme.Fonts.titleHeavy)
                    .foregroundStyle(Theme.Colors.ink)
                    .textInputAutocapitalization(.words)
                    .submitLabel(.done)
            }
            .padding(.vertical, Theme.Space.xxs)
            .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
        }
    }

    // MARK: - 2. Amount

    private var amountSection: some View {
        Section {
            HStack(spacing: Theme.Space.s) {
                TextField("Qty", text: $draft.quantity)
                    .font(Theme.Fonts.number)
                    .foregroundStyle(Theme.Colors.ink)
                    .keyboardType(.decimalPad)
                    .frame(minWidth: 72, maxWidth: 96)
                    .accessibilityLabel("Quantity")
                Divider()
                TextField("Unit", text: $draft.unit)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
            .editorSurfaceRow()

            unitChips
                .listRowInsets(EdgeInsets(top: Theme.Space.xxs, leading: 0, bottom: Theme.Space.xxs, trailing: 0))
                .editorSurfaceRow()
        } header: {
            sectionLabel("Amount")
        }
    }

    private var normalizedUnit: String {
        draft.unit.trimmingCharacters(in: .whitespaces).lowercased()
    }

    private var unitChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Space.xs) {
                ForEach(Self.unitChoices, id: \.self) { unit in
                    Chip(unit, isSelected: normalizedUnit == unit) {
                        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                            draft.unit = unit
                        }
                        unitTaps += 1
                    }
                }
            }
            .padding(.horizontal, Theme.Space.m)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .hapticSelection(trigger: unitTaps)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Units")
    }

    // MARK: - 3. Stored in

    private var locationSection: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: Theme.Space.xs))
            : AnyLayout(HStackLayout(spacing: Theme.Space.xs))
        return Section {
            layout {
                ForEach(StorageLocation.allCases) { location in
                    locationTile(location)
                }
            }
            .hapticSelection(trigger: draft.location)
            .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
        } header: {
            sectionLabel("Stored in")
        }
    }

    private func locationTile(_ location: StorageLocation) -> some View {
        let isSelected = draft.location == location
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous)
        return Button {
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                draft.location = location
            }
        } label: {
            VStack(spacing: 6) {
                Image(systemName: location.glyph)
                    .font(.title3)
                    .accessibilityHidden(true)
                Text(location.title)
                    .font(Theme.Fonts.detailStrong)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(isSelected ? Theme.Colors.onPlum : Theme.Colors.ink)
            .padding(.vertical, 10)
            .padding(.horizontal, 6)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(isSelected ? Theme.Colors.plum : Theme.Colors.fill, in: shape)
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(location.title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - 4. Category

    private var categorySection: some View {
        Section {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: categoryColumnWidth), spacing: 10)], spacing: 10) {
                ForEach(FoodCategory.allCases) { category in
                    categoryOption(category)
                }
            }
            .padding(.vertical, 6)
            .hapticSelection(trigger: draft.category)
            .listRowInsets(EdgeInsets(top: 6, leading: 10, bottom: 6, trailing: 10))
            .editorSurfaceRow()
        } header: {
            sectionLabel("Category")
        }
    }

    private func categoryOption(_ category: FoodCategory) -> some View {
        let isSelected = displayCategory == category
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.tileLarge, style: .continuous)
        return Button {
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                draft.category = category.rawValue
            }
        } label: {
            VStack(spacing: 6) {
                CategoryTile(category, size: .row, style: isSelected ? .crate : .soft)
                Text(category.title)
                    .font(Theme.Fonts.caption)
                    .foregroundStyle(Theme.Colors.ink)
                    .multilineTextAlignment(.center)
                    .lineLimit(2, reservesSpace: true)
            }
            .padding(.vertical, Theme.Space.xs)
            .padding(.horizontal, Theme.Space.xxs)
            .frame(maxWidth: .infinity)
            .overlay {
                if isSelected {
                    shape.strokeBorder(Theme.Colors.plum, lineWidth: 2.5)
                }
            }
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(category.title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - 5. Expires

    private var expirySection: some View {
        Section {
            Toggle("Has an expiration date",
                   isOn: $draft.hasExpiry.animation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)))
                .editorSurfaceRow()
            if draft.hasExpiry {
                expiryLiveRow
                    .editorSurfaceRow()
                quickDateChips
                    .listRowInsets(EdgeInsets(top: Theme.Space.xxs, leading: 0, bottom: Theme.Space.xxs, trailing: 0))
                    .editorSurfaceRow()
                DatePicker("Expires", selection: $draft.expiresAt, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .editorSurfaceRow()
            }
        } header: {
            sectionLabel("Expiration")
        }
    }

    /// The kitchen-timer dial beside the tag and the weekday it lands on.
    private var expiryLiveRow: some View {
        let live = liveStatus
        let dateText = draft.expiresAt.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())
        return HStack(spacing: 14) {
            FreshnessDial(status: live, location: draft.location, size: .small)
            VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                FreshnessTag(status: live, location: draft.location, showsNoDate: true)
                Text(dateText)
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, Theme.Space.xxs)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(live.spokenLabel(inFreezer: draft.location == .freezer) + ", " + dateText)
    }

    private var quickDateChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Space.xs) {
                ForEach(Self.quickDates) { option in
                    Chip(option.title, isSelected: isQuickDate(option.days)) {
                        setExpiry(days: option.days)
                    }
                }
            }
            .padding(.horizontal, Theme.Space.m)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .hapticSelection(trigger: quickDateTaps)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Quick dates")
    }

    private func quickDate(_ days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: .now) ?? .now
    }

    private func isQuickDate(_ days: Int) -> Bool {
        Calendar.current.isDate(draft.expiresAt, inSameDayAs: quickDate(days))
    }

    private func setExpiry(days: Int) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            draft.expiresAt = quickDate(days)
        }
        quickDateTaps += 1
    }

    // MARK: - 6. Notes

    private var notesSection: some View {
        Section {
            TextField("Notes", text: $draft.notes, axis: .vertical)
                .lineLimit(1...6)
                .editorSurfaceRow()
            if let barcode = draft.barcode {
                Label(barcode, systemImage: "barcode")
                    .font(Theme.Fonts.mono)
                    .foregroundStyle(Theme.Colors.text2)
                    .accessibilityLabel("Barcode \(barcode)")
                    .editorSurfaceRow()
            }
        } header: {
            sectionLabel("Notes")
        }
    }

    // MARK: - 7. Delete

    private func deleteSection(_ item: PantryItem) -> some View {
        Section {
            Button(role: .destructive) {
                context.delete(item)
                dismiss()
            } label: {
                Label("Delete item", systemImage: "trash")
                    .foregroundStyle(Theme.Colors.todayText)
            }
            .editorSurfaceRow()
        }
    }

    // MARK: - Helpers

    /// Sentence-case group label, like the web preview's small labels.
    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(Theme.Fonts.detailStrong)
            .foregroundStyle(Theme.Colors.text2)
            .textCase(nil)
            .accessibilityAddTraits(.isHeader)
    }

    private func save() {
        let target = item ?? PantryItem(name: "")
        target.name = draft.name.trimmingCharacters(in: .whitespaces)
        target.quantity = draft.quantity.doubleValue
        target.unit = draft.unit.trimmingCharacters(in: .whitespaces)
        target.location = draft.location
        target.category = draft.category.trimmingCharacters(in: .whitespaces)
        target.expiresAt = draft.hasExpiry ? draft.expiresAt : nil
        target.barcode = draft.barcode
        target.notes = draft.notes
        if item == nil { context.insert(target) }
        dismiss()
    }
}

/// One quick expiry chip: "Tomorrow", "3 days", "1 week"…
private struct EditorQuickDate: Identifiable {
    let days: Int
    let title: String
    var id: Int { days }
}

private extension View {
    /// Form rows sit on `surface` with `separator` hairlines, in both modes.
    func editorSurfaceRow() -> some View {
        self.listRowBackground(Theme.Colors.surface)
            .listRowSeparatorTint(Theme.Colors.separator)
    }
}
