import XCTest
@testable import FridgeCore

final class MoodRulesTests: XCTestCase {
    private func recipe(_ ingredients: [(String, Double, String)], title: String = "Dish", prep: Int = 10, cook: Int = 20,
                        servings: Int = 4, tags: [String] = [], steps: [String] = ["Cook it all together until done."]) -> MoodRecipe {
        MoodRecipe(title: title,
                   requirements: ingredients.map { IngredientRequirement(name: $0.0, quantity: $0.1, unit: $0.2) },
                   instructions: steps, prepMinutes: prep, cookMinutes: cook, servings: servings, tags: tags)
    }

    /// Plain rice and broth: gentle, warm, quick and short.
    private var congee: MoodRecipe {
        recipe([("Jasmine rice", 1, "cup"), ("Chicken broth", 6, "cup"), ("Ginger", 1, "inch"), ("Salt", 1, "tsp")],
               title: "Simple Congee", prep: 5, cook: 60)
    }

    func testChiliDetection() {
        for name in ["Red pepper flakes", "Gochujang", "Chipotle peppers in adobo", "Jalapeño", "jalapenos", "Thai red curry paste",
                     "Sichuan peppercorns", "Hot sauce", "Chili powder", "Fresh red chilies", "Cayenne pepper", "Sriracha",
                     "Chili bean paste", "Chili bean sauce", "Jalapeños", "Ají amarillo paste"] {
            XCTAssertTrue(MoodRules.isChili(name), name)
        }
        for name in ["Bell pepper", "Black pepper", "Smoked paprika", "Sweet chili sauce", "Cumin", "Curry powder",
                     "Chili beans", "Aji-mirin"] {
            XCTAssertFalse(MoodRules.isChili(name), name)
        }
    }

    func testAlcoholDetection() {
        XCTAssertTrue(MoodRules.isAlcohol("Dry white wine"))
        XCTAssertTrue(MoodRules.isAlcohol("Mirin"))
        XCTAssertTrue(MoodRules.isAlcohol("Shaoxing wine"))
        XCTAssertTrue(MoodRules.isAlcohol("Beer"))
        XCTAssertFalse(MoodRules.isAlcohol("Rice wine vinegar"))
        XCTAssertFalse(MoodRules.isAlcohol("Apple cider vinegar"))
        XCTAssertFalse(MoodRules.isAlcohol("Ginger ale"))
        XCTAssertFalse(MoodRules.isAlcohol("Kale"))
    }

    func testFeelingSpicyNeedsChili() {
        let mild = recipe([("Chicken thigh", 1, "lb"), ("Rice", 1, "cup"), ("Bell pepper", 1, "")])
        XCTAssertFalse(MoodRules.fits(mood: "feeling-spicy", recipe: mild))
        var hot = mild
        hot.requirements.append(IngredientRequirement(name: "Gochujang", quantity: 2, unit: "tbsp"))
        XCTAssertTrue(MoodRules.fits(mood: "feeling-spicy", recipe: hot))
        // The old "spicy" spelling follows the same rule.
        XCTAssertTrue(MoodRules.fits(mood: "spicy", recipe: hot))
    }

    func testComfortFoodIsWarm() {
        XCTAssertTrue(MoodRules.fits(mood: "comfort-food", recipe: congee))
        let salad = recipe([("Lentils", 1, "cup")], title: "Warm Lentil Salad", cook: 20)
        XCTAssertFalse(MoodRules.fits(mood: "comfort-food", recipe: salad))
        let raw = recipe([("Tomato", 6, "")], title: "Gazpacho", cook: 0, tags: ["no-cook"])
        XCTAssertFalse(MoodRules.fits(mood: "comfort-food", recipe: raw))
    }

    func testUnderTheWeather() {
        XCTAssertTrue(MoodRules.fits(mood: "under-the-weather", recipe: congee))

        var fussy = congee
        fussy.prepMinutes = 25
        XCTAssertEqual(MoodRules.violations(mood: "under-the-weather", recipe: fussy).count, 1)

        // Staples (salt, oil, water, pepper) and optional ingredients don't count towards the 8.
        let nine = (1...9).map { ("Ingredient \($0)", 1.0, "cup") }
        XCTAssertFalse(MoodRules.fits(mood: "under-the-weather", recipe: recipe(nine, prep: 10)))
        var eight = recipe(Array(nine.prefix(8)) + [("Salt", 1, "tsp"), ("Olive oil", 1, "tbsp"), ("Water", 2, "cup")], prep: 10)
        XCTAssertTrue(MoodRules.fits(mood: "under-the-weather", recipe: eight))
        eight.requirements.append(IngredientRequirement(name: "Parsley", quantity: 1, unit: "tbsp", isOptional: true))
        XCTAssertTrue(MoodRules.fits(mood: "under-the-weather", recipe: eight))
    }

