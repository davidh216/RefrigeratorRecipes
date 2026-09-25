import SwiftUI
import SwiftData

struct RecipeEditor: View {
    struct IngredientDraft: Identifiable {
        let id = UUID()
        var name = ""
        var quantity = ""
        var unit = ""
        var note = ""
        var isOptional = false
    }

    struct StepDraft: Identifiable {
        let id = UUID()
        var text = ""
    }

    let recipe: Recipe?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var summary = ""
    @State private var cuisine = ""
    @State private var servings = 2
    @State private var prepMinutes = 0
    @State private var cookMinutes = 0
    @State private var tags = ""
    @State private var ingredients: [IngredientDraft] = [IngredientDraft()]
    @State private var steps: [StepDraft] = [StepDraft()]

    init(recipe: Recipe?) {
        self.recipe = recipe
        guard let recipe else { return }
        _title = State(initialValue: recipe.title)
        _summary = State(initialValue: recipe.summary)
        _cuisine = State(initialValue: recipe.cuisine)
        _servings = State(initialValue: recipe.servings)
        _prepMinutes = State(initialValue: recipe.prepMinutes)
        _cookMinutes = State(initialValue: recipe.cookMinutes)
        _tags = State(initialValue: recipe.tags.joined(separator: ", "))
        _ingredients = State(initialValue: recipe.sortedIngredients.map {
            IngredientDraft(name: $0.name, quantity: $0.quantity.editableString, unit: $0.unit, note: $0.note, isOptional: $0.isOptional)
        })
        _steps = State(initialValue: recipe.instructions.map { StepDraft(text: $0) })
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $title)
                    TextField("Short description", text: $summary, axis: .vertical)
                    TextField("Cuisine", text: $cuisine)
                    Stepper("Serves \(servings)", value: $servings, in: 1...24)
                    Stepper("Prep: \(prepMinutes) min", value: $prepMinutes, in: 0...600, step: 5)
                    Stepper("Cook: \(cookMinutes) min", value: $cookMinutes, in: 0...1440, step: 5)
                    TextField("Tags (comma separated)", text: $tags)
                        .textInputAutocapitalization(.never)
                }

                Section("Ingredients") {
                    ForEach($ingredients) { $ingredient in
                        VStack(alignment: .leading, spacing: 6) {
                            TextField("Ingredient", text: $ingredient.name)
                            HStack {
                                TextField("Qty", text: $ingredient.quantity)
                                    .keyboardType(.decimalPad)
                                    .frame(maxWidth: 60)
                                TextField("Unit", text: $ingredient.unit)
                                    .textInputAutocapitalization(.never)
                                    .frame(maxWidth: 80)
                                TextField("Note", text: $ingredient.note)
                            }
                            .font(.subheadline)
                            Toggle("Optional", isOn: $ingredient.isOptional)
                                .font(.subheadline)
                        }
                    }
                    .onDelete { ingredients.remove(atOffsets: $0) }
                    .onMove { ingredients.move(fromOffsets: $0, toOffset: $1) }
                    Button { ingredients.append(IngredientDraft()) } label: {
                        Label("Add ingredient", systemImage: "plus")
                    }
                }

                Section("Steps") {
                    ForEach($steps) { $step in
                        HStack(alignment: .firstTextBaseline) {
                            Text("\((steps.firstIndex { $0.id == step.id } ?? 0) + 1).").foregroundStyle(.secondary)
                            TextField("Step", text: $step.text, axis: .vertical)
                        }
                    }
                    .onDelete { steps.remove(atOffsets: $0) }
                    .onMove { steps.move(fromOffsets: $0, toOffset: $1) }
                    Button { steps.append(StepDraft()) } label: {
                        Label("Add step", systemImage: "plus")
                    }
                }
            }
            .navigationTitle(recipe == nil ? "New recipe" : "Edit recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        let target = recipe ?? Recipe(title: "")
        if recipe == nil { context.insert(target) }
        target.title = title.trimmingCharacters(in: .whitespaces)
        target.summary = summary
        target.cuisine = cuisine
        target.servings = servings
        target.prepMinutes = prepMinutes
        target.cookMinutes = cookMinutes
        target.tags = Staples.parse(tags)
        target.instructions = steps.map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }

        for old in target.ingredients ?? [] { context.delete(old) }
        target.setIngredients(ingredients
            .filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
            .map {
                RecipeIngredient(
                    name: $0.name.trimmingCharacters(in: .whitespaces),
                    quantity: $0.quantity.doubleValue,
                    unit: $0.unit.trimmingCharacters(in: .whitespaces),
                    note: $0.note,
                    isOptional: $0.isOptional
                )
            })
        dismiss()
    }
}
