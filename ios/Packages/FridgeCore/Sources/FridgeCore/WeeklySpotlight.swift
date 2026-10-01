import Foundation

/// Which "super ingredient of the week" is showing. Editions rotate one per calendar week
/// (weeks start on Monday), in the order they're listed, and repeat when they run out.
public enum WeeklySpotlight {
    /// Index of this week's edition out of `count`.
    public static func index(for date: Date, count: Int, calendar: Calendar = .current) -> Int {
        guard count > 0 else { return 0 }
        let weeks = weekNumber(for: date, calendar: calendar)
        return ((weeks % count) + count) % count
    }

    /// Whole weeks since the first week of the rotation, Monday 5 January 2026 (negative before it).
    public static func weekNumber(for date: Date, calendar: Calendar = .current) -> Int {
        var cal = calendar
        cal.firstWeekday = 2 // Monday
        guard let start = cal.date(from: DateComponents(year: 2026, month: 1, day: 5)) else { return 0 }
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: start), to: cal.startOfDay(for: date)).day ?? 0
        return days >= 0 ? days / 7 : -((-days + 6) / 7)
    }

    /// The Monday that starts `date`'s week, for "Week of 5 October".
    public static func weekStart(for date: Date, calendar: Calendar = .current) -> Date {
        var cal = calendar
        cal.firstWeekday = 2
        return cal.dateInterval(of: .weekOfYear, for: date)?.start ?? cal.startOfDay(for: date)
    }
}
