import SwiftUI
import SwiftData
import FridgeCore

/// Create or edit a recipe: the name and headnote, servings and time,
/// ingredients with their category tiles, and numbered steps (DESIGN.md §8.13).
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
    @ScaledMetric(relativeTo: .body) private var minutesFieldWidth: CGFloat = 56
    @ScaledMetric(relativeTo: .title2) private var stepNumberWidth: CGFloat = 28

    @State private var title = ""
    @State private var summary = ""
    @State private var cuisine = ""
    @State private var servings = 2
    /// Minute fields are typed, so they are kept as digits and read as numbers on save.
    @State private var prepText = ""
    @State private var cookText = ""
    @State private var tags = ""
    @State private var ingredients: [IngredientDraft] = [IngredientDraft()]
    @State private var steps: [StepDraft] = [StepDraft()]

    init(recipe: Recipe?) {
        self.recipe = recipe
        guard let recipe else { return }
        _title = State(initialValue: recipe.title)
        _summary = State(initialValue: recipe.summary)
        _cuisine = State(initialValue: recipe.cuisine.isEmpty ? "" : Cuisine.displayName(for: recipe.cuisine))
        _servings = State(initialValue: recipe.servings)
        _prepText = State(initialValue: recipe.prepMinutes > 0 ? String(min(recipe.prepMinutes, 9999)) : "")
        _cookText = State(initialValue: recipe.cookMinutes > 0 ? String(min(recipe.cookMinutes, 9999)) : "")
        _tags = State(initialValue: recipe.tags.joined(separator: ", "))
        _ingredients = State(initialValue: recipe.sortedIngredients.map {
            IngredientDraft(name: $0.name, quantity: $0.quantity.editableString, unit: $0.unit, note: $0.note, isOptional: $0.isOptional)
        })
        _steps = State(initialValue: recipe.instructions.map { StepDraft(text: $0) })
    }

    // The fields hold at most 4 digits; long existing times (overnight marinades, imports) are kept, not clamped to the old stepper ranges.
    private var prepMinutes: Int { Self.minutes(from: prepText, upTo: 9999) }
    private var cookMinutes: Int { Self.minutes(from: cookText, upTo: 9999) }
    private var totalMinutes: Int { prepMinutes + cookMinutes }
    private var parsedTags: [String] { Staples.parse(tags) }

    var body: some View {
        NavigationStack {
            Form {
                headerSection
                timeSection
                detailsSection
                ingredientsSection
                stepsSection
            }
            .listChrome()
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(recipe == nil ? "New recipe" : "Edit recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(action: save) {
                        Text("Save").bold()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onChange(of: prepText) { _, newValue in
                let cleaned = Self.digitsOnly(newValue)
                if cleaned != newValue { prepText = cleaned }
            }
            .onChange(of: cookText) { _, newValue in
                let cleaned = Self.digitsOnly(newValue)
                if cleaned != newValue { cookText = cleaned }
            }
        }
        .sheetChrome()
    }

    // MARK: - 1. Name and headnote

    private var headerSection: some View {
        Section {
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                TextField("Recipe name", text: $title)
                    .font(Theme.Fonts.titleHeavy)
                    .foregroundStyle(Theme.Colors.ink)
                    .textInputAutocapitalization(.words)
                TextField("A line about it", text: $summary, axis: .vertical)
                    .font(Theme.Fonts.headnote)
                    .foregroundStyle(Theme.Colors.ink)
                    .lineLimit(1...5)
                    .accessibilityLabel("Description")
            }
            .padding(.vertical, Theme.Space.xxs)
            .recipeFormRow()
        }
    }

    // MARK: - 2. Servings and time

    private var timeSection: some View {
        Section {
            ServingsStepper(value: $servings, range: 1...48)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, Theme.Space.xxs)
                .recipeFormRow()
            minutesRow("Prep", text: $prepText, spokenLabel: "Prep time in minutes")
                .recipeFormRow()
            minutesRow("Cook", text: $cookText, spokenLabel: "Cook time in minutes")
                .recipeFormRow()
            Text("Total \(totalMinutes) min")
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .contentTransition(.numericText(value: Double(totalMinutes)))
                .motionAnimation(Theme.Motion.snappy, value: totalMinutes)
                .recipeFormRow()
        } header: {
            sectionLabel("Servings and time")
        }
    }

    private func minutesRow(_ label: String, text: Binding<String>, spokenLabel: String) -> some View {
        HStack(spacing: Theme.Space.xs) {
            Text(label)
                .font(Theme.Fonts.rowTitle)
                .foregroundStyle(Theme.Colors.ink)
                .accessibilityHidden(true)
            Spacer(minLength: Theme.Space.s)
            TextField("0", text: text)
                .font(Theme.Fonts.number)
                .foregroundStyle(Theme.Colors.ink)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(width: min(minutesFieldWidth, 120))
                .accessibilityLabel(spokenLabel)
            Text("min")
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .accessibilityHidden(true)
        }
        .frame(minHeight: Theme.Metrics.minTap)
    }

    // MARK: - 3. Cuisine and tags

    private var detailsSection: some View {
        Section {
            TextField("Cuisine", text: $cuisine)
                .recipeFormRow()
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                TextField("Tags (comma separated)", text: $tags)
                    .textInputAutocapitalization(.never)
                if !parsedTags.isEmpty {
                    tagPreview
                }
            }
            .recipeFormRow()
        } header: {
            sectionLabel("Details")
        }
    }

    /// The tags as they will appear on the recipe: `fill` capsules, no "#".
    private var tagPreview: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Array(parsedTags.enumerated()), id: \.offset) { pair in
                    RecipeTagChip(raw: pair.element)
                }
            }
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .accessibilityHidden(true)
    }

    // MARK: - 4. Ingredients

    private var ingredientsSection: some View {
        Section {
            ForEach($ingredients) { $ingredient in
                RecipeIngredientEditorRow(ingredient: $ingredient)
                    .recipeFormRow()
            }
            .onDelete { ingredients.remove(atOffsets: $0) }
            .onMove { ingredients.move(fromOffsets: $0, toOffset: $1) }
            Button { ingredients.append(IngredientDraft()) } label: {
                addLabel("Add ingredient")
            }
            .recipeFormRow()
        } header: {
            sectionLabel("Ingredients")
        }
    }

    // MARK: - 5. Steps

    private var stepsSection: some View {
        Section {
            ForEach($steps) { $step in
                let number = (steps.firstIndex { $0.id == step.id } ?? 0) + 1
                HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
                    Text("\(number)")
                        .font(Theme.Fonts.numberLarge)
                        .foregroundStyle(Theme.Colors.plumText)
                        .frame(minWidth: min(stepNumberWidth, 56), alignment: .leading)
                        .accessibilityLabel("Step \(number)")
                    TextField("Step", text: $step.text, axis: .vertical)
                        .font(Theme.Fonts.body)
                        .foregroundStyle(Theme.Colors.ink)
                        .lineSpacing(3)
                }
                .padding(.vertical, Theme.Space.xxs)
                .recipeFormRow()
            }
            .onDelete { steps.remove(atOffsets: $0) }
            .onMove { steps.move(fromOffsets: $0, toOffset: $1) }
            Button { steps.append(StepDraft()) } label: {
                addLabel("Add step")
            }
            .recipeFormRow()
        } header: {
            sectionLabel("Steps")
        }
    }

    // MARK: - Pieces

    private func addLabel(_ title: String) -> some View {
        Label {
            Text(title)
                .font(Theme.Fonts.rowTitle)
        } icon: {
            Image(systemName: "plus.circle.fill")
                .font(.title3)
        }
        .foregroundStyle(Theme.Colors.plumText)
        .frame(minHeight: Theme.Metrics.minTap)
    }

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(Theme.Fonts.detailStrong)
            .foregroundStyle(Theme.Colors.text2)
            .textCase(nil)
            .accessibilityAddTraits(.isHeader)
    }

    /// Keeps at most 4 ASCII digits.
    private static func digitsOnly(_ text: String) -> String {
        String(text.filter { $0.isASCII && $0.isNumber }.prefix(4))
    }

    private static func minutes(from text: String, upTo limit: Int) -> Int {
        guard let value = Int(digitsOnly(text)) else { return 0 }
        return min(max(value, 0), limit)
    }

    private func save() {
        let target = recipe ?? Recipe(title: "")
        if recipe == nil { context.insert(target) }
        target.title = title.trimmingCharacters(in: .whitespaces)
        target.summary = summary
        // Known cuisines and tags are stored as their ids ("Sichuan" → "chinese", "spicy" → "feeling-spicy");
        // anything else stays as typed, since it's the user's own recipe.
        let typedCuisine = cuisine.trimmingCharacters(in: .whitespaces)
        target.cuisine = typedCuisine.isEmpty ? "" : (Cuisine.id(for: typedCuisine) ?? typedCuisine)
        target.servings = servings
        target.prepMinutes = prepMinutes
        target.cookMinutes = cookMinutes
        var seenTags: Set<String> = []
        target.tags = Staples.parse(tags)
            .map { RecipeTag.id(for: $0) ?? RecipeTagChip.clean($0) }
            .filter { !$0.isEmpty && seenTags.insert($0).inserted }
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

// MARK: - Ingredient row

/// "[tile] [2] [cups] milk" on the first line, the note and an "Optional" chip underneath.
/// The soft tile follows the name as you type.
private struct RecipeIngredientEditorRow: View {
    @Binding var ingredient: RecipeEditor.IngredientDraft

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ScaledMetric(relativeTo: .body) private var tileScale: CGFloat = 1
    @ScaledMetric(relativeTo: .body) private var quantityWidth: CGFloat = 56
    @ScaledMetric(relativeTo: .body) private var unitWidth: CGFloat = 64

    init(ingredient: Binding<RecipeEditor.IngredientDraft>) {
        self._ingredient = ingredient
    }

    private var category: FoodCategory {
        FoodCategory.guess(category: "", name: ingredient.name)
    }

    /// Matches `CategoryTile`'s own scaling of the 28pt small tile.
    private var tileSide: CGFloat {
        28 * min(tileScale, 1.5)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            if dynamicTypeSize.isAccessibilitySize {
                HStack(spacing: Theme.Space.xs) {
                    tile
                    nameField
                }
                HStack(spacing: Theme.Space.xs) {
                    quantityField
                        .frame(maxWidth: .infinity)
                    unitField
                        .frame(maxWidth: .infinity)
                }
                noteField
                optionalChip
            } else {
                HStack(spacing: Theme.Space.xs) {
                    tile
                    quantityField
                        .frame(width: min(quantityWidth, 96))
                    unitField
                        .frame(width: min(unitWidth, 112))
                    nameField
                }
                HStack(spacing: Theme.Space.xs) {
                    noteField
                    optionalChip
                }
                .padding(.leading, tileSide + Theme.Space.xs)
            }
        }
        .padding(.vertical, Theme.Space.xxs)
        .sensoryFeedback(.selection, trigger: ingredient.isOptional)
    }

    private var tile: some View {
        CategoryTile(category, size: .small, style: .soft)
            .motionAnimation(Theme.Motion.snappy, value: category)
    }

    private var quantityField: some View {
        TextField("Qty", text: $ingredient.quantity)
            .font(Theme.Fonts.number)
            .foregroundStyle(Theme.Colors.ink)
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.center)
            .padding(.horizontal, Theme.Space.xs)
            .padding(.vertical, 6)
            .background(Theme.Colors.fill, in: RoundedRectangle(cornerRadius: Theme.Radius.tileSmall, style: .continuous))
            .accessibilityLabel("Quantity")
    }

    private var unitField: some View {
        TextField("Unit", text: $ingredient.unit)
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.ink)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .padding(.horizontal, Theme.Space.xs)
            .padding(.vertical, 6)
            .background(Theme.Colors.fill, in: RoundedRectangle(cornerRadius: Theme.Radius.tileSmall, style: .continuous))
            .accessibilityLabel("Unit")
    }

    private var nameField: some View {
        TextField("Ingredient", text: $ingredient.name)
            .font(Theme.Fonts.rowTitle)
            .foregroundStyle(Theme.Colors.ink)
    }

    private var noteField: some View {
        TextField("Note", text: $ingredient.note)
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
    }

    private var optionalChip: some View {
        Chip("Optional", systemImage: ingredient.isOptional ? "checkmark" : nil, isSelected: ingredient.isOptional) {
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                ingredient.isOptional.toggle()
            }
        }
        .fixedSize()
    }
}

private extension View {
    /// Surface row with separator hairlines, on the canvas Form.
    func recipeFormRow() -> some View {
        self.listRowBackground(Theme.Colors.surface)
            .listRowSeparatorTint(Theme.Colors.separator)
    }
}
