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

    func testRejectsLooseDateForms() {
        for text in ["2026-1-012", "2026--1-01", "+026-01-01", "2026-01-1 ", "２０２６-01-01"] {
            XCTAssertFalse(MenuWindow.isFullDay(text), text)
        }
        for text in ["+1-01", "1-012", "11-2", "-11-26"] {
            XCTAssertFalse(MenuWindow.isYearlyDay(text), text)
        }
    }

    func testWeeklySkipsAMissingMenuWithoutShiftingTheOthers() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let monday = calendar.date(from: DateComponents(year: 2026, month: 1, day: 5, hour: 12))!
        let rotation = ["a", "b", "c"]
        func week(_ n: Int) -> Date { calendar.date(byAdding: .day, value: 7 * n, to: monday)! }
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: week(0), calendar: calendar) { $0 != "a" }, "b")
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: week(1), calendar: calendar) { $0 != "a" }, "b")
        XCTAssertEqual(MenuSchedule.weekly(rotation, for: week(2), calendar: calendar) { $0 != "a" }, "c")
        XCTAssertNil(MenuSchedule.weekly(rotation, for: week(2), calendar: calendar) { _ in false })
    }
}
