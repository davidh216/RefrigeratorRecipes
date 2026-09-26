import Foundation

/// What the weekly check-in needs to know about a pantry item.
public struct CheckInCandidate: Equatable, Sendable {
    public var name: String
    /// "fridge", "freezer" or "pantry".
    public var location: String
    public var expiresAt: Date?
    public var addedAt: Date
    /// Last time the user confirmed it's still there.
    public var lastConfirmedAt: Date?

    public init(name: String, location: String = "fridge", expiresAt: Date? = nil, addedAt: Date, lastConfirmedAt: Date? = nil) {
        self.name = name
        self.location = location
        self.expiresAt = expiresAt
        self.addedAt = addedAt
        self.lastConfirmedAt = lastConfirmedAt
    }
}

public enum CheckIn {
    /// Days after which an untouched item is worth asking about, by location.
    public static func staleAfterDays(location: String) -> Int {
        switch location {
        case "freezer": return 60
        case "pantry": return 30
        default: return 14
        }
    }

    /// Items confirmed this recently aren't asked about again.
    public static let recentlyConfirmedDays = 5

    /// Indexes of the items to ask about, most important first: expired, then
    /// expiring soon, then items nobody has touched in a while. Capped at `limit`
    /// so a check-in stays around two minutes.
    public static func queue(
        _ items: [CheckInCandidate],
        now: Date = .now,
        soonThresholdDays: Int = 3,
        limit: Int = 15,
        calendar: Calendar = .current
    ) -> [Int] {
        func days(since date: Date) -> Int {
            calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: now)).day ?? 0
        }

        var ranked: [(index: Int, tier: Int, key: Int)] = []
        for (index, item) in items.enumerated() {
            if let confirmed = item.lastConfirmedAt, days(since: confirmed) < recentlyConfirmedDays { continue }
            let status = ExpiryStatus.of(expiresAt: item.expiresAt, now: now, soonThresholdDays: soonThresholdDays, calendar: calendar)
            let untouchedDays = days(since: item.lastConfirmedAt ?? item.addedAt)
            switch status {
            case .expired(let ago):
                ranked.append((index, 0, -ago))
            case .expiringSoon(let left):
                ranked.append((index, 1, left))
            default:
                if untouchedDays >= staleAfterDays(location: item.location) {
                    ranked.append((index, 2, -untouchedDays))
                }
            }
        }
        return ranked
            .sorted { ($0.tier, $0.key, $0.index) < ($1.tier, $1.key, $1.index) }
            .prefix(limit)
            .map(\.index)
    }

    /// Whether it's time to prompt for a check-in.
    public static func isDue(lastCheckInAt: Date?, now: Date = .now, intervalDays: Int = 7, calendar: Calendar = .current) -> Bool {
        guard let lastCheckInAt else { return true }
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: lastCheckInAt), to: calendar.startOfDay(for: now)).day ?? 0
        return days >= intervalDays
    }
}

/// A record of food leaving the kitchen, for waste tracking.
public struct FoodOutcome: Equatable, Sendable {
    public enum Kind: String, Sendable { case used, tossed }
    public var kind: Kind
    public var date: Date
    /// What it cost, when known.
    public var value: Double?

    public init(kind: Kind, date: Date, value: Double? = nil) {
        self.kind = kind
        self.date = date
        self.value = value
    }
}

public struct WasteSummary: Equatable, Sendable {
    public var usedCount: Int
    public var tossedCount: Int
    /// Sum of known prices of tossed items.
    public var tossedValue: Double
    /// Share of items that were tossed rather than used; nil with no data.
    public var wasteRate: Double? {
        let total = usedCount + tossedCount
        return total == 0 ? nil : Double(tossedCount) / Double(total)
    }

    public static func summarize(_ outcomes: [FoodOutcome], since: Date) -> WasteSummary {
        let recent = outcomes.filter { $0.date >= since }
        let tossed = recent.filter { $0.kind == .tossed }
        return WasteSummary(
            usedCount: recent.count - tossed.count,
            tossedCount: tossed.count,
            tossedValue: tossed.compactMap(\.value).reduce(0, +)
        )
    }
}
