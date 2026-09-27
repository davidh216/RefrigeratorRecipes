import SwiftUI
import SwiftData
import FridgeCore

/// After cooking: shows what the recipe used from the fridge and updates it in one tap.
/// Amount changes read as corrections in pen: the old amount struck through, then the new one
/// (DESIGN.md §8.12).
struct CookedSheet: View {
    let recipe: Recipe

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \PantryItem.name) private var pantry: [PantryItem]
    @Query(filter: #Predicate<ShoppingItem> { !$0.isChecked }) private var shopping: [ShoppingItem]

    @State private var servings: Int
    /// Stock indexes the user chose to leave alone.
    @State private var skipped: Set<Int> = []
    /// Stock indexes with `.unknown` change that the user marked as used up.
    @State private var usedUp: Set<Int> = []
    @State private var addUsedUpToList = true
    @State private var appliedCount = 0

    /// Mirrors `CategoryTile`'s scaling, so hairlines start where the row text starts.
    @ScaledMetric(relativeTo: .body) private var tileScale: CGFloat = 1

    private static let leftOptions: [ChipOption<Bool>] = [
        ChipOption(false, "Some left"),
        ChipOption(true, "Used it all"),
    ]

    init(recipe: Recipe, servings: Int? = nil) {
        self.recipe = recipe
        _servings = State(initialValue: servings ?? recipe.servings)
    }

    private var deductions: [CookDeduction] {
        CookPlanner.deductions(
            requirements: recipe.requirements,
            scale: Double(servings) / Double(max(recipe.servings, 1)),
            stock: pantry.map(\.stockItem),
            staples: KitchenPreferences.current.staples
        )
    }

    /// Items that will be gone after applying.
    private func willRemove(_ d: CookDeduction) -> Bool {
        guard !skipped.contains(d.stockIndex) else { return false }
        switch d.change {
        case .remove: return true
        case .unknown: return usedUp.contains(d.stockIndex)
        case .reduce: return false
        }
    }

    var body: some View {
        let current = deductions
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.l) {
                    SheetLede(systemImage: "frying.pan.fill", text: recipe.title)

                    servingsCard

                    if current.isEmpty {
                        nothingMatchedCard
                    } else {
                        fridgeSection(current)

                        if current.contains(where: willRemove) {
                            shoppingToggleCard
                        }
                    }
                }
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.top, Theme.Space.xs)
                .padding(.bottom, Theme.Space.xl)
            }
            .background(Theme.Colors.canvas)
            .navigationTitle("Update your fridge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .actionBar {
                Button {
                    apply(current)
                } label: {
                    Label(current.isEmpty ? "Mark cooked" : "Update fridge",
                          systemImage: current.isEmpty ? "checkmark" : StorageLocation.fridge.glyph)
                }
                .buttonStyle(PrimaryButtonStyle(fullWidth: true))
            }
            .hapticSuccess(trigger: appliedCount)
        }
        .presentationDetents([.medium, .large])
        .sheetChrome()
    }

    // MARK: - Servings

    private var servingsCard: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Theme.Space.s) {
                    madeLabel
                    Spacer(minLength: Theme.Space.xs)
                    servingsStepper
                }
                VStack(alignment: .leading, spacing: Theme.Space.xs) {
                    madeLabel
                    servingsStepper
                }
            }
            if servings != recipe.servings {
                Text("The recipe serves \(recipe.servings); amounts are scaled.")
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .surfaceCard()
    }

    private var madeLabel: some View {
        Text("Made")
            .font(Theme.Fonts.rowTitle)
            .foregroundStyle(Theme.Colors.ink)
    }

    private var servingsStepper: some View {
        ServingsStepper(value: $servings, range: 1...48, unit: servings == 1 ? "serving" : "servings")
    }

    // MARK: - From your fridge

    /// Where a row's text starts: 4 leading + 44 check + 8 + tile + 8.
    private var rowTextInset: CGFloat {
        4 + Theme.Metrics.minTap + Theme.Space.xs + 40 * min(tileScale, 1.5) + Theme.Space.xs
    }

    private func fridgeSection(_ current: [CookDeduction]) -> some View {
        let firstIndex = current.first?.stockIndex
        return VStack(alignment: .leading, spacing: Theme.Space.xs) {
            SectionHeader("From your fridge", count: current.count)

            VStack(spacing: 0) {
                ForEach(current, id: \.stockIndex) { d in
                    if d.stockIndex != firstIndex {
                        CookHairline(leadingInset: rowTextInset)
                    }
                    row(d)
                }
            }
            .surfaceCard(padding: 0)

            Text("Staples like salt and oil aren't tracked. Untick anything you didn't use.")
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text3)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, Theme.Space.xxs)
        }
    }

    @ViewBuilder
    private func row(_ d: CookDeduction) -> some View {
        let item = pantry[d.stockIndex]
        let included = !skipped.contains(d.stockIndex)
        HStack(alignment: .top, spacing: Theme.Space.xs) {
            CheckToggle(isOn: includeBinding(d.stockIndex), accessibilityLabel: "Update \(item.name)")

            CategoryTile(item.foodCategory, size: .row, style: .soft)
                .opacity(included ? 1 : 0.5)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 6) {
                Text(item.name)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(included ? Theme.Colors.ink : Theme.Colors.text2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                changeLine(d, item: item, included: included)
            }
            .padding(.top, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.leading, 4)
        .padding(.trailing, Theme.Space.m)
        .padding(.top, 6)
        .padding(.bottom, Theme.Space.s)
    }

    /// What cooking does to this item.
    @ViewBuilder
    private func changeLine(_ d: CookDeduction, item: PantryItem, included: Bool) -> some View {
        let had = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
        if !included {
            Text("Unchanged")
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
        } else {
            switch d.change {
            case .reduce(let left):
                penCorrection(had: had, left: left, item: item)
            case .remove:
                HStack(spacing: Theme.Space.xs) {
                    Sticker("Used up", systemImage: "checkmark", symbolColor: Theme.Colors.fresh)
                    if !had.isEmpty {
                        Text("had \(had)")
                            .font(Theme.Fonts.detail)
                            .foregroundStyle(Theme.Colors.text2)
                    }
                }
            case .unknown:
                VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                    Text(unknownSummary(d, had: had))
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                    ChipPicker("Anything left?",
                               selection: usedUpBinding(d.stockIndex),
                               options: Self.leftOptions,
                               contentInset: 0)
                }
            }
        }
    }

    /// "4 cups → 2¼ cups", the old amount struck through in pen, with a level bar underneath.
    private func penCorrection(had: String, left: Double, item: PantryItem) -> some View {
        let old = had.isEmpty ? "?" : had
        let formatted = QuantityFormatter.string(quantity: left, unit: item.unit)
        let updated = formatted.isEmpty ? "0" : formatted
        let fraction: Double = item.quantity > 0 ? min(max(left / item.quantity, 0), 1) : 0
        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(old)
                    .strikethrough(true, color: Theme.Colors.beetText)
                    .font(Theme.Fonts.number)
                    .foregroundStyle(Theme.Colors.text2)
                Image(systemName: "arrow.right")
                    .font(Theme.Fonts.footnote.weight(.bold))
                    .foregroundStyle(Theme.Colors.text3)
                Text(updated)
                    .font(Theme.Fonts.number)
                    .foregroundStyle(Theme.Colors.ink)
                    .contentTransition(.numericText())
            }
            .lineLimit(1)
            LevelBar(fraction: fraction)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(old), becomes \(updated)")
    }

    private func unknownSummary(_ d: CookDeduction, had: String) -> String {
        let needed = d.neededText.isEmpty ? "some" : d.neededText
        return "Recipe uses \(needed)" + (had.isEmpty ? "" : " · you have \(had)")
    }

    private func includeBinding(_ index: Int) -> Binding<Bool> {
        Binding(
            get: { !skipped.contains(index) },
            set: { isOn in
                if isOn {
                    _ = skipped.remove(index)
                } else {
                    _ = skipped.insert(index)
                }
            }
        )
    }

    private func usedUpBinding(_ index: Int) -> Binding<Bool> {
        Binding(
            get: { usedUp.contains(index) },
            set: { isUsedUp in
                if isUsedUp {
                    _ = usedUp.insert(index)
                } else {
                    _ = usedUp.remove(index)
                }
            }
        )
    }

    // MARK: - Other cards

    private var nothingMatchedCard: some View {
        Text("Nothing in your fridge matched this recipe's ingredients, so there's nothing to update.")
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .surfaceCard()
    }

    private var shoppingToggleCard: some View {
        Toggle("Add used-up items to shopping list", isOn: $addUsedUpToList)
            .font(Theme.Fonts.body)
            .foregroundStyle(Theme.Colors.ink)
            .tint(Theme.Colors.beetText)
            .frame(minHeight: Theme.Metrics.minTap)
            .padding(.horizontal, Theme.Space.xxs)
            .surfaceCard(padding: Theme.Space.s)
    }

    // MARK: - Apply

    private func apply(_ current: [CookDeduction]) {
        let listed = shopping.map(\.name)
        // Resolve items before changing anything, since deleting updates the query.
        let targets = current.filter { !skipped.contains($0.stockIndex) }.map { ($0, pantry[$0.stockIndex]) }
        for (d, item) in targets {
            switch d.change {
            case .reduce(let left):
                item.quantity = left
            case .remove, .unknown:
                guard willRemove(d) else { continue }
                if addUsedUpToList, !listed.contains(where: { IngredientName.matches($0, item.name) }) {
                    context.insert(ShoppingItem(name: item.name, unit: "", reason: "Used in \(recipe.title)"))
                }
                context.delete(item)
            }
        }
        recipe.cookCount += 1
        recipe.lastCookedAt = .now
        appliedCount += 1
        dismiss()
    }
}

// MARK: - Private helpers

/// 64×6 capsule: how much is left after cooking (new ÷ old). Decorative; the row label says it.
private struct LevelBar: View {
    let fraction: Double

    var body: some View {
        Capsule()
            .fill(Theme.Colors.fillStrong)
            .frame(width: 64, height: 6)
            .overlay(alignment: .leading) {
                Capsule()
                    .fill(Theme.Colors.fresh)
                    .frame(width: 64 * CGFloat(fraction), height: 6)
            }
            .accessibilityHidden(true)
    }
}

/// A 0.5pt separator that starts where the row's text starts.
private struct CookHairline: View {
    let leadingInset: CGFloat

    var body: some View {
        Rectangle()
            .fill(Theme.Colors.separator)
            .frame(height: 0.5)
            .padding(.leading, leadingInset)
            .accessibilityHidden(true)
    }
}
