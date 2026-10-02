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
        guard let parts = digitGroups(text, lengths: [4, 2, 2]) else { return false }
        return isValid(month: parts[1], day: parts[2], year: parts[0])
    }

    /// "11-26": a month and day that exist in some year (02-29 is allowed).
    public static func isYearlyDay(_ text: String) -> Bool {
        guard let parts = digitGroups(text, lengths: [2, 2]) else { return false }
        return isValid(month: parts[0], day: parts[1], year: 2028)
    }

    /// The numbers in "dddd-dd-dd"-style text, only when every group is exactly that many ASCII digits,
    /// so the dates also compare correctly as text.
    private static func digitGroups(_ text: String, lengths: [Int]) -> [Int]? {
        let groups = text.split(separator: "-", omittingEmptySubsequences: false)
        guard groups.count == lengths.count else { return nil }
        var numbers: [Int] = []
        for (group, length) in zip(groups, lengths) {
            guard group.count == length, group.allSatisfy({ $0.isASCII && $0.isNumber }), let number = Int(group) else { return nil }
            numbers.append(number)
        }
        return numbers
    }

    private static func isValid(month: Int, day: Int, year: Int) -> Bool {
        guard (1...12).contains(month), day >= 1 else { return false }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        guard let first = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
              let days = calendar.range(of: .day, in: .month, for: first) else { return false }
        return days.contains(day)
    }
}

public enum MenuSchedule {
    /// This week's menu from a rotation of menu ids, changing on Mondays like the super ingredient.
    /// When that week's menu isn't available (`isAvailable` is false), the next one in the rotation
    /// stands in, so one missing menu doesn't shift every other week.
    public static func weekly(_ rotation: [String], for date: Date = .now, calendar: Calendar = .current,
                              isAvailable: (String) -> Bool = { _ in true }) -> String? {
        guard !rotation.isEmpty else { return nil }
        let start = WeeklySpotlight.index(for: date, count: rotation.count, calendar: calendar)
        for step in 0..<rotation.count {
            let id = rotation[(start + step) % rotation.count]
            if isAvailable(id) { return id }
        }
        return nil
    }
}
