import Foundation

/// When a menu is "in season" (HANDOFF-cuisines-languages-moods.md §3).
///
/// A window is either two full dates ("2027-01-30" to "2027-02-13", for holidays whose date moves)
/// or two yearly dates ("11-16" to "11-26", for fixed ones). A yearly window can wrap the new year
/// ("12-26" to "01-02"). Both ends are included.
public struct MenuWindow: Equatable, Sendable {
    public let from: String
    public let to: String
    public let isYearly: Bool

    /// nil when the dates aren't valid, mix the two forms, or a full-date window ends before it starts.
    public init?(from: String, to: String) {
        let yearly = MenuWindow.isYearlyDay(from) && MenuWindow.isYearlyDay(to)
        let full = MenuWindow.isFullDay(from) && MenuWindow.isFullDay(to)
        guard yearly || full else { return nil }
        if full && from > to { return nil }
        self.from = from
        self.to = to
        self.isYearly = yearly
    }

    public func contains(_ date: Date, calendar: Calendar = .current) -> Bool {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        let monthDay = String(format: "%02d-%02d", parts.month ?? 0, parts.day ?? 0)
        if isYearly {
            return from <= to ? (from...to).contains(monthDay) : (monthDay >= from || monthDay <= to)
        }
        let day = String(format: "%04d-", parts.year ?? 0) + monthDay
        return (from...to).contains(day)
    }

    /// "2026-11-26": a real calendar date.
    public static func isFullDay(_ text: String) -> Bool {
        let parts = text.split(separator: "-")
        guard text.count == 10, parts.count == 3, parts[0].count == 4, let year = Int(parts[0]) else { return false }
        return isValid(month: Int(parts[1]), day: Int(parts[2]), year: year)
    }

    /// "11-26": a month and day that exist in some year (02-29 is allowed).
    public static func isYearlyDay(_ text: String) -> Bool {
        let parts = text.split(separator: "-")
        guard text.count == 5, parts.count == 2 else { return false }
        return isValid(month: Int(parts[0]), day: Int(parts[1]), year: 2028)
    }

    private static func isValid(month: Int?, day: Int?, year: Int) -> Bool {
        guard let month, let day, (1...12).contains(month), day >= 1 else { return false }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        guard let first = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
              let days = calendar.range(of: .day, in: .month, for: first) else { return false }
        return days.contains(day)
    }
}

public enum MenuSchedule {
    /// This week's menu from a rotation of menu ids, changing on Mondays like the super ingredient.
    public static func weekly(_ rotation: [String], for date: Date = .now, calendar: Calendar = .current) -> String? {
        guard !rotation.isEmpty else { return nil }
        return rotation[WeeklySpotlight.index(for: date, count: rotation.count, calendar: calendar)]
    }
}