    func testEasyToStomachPasses() {
        XCTAssertEqual(MoodRules.violations(mood: "easy-to-stomach", recipe: congee), [])
    }

    func testEasyToStomachRulesOutChiliFryingAndAlcohol() {
        var chili = congee
        chili.requirements.append(IngredientRequirement(name: "Chili oil", quantity: 1, unit: "tsp"))
        XCTAssertFalse(MoodRules.fits(mood: "easy-to-stomach", recipe: chili))

        var fried = congee
        fried.instructions = ["Heat oil to 350°F and deep-fry the dough until golden."]
        XCTAssertFalse(MoodRules.fits(mood: "easy-to-stomach", recipe: fried))

        var boozy = congee
        boozy.requirements.append(IngredientRequirement(name: "Shaoxing wine", quantity: 1, unit: "tbsp"))
        XCTAssertFalse(MoodRules.fits(mood: "easy-to-stomach", recipe: boozy))
    }

    func testEasyToStomachCapsFatAndFibre() {
        // Two sticks of butter between two people: about 113 g of fat each.
        let rich = recipe([("Rice", 1, "cup"), ("Butter", 2, "stick"), ("Chicken broth", 2, "cup")], servings: 2)
        let reasons = MoodRules.violations(mood: "easy-to-stomach", recipe: rich)
        XCTAssertEqual(reasons.count, 1)
        XCTAssertTrue(reasons[0].contains("fat"))

        // Two cups of dry lentils for two: about 21 g of fibre each.
        let fibrous = recipe([("Lentils", 2, "cup"), ("Vegetable broth", 4, "cup"), ("Carrot", 1, "")], servings: 2)
        XCTAssertTrue(MoodRules.violations(mood: "easy-to-stomach", recipe: fibrous).contains { $0.contains("fibre") })
    }

    func testEasyToStomachNeedsAReliableEstimate() {
        let mystery = recipe([("Dragonfruit essence", 1, "cup"), ("Moon cheese", 2, "oz"), ("Rice", 1, "cup")])
        XCTAssertFalse(MoodRules.fits(mood: "easy-to-stomach", recipe: mystery))
    }

    func testTimeAndCalorieMoods() {
        XCTAssertTrue(MoodRules.fits(mood: "cozy-night-in", recipe: congee))
        XCTAssertFalse(MoodRules.fits(mood: "cozy-night-in", recipe: recipe([("Egg", 2, "")], prep: 5, cook: 10)))

        XCTAssertTrue(MoodRules.fits(mood: "hot-day", recipe: recipe([("Cucumber", 1, "")], cook: 0, tags: ["no-cook"])))
        XCTAssertTrue(MoodRules.fits(mood: "hot-day", recipe: recipe([("Chicken breast", 2, "")], cook: 25, tags: ["grill"])))
        XCTAssertFalse(MoodRules.fits(mood: "hot-day", recipe: congee))

        XCTAssertTrue(MoodRules.fits(mood: "light-and-fresh", recipe: recipe([("Cucumber", 2, ""), ("Tomato", 4, ""), ("Olive oil", 2, "tbsp")])))
        XCTAssertFalse(MoodRules.fits(mood: "light-and-fresh", recipe: recipe([("Butter", 4, "stick"), ("Rice", 2, "cup")], servings: 2)))
    }

    func testMoodsWithoutHardRules() {
        XCTAssertTrue(MoodRules.fits(mood: "date-night", recipe: recipe([("Egg", 1, "")])))
        XCTAssertTrue(MoodRules.fits(mood: "lazy-sunday", recipe: recipe([("Egg", 1, "")])))
    }

    func testKeepingEarnedMoodsDropsOnlyUnearnedMoods() {
        let tags = ["dinner", "feeling-spicy", "comfort-food", "easy-to-stomach", "date-night"]
        XCTAssertEqual(MoodRules.keepingEarnedMoods(tags, recipe: congee),
                       ["dinner", "comfort-food", "easy-to-stomach", "date-night"])
    }
}
