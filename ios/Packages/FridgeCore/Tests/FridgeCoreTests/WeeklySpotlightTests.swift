import XCTest
@testable import FridgeCore

final class WeeklySpotlightTests: XCTestCase {
    private var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/New_York")!
        return cal
    }

    private func date(_ y: Int, _ m: Int, _ d: Int, hour: Int = 12) -> Date {
        calendar.date(from: DateComponents(year: y, month: m, day: d, hour: hour))!
    }

    func testFirstWeekIsEditionZeroAllWeek() {
        for day in 5...11 {
            XCTAssertEqual(WeeklySpotlight.index(for: date(2026, 1, day), count: 13, calendar: calendar), 0, "Jan \(day)")
        }
        XCTAssertEqual(WeeklySpotlight.index(for: date(2026, 1, 12), count: 13, calendar: calendar), 1)
    }

    func testChangesOnMondayNotSunday() {
        // Sunday 4 Oct 2026 and Monday 5 Oct 2026 are in different weeks.
        let sunday = WeeklySpotlight.weekNumber(for: date(2026, 10, 4, hour: 23), calendar: calendar)
        let monday = WeeklySpotlight.weekNumber(for: date(2026, 10, 5, hour: 0), calendar: calendar)
        XCTAssertEqual(monday, sunday + 1)
    }

    func testWrapsAroundAndHandlesDatesBeforeTheStart() {
        XCTAssertEqual(WeeklySpotlight.index(for: date(2026, 4, 6), count: 13, calendar: calendar), 0) // week 13
        XCTAssertEqual(WeeklySpotlight.index(for: date(2026, 1, 1), count: 13, calendar: calendar), 12) // week -1
        XCTAssertEqual(WeeklySpotlight.index(for: date(2026, 1, 1), count: 0, calendar: calendar), 0)
    }

    func testWeekStartIsMonday() {
        let start = WeeklySpotlight.weekStart(for: date(2026, 10, 1), calendar: calendar)
        XCTAssertEqual(calendar.component(.weekday, from: start), 2)
        XCTAssertEqual(calendar.component(.day, from: start), 28)
    }
}
