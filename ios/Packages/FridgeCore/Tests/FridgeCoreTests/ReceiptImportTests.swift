import XCTest
@testable import FridgeCore

final class ReceiptImportTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    func date(_ y: Int, _ m: Int, _ d: Int) -> Date {
        calendar.date(from: DateComponents(year: y, month: m, day: d, hour: 15))!
    }

    func testDropsNonFoodAndMergesRepeatedLines() {
        let items = ReceiptImport.items(from: [
            .init(rawText: "BANANAS", name: "bananas", quantity: 3, price: 0.87, category: "produce", location: "pantry", shelfLifeDays: 6),
            .init(rawText: "PAPER TOWELS", name: "Paper towels", price: 7.99, isFood: false),
            .init(rawText: "ORG BNLS CHKN BRST", name: "chicken breast", quantity: 1.4, unit: "lb", price: 8.12, category: "meat", location: "fridge", shelfLifeDays: 2),
            .init(rawText: "BANANAS", name: "Banana", quantity: 2, price: 0.58, category: "produce", location: "pantry", shelfLifeDays: 5),
            .init(rawText: "", name: "  ", quantity: 1),
        ])

        XCTAssertEqual(items.map(\.name), ["Bananas", "Chicken breast"])
        XCTAssertEqual(items[0].quantity, 5)
        XCTAssertEqual(items[0].price ?? 0, 1.45, accuracy: 0.001)
        XCTAssertEqual(items[0].shelfLifeDays, 5)
        XCTAssertEqual(items[0].rawLines, ["BANANAS", "BANANAS"])
        XCTAssertEqual(items[1].unit, "lb")
    }

    func testShelfStableItemsHaveNoExpiryAndBadLocationsFallBackToFridge() {
        let items = ReceiptImport.items(from: [
            .init(name: "Sea salt", location: "pantry", shelfLifeDays: 0),
            .init(name: "Yogurt", location: "counter", shelfLifeDays: 14),
        ])
        XCTAssertNil(items[0].shelfLifeDays)
        XCTAssertNil(items[0].expiresAt(purchasedAt: date(2026, 3, 1), calendar: calendar))
        XCTAssertEqual(items[1].location, "fridge")
        XCTAssertEqual(
            items[1].expiresAt(purchasedAt: date(2026, 3, 1), calendar: calendar),
            calendar.date(from: DateComponents(year: 2026, month: 3, day: 15))
        )
    }

    func testPurchaseDateRejectsFutureAndStaleDates() {
        let now = date(2026, 3, 10)
        XCTAssertEqual(ReceiptImport.purchaseDate(from: "2026-03-08", now: now, calendar: calendar),
                       calendar.date(from: DateComponents(year: 2026, month: 3, day: 8)))
        XCTAssertEqual(ReceiptImport.purchaseDate(from: "2026-03-12", now: now, calendar: calendar), now)
        XCTAssertEqual(ReceiptImport.purchaseDate(from: "2025-01-02", now: now, calendar: calendar), now)
        XCTAssertEqual(ReceiptImport.purchaseDate(from: "03/08/2026", now: now, calendar: calendar), now)
        XCTAssertEqual(ReceiptImport.purchaseDate(from: nil, now: now, calendar: calendar), now)
    }

    func testFindsShoppingListEntriesTheReceiptCovers() {
        let items = ReceiptImport.items(from: [
            .init(name: "Whole milk", unit: "gal"),
            .init(name: "Large eggs", quantity: 12),
        ])
        let indexes = ReceiptImport.purchasedShoppingIndexes(purchased: items.map(\.name), shoppingList: ["Eggs", "Coffee beans", "milk"])
        XCTAssertEqual(indexes, [0, 2])
    }
}
