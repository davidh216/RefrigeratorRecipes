import XCTest
@testable import FridgeCore

/// Runs the Swift vocabulary and mood rules over the app's bundled library, so they and
/// ios/tools/recipe_lint.py (which mirrors them in Python) can't silently disagree.
final class LibraryVocabularyTests: XCTestCase {
    private struct LibraryRecipe: Decodable {
        struct Ingredient: Decodable {
            let name: String
            let quantity: Double
            let unit: String
            let isOptional: Bool
        }
        let id: String
        let title: String
        let cuisine: String
        let prepMinutes: Int
        let cookMinutes: Int
        let servings: Int
        let tags: [String]
        let ingredients: [Ingredient]
        let instructions: [String]
    }

    private func library() throws -> [LibraryRecipe] {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()   // FridgeCoreTests
            .deletingLastPathComponent()   // Tests
            .deletingLastPathComponent()   // FridgeCore
            .deletingLastPathComponent()   // Packages
            .deletingLastPathComponent()   // ios
            .appendingPathComponent("RefrigeratorRecipes/Resources/SampleRecipes.json")
        return try JSONDecoder().decode([LibraryRecipe].self, from: Data(contentsOf: url))
    }

    func testEveryTagCuisineAndIDIsKnownAndUnique() throws {
        let recipes = try library()
        XCTAssertGreaterThan(recipes.count, 150)
        XCTAssertEqual(Set(recipes.map(\.id)).count, recipes.count, "ids are unique")
        for recipe in recipes {
            XCTAssertNotNil(Cuisine.cuisine(recipe.cuisine), "\(recipe.title): cuisine \(recipe.cuisine)")
            for tag in recipe.tags {
                XCTAssertNotNil(RecipeTag.tag(tag), "\(recipe.title): tag \(tag)")
            }
        }
    }

    func testEveryMoodTagPassesTheSwiftRules() throws {
        for recipe in try library() {
            let check = MoodRecipe(
                title: recipe.title,
                requirements: recipe.ingredients.map {
                    IngredientRequirement(name: $0.name, quantity: $0.quantity, unit: $0.unit, isOptional: $0.isOptional)
                },
                instructions: recipe.instructions, prepMinutes: recipe.prepMinutes, cookMinutes: recipe.cookMinutes,
                servings: recipe.servings, tags: recipe.tags)
            for tag in recipe.tags where RecipeTag.tag(tag)?.kind == .mood {
                XCTAssertEqual(MoodRules.violations(mood: tag, recipe: check), [], "\(recipe.title) as \(tag)")
            }
        }
    }

    func testMoodTargets() throws {
        let recipes = try library()
        func count(_ mood: String) -> Int { recipes.filter { $0.tags.contains(mood) }.count }
        XCTAssertGreaterThanOrEqual(count("comfort-food"), 20)
        XCTAssertGreaterThanOrEqual(count("feeling-spicy"), 20)
        XCTAssertGreaterThanOrEqual(count("easy-to-stomach"), 20)
        XCTAssertGreaterThanOrEqual(count("under-the-weather"), 12)
    }
}
