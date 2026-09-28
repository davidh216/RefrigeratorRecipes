import Foundation
import SwiftData

/// Imports the bundled starter recipes (carried over from the old web app's demo data).
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
    @MainActor
    @discardableResult
    static func importRecipes(into context: ModelContext) throws -> Int {
        guard let url = Bundle.main.url(forResource: "SampleRecipes", withExtension: "json") else { return 0 }
        let samples = try JSONDecoder().decode([SampleRecipe].self, from: Data(contentsOf: url))
        let existing = Set(try context.fetch(FetchDescriptor<Recipe>()).map { $0.title.lowercased() })

        var added = 0
        for sample in samples where !existing.contains(sample.title.lowercased()) {
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
