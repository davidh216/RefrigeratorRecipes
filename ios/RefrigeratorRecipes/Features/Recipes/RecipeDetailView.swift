import SwiftUI
import SwiftData
import FridgeCore

struct RecipeDetailView: View {
    @Bindable var recipe: Recipe

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var showEditor = false
    @State private var showPlanner = false
    @State private var showCooked = false
    @State private var confirmDelete = false
    @State private var toast: String?

    private var staples: [String] { Staples.parse(staplesRaw) }

    private var match: RecipeMatch {
        recipe.match(stock: pantry.map(\.stockItem), staples: staples, soonThresholdDays: soonDays)
    }

    private func isAvailable(_ ingredient: RecipeIngredient) -> Bool {
        staples.contains { IngredientName.normalize($0) == IngredientName.normalize(ingredient.name) }
            || pantry.contains { IngredientName.matches($0.name, ingredient.name) }
    }

    var body: some View {
        List {
            Section {
                if !recipe.summary.isEmpty {
                    Text(recipe.summary)
                }
                HStack(spacing: 16) {
                    if recipe.totalMinutes > 0 {
                        Label("\(recipe.totalMinutes) min", systemImage: "clock")
                    }
                    Label("Serves \(recipe.servings)", systemImage: "person.2")
                    if !recipe.cuisine.isEmpty {
                        Label(recipe.cuisine.capitalized, systemImage: "globe")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                if !recipe.tags.isEmpty {
                    Text(recipe.tags.map { "#\($0)" }.joined(separator: " "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                ForEach(recipe.sortedIngredients) { ingredient in
                    HStack(alignment: .firstTextBaseline) {
                        Image(systemName: isAvailable(ingredient) ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(isAvailable(ingredient) ? Color.green : Color.secondary)
                        VStack(alignment: .leading) {
                            Text(ingredient.name + (ingredient.isOptional ? " (optional)" : ""))
                            if !ingredient.note.isEmpty {
                                Text(ingredient.note).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Text(ingredient.displayQuantity).foregroundStyle(.secondary)
                    }
                }
                if !match.missing.isEmpty {
                    Button {
                        let added = ShoppingAdder.addMissing(
                            for: [PlannedRecipe(title: recipe.title, requirements: recipe.requirements)],
                            pantry: pantry,
                            existing: shopping,
                            preferences: KitchenPreferences(staples: staples, soonThresholdDays: soonDays),
                            context: context
                        )
                        toast = added == 0 ? "Everything is already on your list." : "Added \(added) item\(added == 1 ? "" : "s") to Shopping."
                    } label: {
                        Label("Add \(match.missing.count) missing to shopping list", systemImage: "cart.badge.plus")
                    }
                }
            } header: {
                HStack {
                    Text("Ingredients")
                    Spacer()
                    CoverageBadge(match: match)
                }
            }

            if !recipe.instructions.isEmpty {
                Section("Steps") {
                    ForEach(Array(recipe.instructions.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Text("\(index + 1)")
                                .font(.headline)
                                .foregroundStyle(Color.accentColor)
                            Text(step)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            Section {
                Button { showCooked = true } label: {
                    Label("I cooked this", systemImage: "frying.pan")
                }
                Button { showPlanner = true } label: {
                    Label("Add to meal plan", systemImage: "calendar.badge.plus")
                }
                if recipe.cookCount > 0 {
                    LabeledContent("Cooked", value: "\(recipe.cookCount)×")
                }
                Button("Delete recipe", role: .destructive) { confirmDelete = true }
            }
        }
        .navigationTitle(recipe.title)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button { recipe.isFavorite.toggle() } label: {
                    Image(systemName: recipe.isFavorite ? "heart.fill" : "heart")
                }
                .accessibilityLabel(recipe.isFavorite ? "Unfavorite" : "Favorite")
                Button("Edit") { showEditor = true }
            }
        }
        .sheet(isPresented: $showEditor) { RecipeEditor(recipe: recipe) }
        .sheet(isPresented: $showPlanner) { AddToPlanSheet(recipe: recipe) }
        .sheet(isPresented: $showCooked) { CookedSheet(recipe: recipe) }
        .confirmationDialog("Delete \(recipe.title)?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                context.delete(recipe)
                dismiss()
            }
        }
        .alert(toast ?? "", isPresented: Binding(get: { toast != nil }, set: { if !$0 { toast = nil } })) {
            Button("OK") {}
        }
    }
}

struct AddToPlanSheet: View {
    let recipe: Recipe
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var day = Date.now
    @State private var slot: MealSlot = .dinner
    @State private var servings: Int

    init(recipe: Recipe, day: Date = .now, slot: MealSlot = .dinner) {
        self.recipe = recipe
        _day = State(initialValue: day)
        _slot = State(initialValue: slot)
        _servings = State(initialValue: recipe.servings)
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Day", selection: $day, displayedComponents: .date)
                Picker("Meal", selection: $slot) {
                    ForEach(MealSlot.allCases) { Text($0.title).tag($0) }
                }
                Stepper("Servings: \(servings)", value: $servings, in: 1...24)
            }
            .navigationTitle(recipe.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        context.insert(MealPlanEntry(day: day, slot: slot, recipe: recipe, servings: servings))
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
