import XCTest
@testable import FridgeCore

final class FoodCategoryTests: XCTestCase {
    func testGuessFromNamesAndCategories() {
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Baby spinach"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Eggplant"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Eggs"), .dairy)
        XCTAssertEqual(FoodCategory.guess(category: "baking", name: "Flour"), .grains)
        XCTAssertEqual(FoodCategory.guess(category: "canned", name: "Chicken broth"), .other)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Chicken broth"), .other)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Peanut butter"), .condiments)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Frozen peas"), .frozen)
        XCTAssertEqual(FoodCategory.guess(category: "produce", name: "Frozen peas"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "Dairy & eggs", name: "Thing"), .dairy)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Salmon fillet"), .seafood)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Sourdough bread"), .bakery)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Rice vinegar"), .condiments)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Green beans"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Mystery item"), .other)
    }

    func testCategoryStringsResolveRawValuesSynonymsAndWords() {
        XCTAssertEqual(FoodCategory.guess(category: "  Seafood ", name: ""), .seafood)
        XCTAssertEqual(FoodCategory.guess(category: "Frozen foods", name: "Chicken"), .frozen)
        XCTAssertEqual(FoodCategory.guess(category: "Baked goods", name: ""), .bakery)
        XCTAssertEqual(FoodCategory.guess(category: "Vegetables", name: ""), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "Grains & dry goods", name: ""), .grains)
        // An unknown category string falls back to the name.
        XCTAssertEqual(FoodCategory.guess(category: "Misc", name: "Cheddar"), .dairy)
        XCTAssertEqual(FoodCategory.guess(category: "", name: ""), .other)
    }

    func testWholeWordMatchingAndExceptions() {
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Tomatoes"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Ice cream"), .frozen)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Butter lettuce"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Egg noodles"), .grains)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Black pepper"), .condiments)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Red bell pepper"), .produce)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Salted butter"), .dairy)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Potato chips"), .snacks)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Chocolate chip cookies"), .snacks)
        XCTAssertEqual(FoodCategory.guess(category: "", name: "Baking soda"), .grains)
    }

    func testInitMatchesGuess() {
        XCTAssertEqual(FoodCategory(category: "", name: "Ground beef"), .meat)
        XCTAssertEqual(FoodCategory(category: "Drinks", name: "Thing"), .beverages)
        XCTAssertEqual(FoodCategory(rawValue: "snacks"), .snacks)
    }

    func testLeadCategorySkipsStaplesAndOther() {
        XCTAssertEqual(
            FoodCategory.lead(ingredients: ["salt", "olive oil", "chicken thighs", "lemon"], staples: RecipeMatcher.defaultStaples),
            .meat
        )
        XCTAssertEqual(FoodCategory.lead(ingredients: ["flour", "milk", "eggs"], staples: []), .grains)
        XCTAssertEqual(FoodCategory.lead(ingredients: [], staples: []), .other)
        XCTAssertEqual(FoodCategory.lead(ingredients: ["Mystery item", "Basil"], staples: []), .produce)
        XCTAssertEqual(FoodCategory.lead(ingredients: ["Salt", "Water"], staples: RecipeMatcher.defaultStaples), .other)
    }

    func testTitlesAndAisleOrder() {
        XCTAssertEqual(FoodCategory.allCases.count, 11)
        XCTAssertEqual(FoodCategory.dairy.title, "Dairy & eggs")
        XCTAssertEqual(FoodCategory.grains.title, "Grains & dry goods")
        XCTAssertEqual(FoodCategory.condiments.title, "Sauces & spices")
        XCTAssertEqual(FoodCategory.beverages.title, "Drinks")
        XCTAssertEqual(FoodCategory.produce.id, "produce")
        XCTAssertEqual(FoodCategory.aisleOrder.count, FoodCategory.allCases.count)
        XCTAssertEqual(Set(FoodCategory.aisleOrder), Set(FoodCategory.allCases))
        XCTAssertEqual(FoodCategory.aisleOrder.first, .produce)
        XCTAssertEqual(FoodCategory.aisleOrder.last, .other)
    }
}
