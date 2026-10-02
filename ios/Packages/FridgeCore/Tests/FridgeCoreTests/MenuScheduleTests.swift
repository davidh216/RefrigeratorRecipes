import XCTest
@testable import FridgeCore

final class MenuScheduleTests: XCTestCase {
    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    private func day(_ y: Int, _ m: Int, _ d: Int) -> Date {
        calendar.date(from: DateComponents(year: y, month: m, day: d, hour: 12))!
    }

    func testFullDateWindowIncludesBothEnds() {
        let lunarNewYear = MenuWindow(from: "2027-01-30", to: "2027-02-13")!
        XCTAssertFalse(lunarNewYear.isYearly)
        XCTAssertTrue(lunarNewYear.contains(day(2027, 1, 30), calendar: calendar))
        XCTAssertTrue(lunarNewYear.contains(day(2027, 2, 13), calendar: calendar))
        XCTAssertFalse(lunarNewYear.contains(day(2027, 2, 14), calendar: calendar))
        XCTAssertFalse(lunarNewYear.contains(day(2028, 2, 1), calendar: calendar))
    }

    func testYearlyWindowRepeatsAndCanWrapTheNewYear() {
        let thanksgiving = MenuWindow(from: "11-16", to: "11-26")!
        XCTAssertTrue(thanksgiving.isYearly)
        XCTAssertTrue(thanksgiving.contains(day(2026, 11, 20), calendar: calendar))
        XCTAssertTrue(thanksgiving.contains(day(2031, 11, 16), calendar: calendar))
        XCTAssertFalse(thanksgiving.contains(day(2026, 11, 27), calendar: calendar))

        let newYear = MenuWindow(from: "12-26", to: "01-02")!
        XCTAssertTrue(newYear.contains(day(2026, 12, 31), calendar: calendar))
        XCTAssertTrue(newYear.contains(day(2027, 1, 2), calendar: calendar))
        XCTAssertFalse(newYear.contains(day(2027, 1, 3), calendar: calendar))
        XCTAssertFalse(newYear.contains(day(2026, 12, 25), calendar: calendar))
    }

    func testRejectsBadWindows() {
        XCTAssertNil(MenuWindow(from: "2026-11-30", to: "2026-11-01"), "ends before it starts")
        XCTAssertNil(MenuWindow(from: "11-16", to: "2026-11-26"), "mixed forms")
        XCTAssertNil(MenuWindow(from: "2026-02-30", to: "2026-03-01"), "no 30 February")
        XCTAssertNil(MenuWindow(from: "13-01", to: "13-02"))
        XCTAssertNil(MenuWindow(from: "", to: ""))
        XCTAssertNotNil(MenuWindow(from: "02-29", to: "03-01"))
    }

    func testWeeklyRotationChangesOnMondays() {
        let rotation = ["taco-tuesday", "meatless-monday", "sheet-pan-week"]
        // Monday 5 January 2026 is week 0 of the rotation.
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: day(2026, 1, 5), calendar: calendar), "taco-tuesday")
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: day(2026, 1, 11), calendar: calendar), "taco-tuesday")
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: day(2026, 1, 12), calendar: calendar), "meatless-monday")
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: day(2026, 1, 26), calendar: calendar), "taco-tuesday")
        XCTAssertNil(MenuSchedule.weekly([], calendar: calendar))
    }
}
