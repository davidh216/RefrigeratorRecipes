import Foundation

/// The heat scale: how urgently something needs using, as the app draws it.
/// Derived from `ExpiryStatus` plus whether the item is in the freezer.
public enum FreshTone: String, CaseIterable, Sendable {
    case past, today, soon, fresh, paused, none
}

extension ExpiryStatus {
    /// Freezer items that are not urgent are "paused"; urgent ones stay on the normal ladder.
    public func tone(inFreezer: Bool = false) -> FreshTone {
        switch self {
        case .unknown: return .none
        case .expired: return .past
        case .expiringSoon(let d): return d <= 1 ? .today : .soon
        case .fresh: return inFreezer ? .paused : .fresh
        }
    }

    /// Visible tag text: "Today", "Tomorrow", "3 days", "2 wks", "3 mo", "2 days past", "No date".
    public var shortLabel: String {
        switch self {
        case .unknown: return "No date"
        case .expired(let d): return d <= 1 ? "1 day past" : "\(d) days past"
        case .expiringSoon(0): return "Today"
        case .expiringSoon(1): return "Tomorrow"
        case .expiringSoon(let d), .fresh(let d): return Self.span(d, short: true)
        }
    }

    /// VoiceOver phrase.
    public func spokenLabel(inFreezer: Bool = false) -> String {
        switch self {
        case .unknown: return "No expiration date"
        case .expired(let d): return d <= 1 ? "Expired yesterday" : "Expired \(d) days ago"
        case .expiringSoon(0): return "Expires today"
        case .expiringSoon(1): return "Expires tomorrow"
        case .expiringSoon(let d): return "Expires in \(d) days"
        case .fresh(let d): return (inFreezer ? "Frozen, " : "Fresh, ") + Self.span(d, short: false) + " left"
        }
    }

    /// 14-day kitchen-timer arc. Today = a nub, past/unknown = no arc.
    public var dialFraction: Double {
        switch self {
        case .unknown, .expired: return 0
        case .expiringSoon(let d), .fresh(let d): return d <= 0 ? 0.04 : min(Double(d) / 14, 1)
        }
    }

    /// Dial center: big value and a unit line.
    public var dialParts: (value: String, unit: String) {
        switch self {
        case .unknown: return ("–", "no date")
        case .expired(let d): return ("\(d)", d == 1 ? "day past" : "days past")
        case .expiringSoon(0): return ("0", "use today")
        case .expiringSoon(let d), .fresh(let d):
            if d == 1 { return ("1", "day left") }
            if d < 14 { return ("\(d)", "days left") }
            if d < 60 { return ("\(d / 7)", "weeks left") }
            return ("\(d / 30)", "months left")
        }
    }

    static func span(_ d: Int, short: Bool) -> String {
        if d == 1 { return "1 day" }
        if d < 14 { return "\(d) days" }
        if d < 60 { return short ? "\(d / 7) wks" : "\(d / 7) weeks" }
        return short ? "\(d / 30) mo" : "\(d / 30) months"
    }
}

/// Counts for the Fridge freshness strip and the Tonight date line.
public struct FreshnessCounts: Equatable, Sendable {
    public var past = 0, today = 0, tomorrow = 0, soon = 0, fresh = 0, paused = 0, noDate = 0

    public init() {}

    public init(_ items: [(status: ExpiryStatus, inFreezer: Bool)]) {
        for item in items { add(item.status, inFreezer: item.inFreezer) }
    }

    /// `.expiringSoon(0)` counts as today, `.expiringSoon(1)` as tomorrow.
    public mutating func add(_ status: ExpiryStatus, inFreezer: Bool) {
        switch status {
        case .unknown: noDate += 1
        case .expired: past += 1
        case .expiringSoon(let d):
            if d <= 0 { today += 1 } else if d == 1 { tomorrow += 1 } else { soon += 1 }
        case .fresh:
            if inFreezer { paused += 1 } else { fresh += 1 }
        }
    }

    public var byTomorrow: Int { today + tomorrow }
    public var total: Int { past + today + tomorrow + soon + fresh + paused + noDate }

    /// `.today` returns `byTomorrow`; `.none` returns `noDate`.
    public func count(for tone: FreshTone) -> Int {
        switch tone {
        case .past: return past
        case .today: return byTomorrow
        case .soon: return soon
        case .fresh: return fresh
        case .paused: return paused
        case .none: return noDate
        }
    }

    /// "2 to use today", "1 to use by tomorrow", "4 to use this week",
    /// "1 past its date" / "3 past their date", "Everything's fresh",
    /// or "Nothing here yet" when there is nothing at all.
    public var headline: String {
        if total == 0 { return "Nothing here yet" }
        if today > 0 { return "\(today) to use today" }
        if tomorrow > 0 { return "\(tomorrow) to use by tomorrow" }
        if soon > 0 { return "\(soon) to use this week" }
        if past > 0 { return past == 1 ? "1 past its date" : "\(past) past their date" }
        return "Everything's fresh"
    }

    /// "Freshness: 1 past date, 2 by tomorrow, 4 this week, 23 fresh, 3 frozen, 2 no date".
    /// Zero buckets are omitted.
    public var spokenSummary: String {
        let parts: [(Int, String)] = [
            (past, "past date"),
            (byTomorrow, "by tomorrow"),
            (soon, "this week"),
            (fresh, "fresh"),
            (paused, "frozen"),
            (noDate, "no date"),
        ]
        let spoken = parts.filter { $0.0 > 0 }.map { "\($0.0) \($0.1)" }
        if spoken.isEmpty { return "Freshness: nothing here yet" }
        return "Freshness: " + spoken.joined(separator: ", ")
    }
}
