import FridgeCore
import Foundation

// Freshness wording in the app's language. FridgeCore keeps its own English labels (its tests and the
// chef's prompt use them); everything a person reads goes through these instead. Compiled into the app
// and the widget, so both say the same thing.

extension ExpiryStatus {
    /// Tag text: "Today", "Tomorrow", "3 days", "2 wks", "3 mo", "2 days past", "No date".
    var localizedShort: String {
        switch self {
        case .unknown: String(localized: "No date")
        case .expired(let days): days <= 1 ? String(localized: "1 day past") : String(localized: "\(days) days past")
        case .expiringSoon(0): String(localized: "Today")
        case .expiringSoon(1): String(localized: "Tomorrow")
        case .expiringSoon(let days), .fresh(let days): Self.localizedSpan(days, short: true)
        }
    }

    /// One line: "Expires today", "Expired 3 days ago", "3 days left".
    var localizedLabel: String {
        switch self {
        case .unknown: String(localized: "No date")
        case .expired(0): String(localized: "Expired today")
        case .expired(1): String(localized: "Expired yesterday")
        case .expired(let days): String(localized: "Expired \(days) days ago")
        case .expiringSoon(0): String(localized: "Expires today")
        case .expiringSoon(1): String(localized: "Expires tomorrow")
        case .expiringSoon(let days), .fresh(let days): String(localized: "\(days) days left")
        }
    }

    /// VoiceOver phrase.
    func localizedSpoken(inFreezer: Bool = false) -> String {
        switch self {
        case .unknown: return String(localized: "No expiration date")
        case .expired(let days):
            return days <= 1 ? String(localized: "Expired yesterday") : String(localized: "Expired \(days) days ago")
        case .expiringSoon(0): return String(localized: "Expires today")
        case .expiringSoon(1): return String(localized: "Expires tomorrow")
        case .expiringSoon(let days): return String(localized: "Expires in \(days) days")
        case .fresh(let days):
            let span = Self.localizedSpan(days, short: false)
            return inFreezer ? String(localized: "Frozen, \(span) left") : String(localized: "Fresh, \(span) left")
        }
    }

    /// The dial's big value and the line under it.
    var localizedDialParts: (value: String, unit: String) {
        switch self {
        case .unknown: return ("–", String(localized: "no date"))
        case .expired(let days): return ("\(days)", days == 1 ? String(localized: "day past") : String(localized: "days past"))
        case .expiringSoon(0): return ("0", String(localized: "use today"))
        case .expiringSoon(let days), .fresh(let days):
            if days == 1 { return ("1", String(localized: "day left")) }
            if days < 14 { return ("\(days)", String(localized: "days left")) }
            if days < 60 { return ("\(days / 7)", String(localized: "weeks left")) }
            return ("\(days / 30)", String(localized: "months left"))
        }
    }

    static func localizedSpan(_ days: Int, short: Bool) -> String {
        if days == 1 { return String(localized: "1 day") }
        if days < 14 { return String(localized: "\(days) days") }
        if days < 60 {
            let weeks = days / 7
            return short ? String(localized: "\(weeks) wks") : String(localized: "\(weeks) weeks")
        }
        let months = days / 30
        return short ? String(localized: "\(months) mo") : String(localized: "\(months) months")
    }
}

extension FreshnessCounts {
    /// "2 to use today", "1 to use by tomorrow", "4 to use this week", "1 past its date", "Everything's fresh",
    /// or "Nothing here yet".
    var localizedHeadline: String {
        if total == 0 { return String(localized: "Nothing here yet") }
        if today > 0 { return String(localized: "\(today) to use today") }
        if tomorrow > 0 { return String(localized: "\(tomorrow) to use by tomorrow") }
        if soon > 0 { return String(localized: "\(soon) to use this week") }
        if past > 0 { return past == 1 ? String(localized: "1 past its date") : String(localized: "\(past) past their date") }
        return String(localized: "Everything's fresh")
    }
}
