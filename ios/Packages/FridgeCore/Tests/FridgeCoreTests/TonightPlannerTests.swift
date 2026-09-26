import XCTest
@testable import FridgeCore

final class TonightPlannerTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    lazy var now = calendar.date(from: DateComponents(year: 2026, month: 6, day: 10, hour: 17))!
    func days(_ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: now)! }

    lazy var stock: [StockItem] = [
        StockItem(name: "Chicken breast", quantity: 1, unit: "lb", expiresAt: days(1)),
        StockItem(name: "Baby spinach", quantity: 1, unit: "bag", expiresAt: days(2)),
        StockItem(name: "Pasta", quantity: 1, unit: "lb"),
        StockItem(name: "Eggs", quantity: 12),
        StockItem(name: "Parmesan", quantity: 4, unit: "oz", expiresAt: days(30)),
        StockItem(name: "Old yogurt", quantity: 1, expiresAt: days(-2)),
    ]

    func recipe(_ title: String, _ ingredients: [String], minutes: Int = 30, tags: [String] = [], favorite: Bool = false, cooked: Date? = nil) -> TonightRecipe {
        TonightRecipe(title: title, requirements: ingredients.map { IngredientRequirement(name: $0) }, totalMinutes: minutes, tags: tags, isFavorite: favorite, lastCookedAt: cooked)
    }

    func testRescuingExpiringFoodRanksFirstAndTooManyMissingIsExcluded() {
        let recipes = [
            recipe("Pasta with parmesan", ["Pasta", "Parmesan"]),
            recipe("Chicken spinach pasta", ["Chicken", "Spinach", "Pasta", "Garlic"]),
            recipe("Beef Wellington", ["Beef", "Puff pastry", "Mushrooms", "Prosciutto"]),
            recipe("Spinach omelette", ["Eggs", "Spinach"]),
        ]
        let picks = TonightPlanner.picks(recipes: recipes, stock: stock, now: now, calendar: calendar)
        XCTAssertEqual(picks.map(\.recipeIndex), [1, 3, 0])
        XCTAssertEqual(picks[0].rescues, ["Chicken breast", "Baby spinach"])
        XCTAssertEqual(picks[0].reason, "Uses chicken breast and baby spinach before they go bad")
        XCTAssertEqual(picks[2].reason, "You have everything for this")
    }

    func testRecentlyCookedDessertAndSlowRecipesArePushedDownOrFiltered() {
        let recipes = [
            recipe("Spinach omelette", ["Eggs", "Spinach"], cooked: days(-1)),
            recipe("Spinach cake", ["Eggs", "Spinach"], tags: ["dessert"]),
            recipe("Slow spinach bake", ["Eggs", "Spinach"], minutes: 90),
            recipe("Spinach scramble", ["Eggs", "Spinach"], minutes: 15),
        ]
        let picks = TonightPlanner.picks(recipes: recipes, stock: stock, now: now, maxMinutes: 30, calendar: calendar)
        XCTAssertEqual(picks.map(\.recipeIndex), [3, 1, 0])
    }

    func testExcludedRecipesAndMissingReason() {
        let recipes = [
            recipe("Pasta with parmesan", ["Pasta", "Parmesan"]),
            recipe("Pasta carbonara", ["Pasta", "Eggs", "Parmesan", "Bacon"]),
        ]
        let picks = TonightPlanner.picks(recipes: recipes, stock: stock, now: now, excluding: [0], calendar: calendar)
        XCTAssertEqual(picks.map(\.recipeIndex), [1])
        XCTAssertEqual(picks[0].reason, "Just need bacon")
    }

    func testListFormatting() {
        XCTAssertEqual(TonightPlanner.list(["a"]), "a")
        XCTAssertEqual(TonightPlanner.list(["a", "b", "c"]), "a, b and c")
        XCTAssertEqual(TonightPlanner.list(["a", "b", "c", "d", "e"]), "a, b and 3 more")
    }
}
