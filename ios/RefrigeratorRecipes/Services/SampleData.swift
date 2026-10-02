import Foundation
import SwiftData
import FridgeCore

/// Imports the bundled starter library: about 180 original recipes, checked with ios/tools/recipe_lint.py.
enum SampleData {
    /// A recipe in the bundled library's format. Server-delivered super-ingredient editions use it
    /// too, for recipes the library doesn't have.
    struct SampleRecipe: Codable, Equatable {
        struct Ingredient: Codable, Equatable {
            let name: String
            let quantity: Double
            let unit: String
            let isOptional: Bool
            let note: String
        }
        /// Stable slug ("red-lentil-dal-with-spinach"). Optional so older server content still decodes.
        let id: String?
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

    /// The bundled library, read once.
    static let samples: [SampleRecipe] = {
        guard let url = Bundle.main.url(forResource: "SampleRecipes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let samples = try? JSONDecoder().decode([SampleRecipe].self, from: data) else { return [] }
        return samples
    }()

    /// Adds sample recipes that aren't already saved (by library id, or by title for recipes saved
    /// before ids existed). Returns how many were added. `only` limits it to those library ids.
    @MainActor
    @discardableResult
    static func importRecipes(into context: ModelContext, only: Set<String>? = nil) throws -> Int {
        var added = 0
        for sample in missing(among: try context.fetch(FetchDescriptor<Recipe>())) {
            if let only, !only.contains(sample.id ?? "") { continue }
            insert(sample, into: context)
            added += 1
        }
        try context.save()
        return added
    }

    /// Library recipes not saved yet: no saved recipe has their library id or, for recipes saved
    /// before ids existed, their title.
    static func missing(among saved: [Recipe]) -> [SampleRecipe] {
        let savedIDs = Set(saved.map(\.libraryID).filter { !$0.isEmpty })
        let savedTitles = Set(saved.map { $0.title.lowercased() })
        return samples.filter { !savedIDs.contains($0.id ?? "") && !savedTitles.contains($0.title.lowercased()) }
    }

    /// Old library tags that the tag cleanup dropped (cuisines and one-offs). Anything else a saved
    /// library recipe has that isn't in the vocabulary was added by the user, so it's kept.
    private static let droppedLibraryTags: Set<String> = [
        "cookies", "elegant", "cheesy", "creamy", "trendy", "authentic", "pizza", "soup", "curry", "classic",
        "stir-fry", "low-carb", "fresh", "gluten-free-option", "mediterranean", "asian", "asian-inspired",
        "italian", "thai", "mexican", "indian",
    ]

    /// Once, after the tag and cuisine cleanup: saved library recipes take the library's new tags and
    /// cuisine (so existing users get the moods), keeping any tags the user added themselves.
    /// The user's own recipes have known tags and cuisines mapped to their ids; the rest is left as typed.
    /// Guarded by `SettingsKey.libraryTagsUpgraded`.
    @MainActor
    static func upgradeSavedTags(in context: ModelContext) {
        guard let saved = try? context.fetch(FetchDescriptor<Recipe>()) else { return }
        var byID: [String: SampleRecipe] = [:]
        for sample in samples {
            if let id = sample.id { byID[id] = sample }
        }
        for recipe in saved {
            if let sample = byID[recipe.libraryID] {
                let own = recipe.tags.filter { RecipeTag.id(for: $0) == nil && !droppedLibraryTags.contains($0.lowercased()) }
                recipe.tags = sample.tags + own.filter { !sample.tags.contains($0) }
                recipe.cuisine = sample.cuisine
            } else {
                var seen: Set<String> = []
                recipe.tags = recipe.tags.map { RecipeTag.id(for: $0) ?? $0 }.filter { seen.insert($0).inserted }
                if let id = Cuisine.id(for: recipe.cuisine) { recipe.cuisine = id }
            }
        }
        try? context.save()
    }

    /// Removes extra copies of a library recipe, which appear when starter recipes are added on a
    /// second device before iCloud has synced the first device's copies. Copies the user has touched
    /// (favorite, cooked, planned) are never removed. The rule is deterministic, so two devices
    /// cleaning up at once keep the same copy.
    @MainActor
    static func removeDuplicateLibraryRecipes(in context: ModelContext) {
        guard let saved = try? context.fetch(FetchDescriptor<Recipe>()) else { return }
        func isTouched(_ recipe: Recipe) -> Bool {
            recipe.isFavorite || recipe.cookCount > 0 || recipe.lastCookedAt != nil || !(recipe.mealPlanEntries ?? []).isEmpty
        }
        let groups = Dictionary(grouping: saved.filter { !$0.libraryID.isEmpty }, by: \.libraryID)
        var removed = false
        for (_, copies) in groups where copies.count > 1 {
            let ordered = copies.sorted { a, b in
                if isTouched(a) != isTouched(b) { return isTouched(a) }
                if a.createdAt != b.createdAt { return a.createdAt < b.createdAt }
                return a.uuid.uuidString < b.uuid.uuidString
            }
            for extra in ordered.dropFirst() where !isTouched(extra) {
                context.delete(extra)
                removed = true
            }
        }
        if removed { try? context.save() }
    }

    /// Gives saved recipes from the library their library id, matching by title. Recipes saved
    /// before ids existed (or synced from a device with an older build) only have a title.
    /// Cheap enough to run at launch and whenever the number of recipes changes.
    @MainActor
    static func backfillLibraryIDs(in context: ModelContext) {
        guard let saved = try? context.fetch(FetchDescriptor<Recipe>()) else { return }
        var byTitle: [String: String] = [:]
        for sample in samples {
            if let id = sample.id { byTitle[sample.title.lowercased()] = id }
        }
        var changed = false
        for recipe in saved where recipe.libraryID.isEmpty {
            if let id = byTitle[recipe.title.lowercased()] {
                recipe.libraryID = id
                changed = true
            }
        }
        if changed { try? context.save() }
    }

    @MainActor
    @discardableResult
    static func insert(_ sample: SampleRecipe, into context: ModelContext) -> Recipe {
        let recipe = Recipe(title: sample.title, summary: sample.summary, servings: max(sample.servings, 1))
        recipe.libraryID = sample.id ?? ""
        recipe.cuisine = sample.cuisine
        recipe.prepMinutes = sample.prepMinutes
        recipe.cookMinutes = sample.cookMinutes
        recipe.tags = sample.tags
        recipe.instructions = sample.instructions
        context.insert(recipe)
        recipe.setIngredients(sample.ingredients.map {
            RecipeIngredient(name: $0.name, quantity: $0.quantity, unit: $0.unit, note: $0.note, isOptional: $0.isOptional)
        })
        return recipe
    }
}

extension SampleData {
    /// What a list row needs to show a library recipe that may not be saved yet.
    struct Preview: Equatable {
        /// Library id; "" for server recipes sent without one.
        var id: String
        var title: String
        var summary: String
        var totalMinutes: Int
        var ingredientNames: [String]
    }

