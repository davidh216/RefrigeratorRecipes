import Foundation

public enum ExpiryStatus: Equatable, Sendable {
    case unknown
    case expired(daysAgo: Int)
    case expiringSoon(daysLeft: Int)
    case fresh(daysLeft: Int)

    /// Sort key: most urgent first, unknown last.
    public var urgency: Int {
        switch self {
        case .expired(let d): return -1000 - d
        case .expiringSoon(let d), .fresh(let d): return d
        case .unknown: return Int.max
        }
    }

    public var label: String {
        switch self {
        case .unknown: return "No date"
        case .expired(0): return "Expired today"
        case .expired(1): return "Expired yesterday"
        case .expired(let d): return "Expired \(d)d ago"
        case .expiringSoon(0): return "Expires today"
        case .expiringSoon(1): return "Expires tomorrow"
        case .expiringSoon(let d), .fresh(let d): return "\(d)d left"
        }
    }

    public var isUrgent: Bool {
        switch self {
        case .expired, .expiringSoon: return true
        default: return false
        }
    }

    /// Computes status by whole calendar days, so something expiring at any time
    /// today is "today" regardless of the current hour.
    public static func of(
        expiresAt: Date?,
        now: Date = .now,
        soonThresholdDays: Int = 3,
        calendar: Calendar = .current
    ) -> ExpiryStatus {
        guard let expiresAt else { return .unknown }
        let start = calendar.startOfDay(for: now)
        let end = calendar.startOfDay(for: expiresAt)
        let days = calendar.dateComponents([.day], from: start, to: end).day ?? 0
        if days < 0 { return .expired(daysAgo: -days) }
        if days <= soonThresholdDays { return .expiringSoon(daysLeft: days) }
        return .fresh(daysLeft: days)
    }
}
