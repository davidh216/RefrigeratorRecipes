import XCTest
@testable import FridgeCore

final class DietRulesTests: XCTestCase {
    func testFindsAllergensAndSkipsLookalikes() {
        XCTAssertEqual(DietRules.allergens(in: "Grated Parmesan"), [.milk])
        XCTAssertEqual(DietRules.allergens(in: "2 large eggs"), [.egg])
        XCTAssertEqual(DietRules.allergens(in: "Soy sauce"), [.soy, .wheat, .gluten])
        XCTAssertEqual(DietRules.allergens(in: "Tamari"), [.soy])
        XCTAssertEqual(DietRules.allergens(in: "Peanut butter"), [.peanut])
        XCTAssertEqual(DietRules.allergens(in: "Almond milk"), [.treeNut])
        XCTAssertEqual(DietRules.allergens(in: "Basil pesto"), [.treeNut])
        XCTAssertEqual(DietRules.allergens(in: "Fish sauce"), [.fish])
        XCTAssertEqual(DietRules.allergens(in: "Oyster sauce"), [.shellfish])
        XCTAssertEqual(DietRules.allergens(in: "Tahini"), [.sesame])
        XCTAssertEqual(DietRules.allergens(in: "Pearl barley"), [.gluten])
        XCTAssertEqual(DietRules.allergens(in: "All-purpose flour"), [.wheat, .gluten])
        XCTAssertTrue(DietRules.allergens(in: "Coconut milk").isEmpty)
        XCTAssertTrue(DietRules.allergens(in: "Butternut squash").isEmpty)
        XCTAssertTrue(DietRules.allergens(in: "Eggplant").isEmpty)
        XCTAssertTrue(DietRules.allergens(in: "Rice noodles").isEmpty)
        XCTAssertTrue(DietRules.allergens(in: "Corn tortillas").isEmpty)
        XCTAssertTrue(DietRules.allergens(in: "Cream of tartar").isEmpty)
        XCTAssertTrue(DietRules.allergens(in: "Nutmeg").isEmpty)
    }

    func testDiets() {
        XCTAssertEqual(DietRules.dietsBroken(by: "Chicken broth"), [.vegetarian, .vegan, .pescatarian])
        XCTAssertEqual(DietRules.dietsBroken(by: "Salmon fillet"), [.vegetarian, .vegan])
        XCTAssertEqual(DietRules.dietsBroken(by: "Cheddar"), [.vegan])
        XCTAssertEqual(DietRules.dietsBroken(by: "Honey"), [.vegan])
        XCTAssertTrue(DietRules.dietsBroken(by: "Cauliflower steak").isEmpty)
        XCTAssertTrue(DietRules.dietsBroken(by: "Firm tofu").isEmpty)
    }

    func testConflictsMergeHouseholdAndSummarize() {
        let sam = Restrictions(allergens: [.milk])
        let alex = Restrictions(diets: [.vegetarian], avoid: ["cilantro"])
        let household = Restrictions.merged([sam, alex, Restrictions(avoid: ["Cilantro"])])
        XCTAssertEqual(household.avoid, ["cilantro"])

        let ingredients = ["Chicken thighs", "Heavy cream", "Fresh cilantro", "Rice"]
        let conflicts = DietRules.conflicts(ingredients: ingredients, restrictions: household)
        XCTAssertEqual(conflicts, [
            DietConflict(ingredient: "Chicken thighs", reason: "Vegetarian"),
            DietConflict(ingredient: "Heavy cream", reason: "Milk"),
            DietConflict(ingredient: "Fresh cilantro", reason: "cilantro"),
        ])
        XCTAssertEqual(DietRules.summary(conflicts), "vegetarian, milk and cilantro")
        XCTAssertTrue(DietRules.fits(ingredients: ["Rice", "Black beans"], restrictions: household))
        XCTAssertTrue(DietRules.fits(ingredients: ingredients, restrictions: Restrictions()))
    }
}
