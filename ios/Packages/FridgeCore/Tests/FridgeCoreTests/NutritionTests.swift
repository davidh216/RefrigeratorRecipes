import XCTest
@testable import FridgeCore

final class NutritionTests: XCTestCase {
    func testTableParsesAndFindsTheMostSpecificFood() {
        let table = NutritionTable.standard
        XCTAssertEqual(table.lookup("2 chicken breasts")?.names.first, "chicken breast")
        XCTAssertEqual(table.lookup("Chicken broth")?.names.first, "chicken broth")
        XCTAssertEqual(table.lookup("Red pepper flakes")?.names.first, "red pepper flake")
        XCTAssertEqual(table.lookup("Egg noodles")?.names.first, "egg noodle")
        XCTAssertEqual(table.lookup("Butter lettuce")?.names.first, "lettuce")
        XCTAssertEqual(table.lookup("Peanut butter")?.names.first, "peanut butter")
        XCTAssertEqual(table.lookup("Coconut milk")?.names.first, "coconut milk")
        XCTAssertEqual(table.lookup("Bell peppers")?.names.first, "bell pepper")
        XCTAssertEqual(table.lookup("Extra-virgin olive oil")?.names.first, "olive oil")
        XCTAssertNil(table.lookup("Almond milk"))
        XCTAssertNil(table.lookup("Dragonfruit"))
    }

    func testCookedIngredientsUseCookedRows() {
        let table = NutritionTable.standard
        XCTAssertEqual(table.lookup("Cooked rice")?.per100g.kcal, 130)
        XCTAssertEqual(table.lookup("leftover jasmine rice")?.per100g.kcal, 130)
        XCTAssertEqual(table.lookup("Rice, cooked")?.per100g.kcal, 130)
        XCTAssertEqual(table.lookup("cooked brown rice")?.per100g.kcal, 123)
        XCTAssertEqual(table.lookup("cooked quinoa")?.per100g.kcal, 120)
        // Dry rice stays dry, and a cooked food with no cooked row falls back to the plain one.
        XCTAssertEqual(table.lookup("Jasmine rice")?.per100g.kcal, 360)
        XCTAssertEqual(table.lookup("cooked chicken breast")?.per100g.kcal, 120)
        // A cup of cooked rice is about 205 kcal, not the 670 of a cup of dry rice.
        let estimate = NutritionCalculator.estimate(
            requirements: [IngredientRequirement(name: "Cooked rice", quantity: 1, unit: "cup")], servings: 1)
        XCTAssertEqual(estimate.perServing.kcal, 205, accuracy: 2)
    }

    func testEveryRowParsed() {
        let rows = NutritionTable.standardData.split(separator: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        XCTAssertEqual(NutritionTable.parse(NutritionTable.standardData).count, rows.count)
    }

    func testGramsFromCountsVolumesAndWeights() {
        let table = NutritionTable.standard
        let garlic = table.lookup("garlic")!
        XCTAssertEqual(NutritionCalculator.grams(quantity: 3, unit: "cloves", food: garlic, ingredient: "garlic"), 9)
        let flour = table.lookup("flour")!
        XCTAssertEqual(NutritionCalculator.grams(quantity: 2, unit: "cups", food: flour, ingredient: "flour")!, 250, accuracy: 0.1)
        XCTAssertEqual(NutritionCalculator.grams(quantity: 1, unit: "lb", food: flour, ingredient: "flour")!, 453.6, accuracy: 0.1)
        XCTAssertEqual(NutritionCalculator.grams(quantity: 0, unit: "", food: flour, ingredient: "flour"), 0)
        let spinach = table.lookup("spinach")!
        XCTAssertNil(NutritionCalculator.grams(quantity: 2, unit: "", food: spinach, ingredient: "spinach"))
    }

    func testPerServingEstimateAndCoverage() {
        let recipe = [
            IngredientRequirement(name: "Chicken breasts", quantity: 2, unit: ""),
            IngredientRequirement(name: "Olive oil", quantity: 1, unit: "tbsp"),
            IngredientRequirement(name: "Rice", quantity: 1, unit: "cup"),
            IngredientRequirement(name: "Salt", quantity: 0, unit: ""),
            IngredientRequirement(name: "Dragonfruit leaves", quantity: 1, unit: "bunch"),
            IngredientRequirement(name: "Cilantro", quantity: 1, unit: "bunch", isOptional: true),
        ]
        let estimate = NutritionCalculator.estimate(requirements: recipe, servings: 2)
        XCTAssertEqual(estimate.total, 5)
        XCTAssertEqual(estimate.covered, 4)
        XCTAssertEqual(estimate.missing, ["Dragonfruit leaves"])
        XCTAssertTrue(estimate.isReliable)
        // 400 g chicken (480 kcal) + 13.5 g oil (119 kcal) + 185 g rice (666 kcal), over 2 servings.
        XCTAssertEqual(estimate.perServing.kcal, 632.7, accuracy: 1)
        XCTAssertEqual(estimate.perServing.protein, 51.2, accuracy: 0.5)
        XCTAssertEqual(estimate.perServing.carbs, 73.1, accuracy: 0.5)
    }

    func testExtraFoodsWinAndPartialEstimates() {
        let extra = FoodNutrition(names: ["dragonfruit leaves"], per100g: NutritionFacts(kcal: 50), gramsPerUnit: ["bunch": 100])
        let table = NutritionTable.standard.adding([extra])
        let estimate = NutritionCalculator.estimate(
            requirements: [IngredientRequirement(name: "Dragonfruit leaves", quantity: 1, unit: "bunch"),
                           IngredientRequirement(name: "Mystery sauce", quantity: 1, unit: "cup")],
            servings: 1, table: table
        )
        XCTAssertEqual(estimate.perServing.kcal, 50, accuracy: 0.01)
        XCTAssertFalse(estimate.isReliable)
        XCTAssertEqual(estimate.coverage, 0.5)
    }
}
