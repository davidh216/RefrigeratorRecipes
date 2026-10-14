import Foundation

/// What the expiring-soon widget shows: the fridge's dated items. The app saves it to the
/// shared Keychain whenever the fridge changes; the widget works out "today" or "3 days" itself at each
/// midnight, so it stays right without the app. Compiled into the app and the widget.
struct WidgetSnapshot: Codable, Equatable {
    struct Item: Codable, Equatable {
        var name: String
        var expiresAt: Date
        var inFreezer: Bool
    }

    /// Dated items not yet past their date, soonest first, then the most recently expired ones (see
    /// `ordered(_:now:)`).
    var items: [Item]
    /// Items in the fridge, freezer and pantry, with or without a date.
    var totalCount: Int
    /// The user's "Use soon" setting, in days.
    var soonThresholdDays: Int

    /// Plenty for the widget's counts and rows, small enough for the Keychain.
    static let limit = 120
    /// Long-forgotten expired food mustn't crowd out what's due today, so only this many are kept.
    static let expiredLimit = 20

    /// Not yet expired soonest first, then expired most recent first, within the limits.
    static func ordered(_ items: [Item], now: Date = .now) -> [Item] {
        let today = Calendar.current.startOfDay(for: now)
        let upcoming = items.filter { $0.expiresAt >= today }.sorted { $0.expiresAt < $1.expiresAt }
        let expired = items.filter { $0.expiresAt < today }.sorted { $0.expiresAt > $1.expiresAt }
        return Array((Array(upcoming.prefix(limit - expiredLimit)) + expired.prefix(expiredLimit)).prefix(limit))
    }

    private static let service = "RefrigeratorRecipes.widget"
    private static let account = "snapshot"

    static func load() -> WidgetSnapshot? {
        SharedKeychain.data(service: service, account: account)
            .flatMap { try? JSONDecoder().decode(WidgetSnapshot.self, from: $0) }
    }

    /// For the widget: the snapshot, and whether the Keychain could be read at all. A phone that has
    /// restarted and not been unlocked yet can't read it, which isn't the same as "never opened".
    static func loadForWidget() -> (snapshot: WidgetSnapshot?, readable: Bool) {
        switch SharedKeychain.lookup(service: service, account: account) {
        case .found(let data): return (try? JSONDecoder().decode(WidgetSnapshot.self, from: data), true)
        case .notFound: return (nil, true)
        case .unavailable: return (nil, false)
        }
    }

    /// Saves it if it changed; returns whether it did, so the app only reloads the widget then.
    @discardableResult
    func save() -> Bool {
        guard self != Self.load(), let data = try? JSONEncoder().encode(self) else { return false }
        SharedKeychain.set(data, service: Self.service, account: Self.account)
        return true
    }
}
