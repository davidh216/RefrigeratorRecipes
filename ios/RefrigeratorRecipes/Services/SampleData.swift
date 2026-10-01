import Foundation
import SwiftData

/// Imports the bundled starter library: about 180 original recipes, checked with ios/tools/recipe_lint.py.
enum SampleData {
    private struct SampleRecipe: Decodable {
        struct Ingredient: Decodable {
            let name: String
            let quantity: Double
            let unit: String
            let isOptional: Bool
            let note: String
        }
        let title: String
        let summary: String
        let cuisine: String
        let prepMinutes: Int
        let cookMinutes: Int
        let servings: Int
        let tags: [String]
        let ingredients: [Ingredient]
        let instructions: [String]
    }

    /// Adds sample recipes whose titles aren't already present. Returns how many were added.
    /// `only` limits it to those titles (lowercased).
    @MainActor
    @discardableResult
    static func importRecipes(into context: ModelContext, only: Set<String>? = nil) throws -> Int {
        guard let url = Bundle.main.url(forResource: "SampleRecipes", withExtension: "json") else { return 0 }
        let samples = try JSONDecoder().decode([SampleRecipe].self, from: Data(contentsOf: url))
        let existing = Set(try context.fetch(FetchDescriptor<Recipe>()).map { $0.title.lowercased() })

        var added = 0
        for sample in samples where !existing.contains(sample.title.lowercased()) {
            if let only, !only.contains(sample.title.lowercased()) { continue }
            let recipe = Recipe(title: sample.title, summary: sample.summary, servings: sample.servings)
            recipe.cuisine = sample.cuisine
            recipe.prepMinutes = sample.prepMinutes
            recipe.cookMinutes = sample.cookMinutes
            recipe.tags = sample.tags
            recipe.instructions = sample.instructions
            context.insert(recipe)
            recipe.setIngredients(sample.ingredients.map {
                RecipeIngredient(name: $0.name, quantity: $0.quantity, unit: $0.unit, note: $0.note, isOptional: $0.isOptional)
            })
            added += 1
        }
        try context.save()
        return added
    }
}

extension SampleData {
    /// What a list row needs to show a library recipe that may not be saved yet.
    struct Preview: Equatable {
        var title: String
        var summary: String
        var totalMinutes: Int
        var ingredientNames: [String]
    }

    /// Library recipes by lowercased title, read once.
    private static let library: [String: Preview] = {
        guard let url = Bundle.main.url(forResource: "SampleRecipes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let samples = try? JSONDecoder().decode([SampleRecipe].self, from: data) else { return [:] }
        var byTitle: [String: Preview] = [:]
        for sample in samples {
            byTitle[sample.title.lowercased()] = Preview(
                title: sample.title, summary: sample.summary,
                totalMinutes: sample.prepMinutes + sample.cookMinutes,
                ingredientNames: sample.ingredients.map(\.name))
        }
        return byTitle
    }()

    static func preview(titled title: String) -> Preview? {
        library[title.lowercased()]
    }

    /// The saved recipe with this title, adding it from the built-in library if it isn't saved.
    @MainActor
    static func recipe(titled title: String, in context: ModelContext) -> Recipe? {
        let wanted = title.lowercased()
        func find() -> Recipe? {
            (try? context.fetch(FetchDescriptor<Recipe>()))?.first { $0.title.lowercased() == wanted }
        }
        if let saved = find() { return saved }
        _ = try? importRecipes(into: context, only: [wanted])
        return find()
    }
}

extension Recipe {
    /// Creates and inserts a recipe from Claude's structured output.
    @MainActor
    static func insert(from generated: GeneratedRecipe, into context: ModelContext) -> Recipe {
        let recipe = Recipe(title: generated.title, summary: generated.summary, servings: max(generated.servings, 1))
        recipe.cuisine = generated.cuisine
        recipe.prepMinutes = max(generated.prep_minutes, 0)
        recipe.cookMinutes = max(generated.cook_minutes, 0)
        recipe.tags = generated.tags
        recipe.instructions = generated.instructions
        context.insert(recipe)
        recipe.setIngredients(generated.ingredients.map {
            RecipeIngredient(name: $0.name, quantity: $0.quantity, unit: $0.unit, note: $0.note, isOptional: $0.optional)
        })
        return recipe
    }
}
