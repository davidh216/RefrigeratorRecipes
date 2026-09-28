import XCTest
@testable import FridgeCore

final class MealKindTests: XCTestCase {
    func testTagsWinThenTitleThenDinner() {
        XCTAssertEqual(MealKind.guess(tags: ["Breakfast"], title: "Shakshuka"), .breakfast)
        XCTAssertEqual(MealKind.guess(tags: ["breakfast", "dinner"], title: "Frittata"), .dinner)
        XCTAssertEqual(MealKind.guess(tags: ["dessert"], title: "Brownies"), .snack)
        XCTAssertEqual(MealKind.guess(tags: ["lunch"], title: "Cobb salad"), .lunch)
        XCTAssertEqual(MealKind.guess(tags: [], title: "Blueberry Pancakes"), .breakfast)
        XCTAssertEqual(MealKind.guess(tags: [], title: "French toast bake"), .breakfast)
        XCTAssertEqual(MealKind.guess(tags: [], title: "Turkey sandwich"), .lunch)
        XCTAssertEqual(MealKind.guess(tags: ["quick"], title: "Chicken stir fry"), .dinner)
        XCTAssertEqual(MealKind.guess(tags: ["dinner"], title: "Breakfast burrito bowl"), .dinner)
    }
}

final class WeekPlannerTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    lazy var monday = calendar.date(from: DateComponents(year: 2026, month: 6, day: 8, hour: 17))!
    func day(_ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: monday)! }

    func recipe(_ title: String, _ ingredients: [String], tags: [String] = []) -> TonightRecipe {
        TonightRecipe(title: title, requirements: ingredients.map { IngredientRequirement(name: $0) }, totalMinutes: 30, tags: tags)
    }

    lazy var stock: [StockItem] = [
        StockItem(name: "Spinach", expiresAt: day(1)),
        StockItem(name: "Salmon", expiresAt: day(2)),
        StockItem(name: "Pasta"),
        StockItem(name: "Rice"),
        StockItem(name: "Eggs"),
    ]

    func testFillsEachDayOnceUsingExpiringFoodEarly() {
        let recipes = [
            recipe("Egg fried rice", ["Rice", "Eggs"]),
            recipe("Spinach pasta", ["Spinach", "Pasta"]),
            recipe("Salmon rice bowl", ["Salmon", "Rice"]),
            recipe("Spinach salmon pasta", ["Spinach", "Salmon", "Pasta"]),
        ]
        let picks = WeekPlanner.fill(days: [day(0), day(1), day(2)], recipes: recipes, stock: stock, calendar: calendar)
        XCTAssertEqual(picks.map(\.dayIndex), [0, 1, 2])
        // Monday uses both the spinach and the salmon; nothing is planned twice.
        XCTAssertEqual(picks[0].recipeIndex, 3)
        XCTAssertEqual(Set(picks.map(\.recipeIndex)).count, 3)
        // Once Monday has eaten the spinach, the spinach pasta no longer claims to rescue it.
        let later = picks.dropFirst().filter { $0.recipeIndex == 1 }
        XCTAssertTrue(later.allSatisfy { !$0.reason.hasPrefix("Uses") })
    }

    func testSkipsAlreadyPlannedAndLeavesDaysEmptyWhenNothingFits() {
        let recipes = [
            recipe("Egg fried rice", ["Rice", "Eggs"]),
            recipe("Beef Wellington", ["Beef", "Puff pastry", "Mushrooms", "Prosciutto", "Mustard", "Thyme"]),
        ]
        let picks = WeekPlanner.fill(days: [day(0), day(1)], recipes: recipes, stock: stock, alreadyPlanned: [0], calendar: calendar)
        XCTAssertTrue(picks.isEmpty)
    }

    func testAlternativeExcludesCurrentRecipe() {
        let recipes = [
            recipe("Egg fried rice", ["Rice", "Eggs"]),
            recipe("Spinach pasta", ["Spinach", "Pasta"]),
        ]
        XCTAssertEqual(WeekPlanner.alternative(on: day(0), recipes: recipes, stock: stock, excluding: [1], calendar: calendar), 0)
        XCTAssertNil(WeekPlanner.alternative(on: day(0), recipes: recipes, stock: stock, excluding: [0, 1], calendar: calendar))
    }
}
