import XCTest
@testable import FridgeCore

final class KitchenUnitTests: XCTestCase {
    func testCanonicalNames() {
        XCTAssertEqual(KitchenUnit.canonical("Tablespoons."), "tbsp")
        XCTAssertEqual(KitchenUnit.canonical("cups"), "cup")
        XCTAssertEqual(KitchenUnit.canonical("lbs"), "lb")
        XCTAssertEqual(KitchenUnit.canonical("pieces"), "")
        XCTAssertEqual(KitchenUnit.canonical("bags"), "bag")
        XCTAssertEqual(KitchenUnit.canonical("fl oz"), "fl oz")
    }

    func testConversions() {
        XCTAssertEqual(KitchenUnit.convert(3, from: "tsp", to: "tbsp")!, 1, accuracy: 0.01)
        XCTAssertEqual(KitchenUnit.convert(16, from: "oz", to: "lb")!, 1, accuracy: 0.01)
        XCTAssertEqual(KitchenUnit.convert(1, from: "dozen", to: "")!, 12, accuracy: 0.001)
        XCTAssertEqual(KitchenUnit.convert(2, from: "bag", to: "bags"), 2)
        XCTAssertNil(KitchenUnit.convert(1, from: "cup", to: "lb"))
        XCTAssertNil(KitchenUnit.convert(1, from: "bunch", to: ""))
    }
}

final class CookPlannerTests: XCTestCase {
    let soon = Date(timeIntervalSince1970: 1_800_000_000)
    var later: Date { soon.addingTimeInterval(86_400 * 10) }

    func testReducesConvertsAndRemoves() {
        let stock = [
            StockItem(name: "Milk", quantity: 4, unit: "cups"),
            StockItem(name: "Eggs", quantity: 2),
            StockItem(name: "Butter", quantity: 1, unit: "lb"),
            StockItem(name: "Salt", quantity: 1, unit: "box"),
        ]
        let result = CookPlanner.deductions(
            requirements: [
                .init(name: "Milk", quantity: 1.75, unit: "cups"),
                .init(name: "Eggs", quantity: 2),
                .init(name: "Butter", quantity: 4, unit: "tbsp"),
                .init(name: "Salt", quantity: 1, unit: "tsp"),
                .init(name: "Chives", quantity: 1, unit: "tbsp", isOptional: true),
            ],
            stock: stock
        )
        XCTAssertEqual(result.map(\.stockIndex), [0, 1, 2])
        XCTAssertEqual(result[0].change, .reduce(to: 2.25))
        XCTAssertEqual(result[0].neededText, "1¾ cups")
        XCTAssertEqual(result[1].change, .remove)
        // Butter by volume vs. by weight can't be compared.
        XCTAssertEqual(result[2].change, .unknown)
    }

    func testScalesAndUsesSoonestExpiringLotFirst() {
        let stock = [
            StockItem(name: "Chicken breast", quantity: 2, unit: "lb", expiresAt: later),
            StockItem(name: "chicken", quantity: 1, unit: "lb", expiresAt: soon),
        ]
        let result = CookPlanner.deductions(
            requirements: [.init(name: "Chicken", quantity: 1, unit: "lb")],
            scale: 2,
            stock: stock
        )
        // 2 lb needed: the 1 lb lot expiring soon is used up, then 1 lb from the other.
        XCTAssertEqual(result.map(\.stockIndex), [1, 0])
        XCTAssertEqual(result[0].change, .remove)
        XCTAssertEqual(result[1].change, .reduce(to: 1))
    }

    func testUnmeasuredIngredientsAndUnknownAmountsAskTheUser() {
        let stock = [
            StockItem(name: "Baby spinach", quantity: 1, unit: "bag"),
            StockItem(name: "Garlic", quantity: 0, unit: ""),
            StockItem(name: "Eggs", quantity: 1, unit: "dozen"),
        ]
        let result = CookPlanner.deductions(
            requirements: [
                .init(name: "Spinach", quantity: 2, unit: "cups"),
                .init(name: "Garlic", quantity: 3, unit: "cloves"),
                .init(name: "Eggs", quantity: 3),
                .init(name: "Parsley", quantity: 0),
            ],
            stock: stock
        )
        XCTAssertEqual(result.map(\.change), [.unknown, .unknown, .reduce(to: 0.75)])
    }

    func testTwoIngredientsDrawingOnOneItemCombine() {
        let result = CookPlanner.deductions(
            requirements: [
                .init(name: "Sugar", quantity: 0.5, unit: "cup"),
                .init(name: "Sugar", quantity: 0.5, unit: "cup"),
            ],
            stock: [StockItem(name: "Sugar", quantity: 1, unit: "cup")]
        )
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].change, .remove)
        XCTAssertEqual(result[0].neededText, "½ cup + ½ cup")
    }
}
