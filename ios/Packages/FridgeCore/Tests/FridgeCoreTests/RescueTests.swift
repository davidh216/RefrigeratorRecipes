import XCTest
@testable import FridgeCore

final class RescueTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    lazy var now = calendar.date(from: DateComponents(year: 2026, month: 6, day: 10, hour: 17))!
    func days(_ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: now)! }

    lazy var stock: [StockItem] = [
        StockItem(name: "Baby spinach", expiresAt: days(2)),
        StockItem(name: "Chicken breasts", expiresAt: days(1)),
        StockItem(name: "Chicken breast", expiresAt: days(3)),
        StockItem(name: "Old yogurt", expiresAt: days(-2)),
        StockItem(name: "Parmesan", expiresAt: days(30)),
        StockItem(name: "Garlic", expiresAt: days(0)),
        StockItem(name: "Milk", expiresAt: days(1)),
        StockItem(name: "Rice"),
    ]

    let requirements: [IngredientRequirement] = [
        IngredientRequirement(name: "Chicken"),
        IngredientRequirement(name: "Spinach"),
        IngredientRequirement(name: "Yogurt"),
        IngredientRequirement(name: "Parmesan"),
        IngredientRequirement(name: "Rice"),
        IngredientRequirement(name: "Garlic", isOptional: true),
    ]

    func testMostUrgentFirstDeduplicatedAndOnlyExpiringSoon() {
        let items = Rescue.items(requirements: requirements, stock: stock, now: now, calendar: calendar)
        XCTAssertEqual(items, [
            RescueItem(name: "Chicken breasts", status: .expiringSoon(daysLeft: 1)),
            RescueItem(name: "Baby spinach", status: .expiringSoon(daysLeft: 2)),
        ])
    }

    func testThresholdDecidesWhatIsExpiringSoon() {
        let items = Rescue.items(requirements: requirements, stock: stock, now: now, soonThresholdDays: 1, calendar: calendar)
        XCTAssertEqual(items.map(\.name), ["Chicken breasts"])
    }

    func testTiesKeepStockOrder() {
        let tiedStock = [
            StockItem(name: "Spinach", expiresAt: days(2)),
            StockItem(name: "Chicken thighs", expiresAt: days(2)),
        ]
        let items = Rescue.items(requirements: requirements, stock: tiedStock, now: now, calendar: calendar)
        XCTAssertEqual(items.map(\.name), ["Spinach", "Chicken thighs"])
    }

    func testNothingToRescue() {
        XCTAssertEqual(Rescue.items(requirements: [], stock: stock, now: now, calendar: calendar), [])
        XCTAssertEqual(Rescue.items(requirements: requirements, stock: [], now: now, calendar: calendar), [])
        let optionalOnly = [IngredientRequirement(name: "Garlic", isOptional: true)]
        XCTAssertEqual(Rescue.items(requirements: optionalOnly, stock: stock, now: now, calendar: calendar), [])
    }
}