    /// The recipe a reference names: a library id ("red-lentil-dal-with-spinach") or, for content
    /// written before ids existed, a title. `extra` (recipes sent with a server edition) is searched
    /// the same way after the library.
    static func sample(_ reference: String, extra: [SampleRecipe] = []) -> SampleRecipe? {
        func find(in list: [SampleRecipe]) -> SampleRecipe? {
            list.first { $0.id == reference }
                ?? list.first { $0.title.caseInsensitiveCompare(reference) == .orderedSame }
        }
        return find(in: samples) ?? find(in: extra)
    }

    /// What a list row shows for a referenced recipe that may not be saved yet.
    static func preview(_ reference: String, extra: [SampleRecipe] = []) -> Preview? {
        sample(reference, extra: extra).map {
            Preview(id: $0.id ?? "", title: $0.title, summary: $0.summary,
                    totalMinutes: $0.prepMinutes + $0.cookMinutes, ingredientNames: $0.ingredients.map(\.name))
        }
    }

    /// The saved copy of a referenced recipe: same library id, or (before ids) same title.
    static func saved(_ reference: String, among recipes: [Recipe], extra: [SampleRecipe] = []) -> Recipe? {
        let target = sample(reference, extra: extra)
        if let id = target?.id, !id.isEmpty, let found = recipes.first(where: { $0.libraryID == id }) { return found }
        let title = target?.title ?? reference
        return recipes.first { $0.title.caseInsensitiveCompare(title) == .orderedSame }
    }

    /// The saved recipe a reference names, adding it from the library or from `extra` if it isn't saved.
    @MainActor
    static func recipe(_ reference: String, in context: ModelContext, extra: [SampleRecipe] = []) -> Recipe? {
        let all = (try? context.fetch(FetchDescriptor<Recipe>())) ?? []
        if let found = saved(reference, among: all, extra: extra) { return found }
        guard let missing = sample(reference, extra: extra) else { return nil }
        let recipe = insert(missing, into: context)
        try? context.save()
        return recipe
    }
}

extension Recipe {
    /// Creates and inserts a recipe from Claude's structured output.
    @MainActor
    static func insert(from generated: GeneratedRecipe, into context: ModelContext) -> Recipe {
        let recipe = Recipe(title: generated.title, summary: generated.summary, servings: max(generated.servings, 1))
        let ingredients = generated.ingredients.map {
            RecipeIngredient(name: $0.name, quantity: $0.quantity, unit: $0.unit, note: $0.note, isOptional: $0.optional)
        }
        // Imports and AI recipes go through the alias maps: known cuisines and tags only, "other"
        // for an unknown cuisine, and no mood the recipe doesn't earn (MoodRules).
        recipe.cuisine = Cuisine.idOrOther(for: generated.cuisine)
        recipe.prepMinutes = max(generated.prep_minutes, 0)
        recipe.cookMinutes = max(generated.cook_minutes, 0)
        let moodCheck = MoodRecipe(
            title: generated.title, requirements: ingredients.map(\.requirement), instructions: generated.instructions,
            prepMinutes: recipe.prepMinutes, cookMinutes: recipe.cookMinutes, servings: recipe.servings,
            tags: RecipeTag.ids(for: generated.tags))
        recipe.tags = MoodRules.keepingEarnedMoods(moodCheck.tags, recipe: moodCheck)
        recipe.instructions = generated.instructions
        context.insert(recipe)
        recipe.setIngredients(ingredients)
        return recipe
    }
}
