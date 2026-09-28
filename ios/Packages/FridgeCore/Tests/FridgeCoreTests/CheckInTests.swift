import XCTest
@testable import FridgeCore

final class CheckInTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    lazy var now = calendar.date(from: DateComponents(year: 2026, month: 5, day: 20, hour: 10))!

    func daysAgo(_ n: Int) -> Date { calendar.date(byAdding: .day, value: -n, to: now)! }
    func daysAhead(_ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: now)! }

    func testQueueOrdersExpiredThenSoonThenStale() {
        let items = [
            CheckInCandidate(name: "Fresh yogurt", expiresAt: daysAhead(10), addedAt: daysAgo(2)),
            CheckInCandidate(name: "Old salsa", expiresAt: nil, addedAt: daysAgo(20)),
            CheckInCandidate(name: "Spinach", expiresAt: daysAhead(1), addedAt: daysAgo(4)),
            CheckInCandidate(name: "Milk", expiresAt: daysAgo(3), addedAt: daysAgo(10)),
            CheckInCandidate(name: "Rice", location: "pantry", addedAt: daysAgo(20)),
            CheckInCandidate(name: "Chicken", expiresAt: daysAgo(1), addedAt: daysAgo(5)),
            CheckInCandidate(name: "Peas", location: "freezer", addedAt: daysAgo(90)),
        ]
        let queue = CheckIn.queue(items, now: now, calendar: calendar)
        XCTAssertEqual(queue.map { items[$0].name }, ["Milk", "Chicken", "Spinach", "Peas", "Old salsa"])
    }

    func testRecentlyConfirmedItemsAreSkippedAndQueueIsCapped() {
        var items = [CheckInCandidate(name: "Leftovers", expiresAt: daysAgo(1), addedAt: daysAgo(6), lastConfirmedAt: daysAgo(2))]
        items += (0..<30).map { CheckInCandidate(name: "Item \($0)", expiresAt: daysAhead(1), addedAt: daysAgo(3)) }
        let queue = CheckIn.queue(items, now: now, limit: 15, calendar: calendar)
        XCTAssertEqual(queue.count, 15)
        XCTAssertFalse(queue.contains(0))
    }

    func testConfirmationResetsStaleness() {
        let items = [CheckInCandidate(name: "Ketchup", addedAt: daysAgo(40), lastConfirmedAt: daysAgo(8))]
        XCTAssertEqual(CheckIn.queue(items, now: now, calendar: calendar), [])
    }

    func testIsDueWeekly() {
        XCTAssertTrue(CheckIn.isDue(lastCheckInAt: nil, now: now, calendar: calendar))
        XCTAssertFalse(CheckIn.isDue(lastCheckInAt: daysAgo(6), now: now, calendar: calendar))
        XCTAssertTrue(CheckIn.isDue(lastCheckInAt: daysAgo(7), now: now, calendar: calendar))
    }

    func testWasteSummary() {
        let outcomes = [
            FoodOutcome(kind: .used, date: daysAgo(1)),
            FoodOutcome(kind: .tossed, date: daysAgo(2), value: 3.49),
            FoodOutcome(kind: .tossed, date: daysAgo(3)),
            FoodOutcome(kind: .used, date: daysAgo(4)),
            FoodOutcome(kind: .tossed, date: daysAgo(40), value: 10),
        ]
        let summary = WasteSummary.summarize(outcomes, since: daysAgo(30))
        XCTAssertEqual(summary.usedCount, 2)
        XCTAssertEqual(summary.tossedCount, 2)
        XCTAssertEqual(summary.tossedValue, 3.49, accuracy: 0.001)
        XCTAssertEqual(summary.wasteRate!, 0.5, accuracy: 0.001)
        XCTAssertNil(WasteSummary.summarize([], since: now).wasteRate)
    }
}
