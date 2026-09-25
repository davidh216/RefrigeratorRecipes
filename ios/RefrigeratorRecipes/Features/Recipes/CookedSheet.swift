import SwiftUI
import SwiftData
import FridgeCore

/// After cooking: shows what the recipe used from the fridge and updates it in one tap.
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
            List {
                Section {
                    Stepper("Made \(servings) serving\(servings == 1 ? "" : "s")", value: $servings, in: 1...48)
                } footer: {
                    if servings != recipe.servings {
                        Text("The recipe serves \(recipe.servings); amounts are scaled.")
                    }
                }

                if current.isEmpty {
                    Section {
                        Text("Nothing in your fridge matched this recipe's ingredients, so there's nothing to update.")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Section {
                        ForEach(current, id: \.stockIndex) { row($0) }
                    } header: {
                        Text("From your fridge")
                    } footer: {
                        Text("Staples like salt and oil aren't tracked. Untick anything you didn't use.")
                    }

                    if current.contains(where: willRemove) {
                        Section {
                            Toggle("Add used-up items to shopping list", isOn: $addUsedUpToList)
                        }
                    }
                }
            }
            .navigationTitle("Update your fridge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(current.isEmpty ? "Mark cooked" : "Update") { apply(current) }
                }
            }
        }
    }

    @ViewBuilder
    private func row(_ d: CookDeduction) -> some View {
        let item = pantry[d.stockIndex]
        let included = !skipped.contains(d.stockIndex)
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                Button {
                    if included { skipped.insert(d.stockIndex) } else { skipped.remove(d.stockIndex) }
                } label: {
                    Image(systemName: included ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(included ? Color.accentColor : Color.secondary)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel(included ? "Leave \(item.name) unchanged" : "Update \(item.name)")

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name).foregroundStyle(included ? Color.primary : Color.secondary)
                    Text(summary(d, item: item)).font(.caption).foregroundStyle(.secondary)
                }
            }
            if included, d.change == .unknown {
                Picker("Anything left?", selection: Binding(
                    get: { usedUp.contains(d.stockIndex) },
                    set: { if $0 { usedUp.insert(d.stockIndex) } else { usedUp.remove(d.stockIndex) } }
                )) {
                    Text("Some left").tag(false)
                    Text("Used it all").tag(true)
                }
                .pickerStyle(.segmented)
                .padding(.leading, 36)
            }
        }
        .padding(.vertical, 2)
    }

    private func summary(_ d: CookDeduction, item: PantryItem) -> String {
        let had = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
        switch d.change {
        case .reduce(let left):
            return "\(had.isEmpty ? "?" : had) → \(QuantityFormatter.string(quantity: left, unit: item.unit))"
        case .remove:
            return "Used up" + (had.isEmpty ? "" : " (had \(had))")
        case .unknown:
            let needed = d.neededText.isEmpty ? "some" : d.neededText
            return "Recipe uses \(needed)" + (had.isEmpty ? "" : " · you have \(had)")
        }
    }

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
        dismiss()
    }
}
