import XCTest
@testable import FridgeCore

final class IngredientNameTests: XCTestCase {
    func testNormalizeStripsDescriptorsPluralsAndNotes() {
        XCTAssertEqual(IngredientName.normalize("2 Large Tomatoes, diced"), "tomato")
        XCTAssertEqual(IngredientName.normalize("Fresh Blueberries"), "blueberry")
        XCTAssertEqual(IngredientName.normalize("Extra Virgin Olive Oil"), "olive oil")
        XCTAssertEqual(IngredientName.normalize("Parmesan cheese (grated)"), "parmesan cheese")
        XCTAssertEqual(IngredientName.normalize("Peaches"), "peach")
        XCTAssertEqual(IngredientName.normalize("Hummus"), "hummus")
        XCTAssertEqual(IngredientName.normalize("Eggs"), "egg")
    }

    func testMatchesBySubset() {
        XCTAssertTrue(IngredientName.matches("chicken breast", "Chicken"))
        XCTAssertTrue(IngredientName.matches("Chicken", "boneless skinless chicken breasts"))
        XCTAssertTrue(IngredientName.matches("eggs", "Egg"))
        XCTAssertFalse(IngredientName.matches("milk", "buttermilk"))
        XCTAssertFalse(IngredientName.matches("", "milk"))
    }
}

final class ExpiryTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    func date(_ day: Int, hour: Int = 12) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: 3, day: day, hour: hour))!
    }

    func testStatusByCalendarDay() {
        let now = date(10, hour: 23)
        XCTAssertEqual(ExpiryStatus.of(expiresAt: nil, now: now, calendar: calendar), .unknown)
        XCTAssertEqual(ExpiryStatus.of(expiresAt: date(10, hour: 1), now: now, calendar: calendar), .expiringSoon(daysLeft: 0))
        XCTAssertEqual(ExpiryStatus.of(expiresAt: date(8), now: now, calendar: calendar), .expired(daysAgo: 2))
        XCTAssertEqual(ExpiryStatus.of(expiresAt: date(13), now: now, calendar: calendar), .expiringSoon(daysLeft: 3))
        XCTAssertEqual(ExpiryStatus.of(expiresAt: date(20), now: now, calendar: calendar), .fresh(daysLeft: 10))
    }

    func testUrgencyOrdersExpiredFirstUnknownLast() {
        let statuses: [ExpiryStatus] = [.unknown, .fresh(daysLeft: 9), .expired(daysAgo: 1), .expiringSoon(daysLeft: 1)]
        let sorted = statuses.sorted { $0.urgency < $1.urgency }
        XCTAssertEqual(sorted, [.expired(daysAgo: 1), .expiringSoon(daysLeft: 1), .fresh(daysLeft: 9), .unknown])
    }
}

final class RecipeMatcherTests: XCTestCase {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func testStaplesAndOptionalIngredientsNeverMissing() {
        let match = RecipeMatcher.match(
            requirements: [
                .init(name: "Eggs"),
                .init(name: "Salt"),
                .init(name: "Chives", isOptional: true),
            ],
            stock: [.init(name: "eggs")],
            now: now
        )
        XCTAssertTrue(match.canMake)
        XCTAssertEqual(match.have, ["Eggs", "Salt"])
        XCTAssertEqual(match.missing, [])
    }

    func testCountsExpiringIngredientsAndMissing() {
        let match = RecipeMatcher.match(
            requirements: [.init(name: "Spinach"), .init(name: "Feta cheese"), .init(name: "Pasta")],
            stock: [
                .init(name: "baby spinach", expiresAt: now.addingTimeInterval(86_400)),
                .init(name: "Pasta"),
            ],
            now: now
        )
        XCTAssertFalse(match.canMake)
        XCTAssertEqual(match.missing, ["Feta cheese"])
        XCTAssertEqual(match.usesExpiringCount, 1)
        XCTAssertEqual(match.coverage, 2.0 / 3.0, accuracy: 0.001)
    }

    func testRankingPrefersCompleteThenExpiring() {
        let complete = RecipeMatch(have: ["a"], missing: [], usesExpiringCount: 0)
        let rescue = RecipeMatch(have: ["a", "b"], missing: ["c"], usesExpiringCount: 2)
        let partial = RecipeMatch(have: ["a", "b"], missing: ["c"], usesExpiringCount: 0)
        XCTAssertTrue(RecipeMatcher.isBetter(complete, than: rescue))
        XCTAssertTrue(RecipeMatcher.isBetter(rescue, than: partial))
    }
}

final class ShoppingListBuilderTests: XCTestCase {
    func testAggregatesAcrossRecipesAndSubtractsStock() {
        let planned = [
            PlannedRecipe(title: "Pancakes", requirements: [
                .init(name: "Milk", quantity: 2, unit: "cups"),
                .init(name: "Eggs", quantity: 2),
                .init(name: "Salt", quantity: 1, unit: "tsp"),
            ]),
            PlannedRecipe(title: "French Toast", requirements: [
                .init(name: "milk", quantity: 1, unit: "cups"),
                .init(name: "Bread", quantity: 8, unit: "slices"),
            ], scale: 0.5),
        ]
        let stock = [StockItem(name: "Whole milk", quantity: 1, unit: "cups")]
        let needed = ShoppingListBuilder.build(planned: planned, stock: stock)

        XCTAssertEqual(needed.map(\.name), ["Milk", "Eggs", "Bread"])
        XCTAssertEqual(needed[0].quantity, 1.5, accuracy: 0.001)
        XCTAssertEqual(needed[0].forRecipes, ["Pancakes", "French Toast"])
        XCTAssertEqual(needed[2].quantity, 4, accuracy: 0.001)
    }

    func testDifferentUnitInStockCountsAsCoveredAndListedItemsSkipped() {
        let planned = [PlannedRecipe(title: "Salad", requirements: [
            .init(name: "Tomatoes", quantity: 2, unit: "cups"),
            .init(name: "Cucumber", quantity: 1),
        ])]
        let needed = ShoppingListBuilder.build(
            planned: planned,
            stock: [StockItem(name: "tomato", quantity: 4, unit: "")],
            alreadyListed: ["cucumbers"]
        )
        XCTAssertEqual(needed, [])
    }
}

final class QuantityFormatterTests: XCTestCase {
    func testFormatting() {
        XCTAssertEqual(QuantityFormatter.string(quantity: 2, unit: "cups"), "2 cups")
        XCTAssertEqual(QuantityFormatter.string(quantity: 1.5, unit: "tbsp"), "1½ tbsp")
        XCTAssertEqual(QuantityFormatter.string(quantity: 0.25, unit: "tsp"), "¼ tsp")
        XCTAssertEqual(QuantityFormatter.string(quantity: 0, unit: "pinch"), "pinch")
        XCTAssertEqual(QuantityFormatter.string(quantity: 3, unit: ""), "3")
    }
}
