import Foundation

/// What the expiring-soon widget shows: the fridge's dated items, soonest first. The app saves it to the
/// shared Keychain whenever the fridge changes; the widget works out "today" or "3 days" itself at each
/// midnight, so it stays right without the app. Compiled into the app and the widget.
struct WidgetSnapshot: Codable, Equatable {
    struct Item: Codable, Equatable {
        var name: String
        var expiresAt: Date
        var inFreezer: Bool
    }

    /// Dated items, soonest first; at most `limit`.
    var items: [Item]
    /// Items in the fridge, freezer and pantry, with or without a date.
    var totalCount: Int
    /// The user's "Use soon" setting, in days.
    var soonThresholdDays: Int

    static let limit = 12

    private static let service = "RefrigeratorRecipes.widget"
    private static let account = "snapshot"

    static func load() -> WidgetSnapshot? {
        SharedKeychain.data(service: service, account: account)
            .flatMap { try? JSONDecoder().decode(WidgetSnapshot.self, from: $0) }
    }

    /// Saves it if it changed; returns whether it did, so the app only reloads the widget then.
    @discardableResult
    func save() -> Bool {
        guard self != Self.load(), let data = try? JSONEncoder().encode(self) else { return false }
        SharedKeychain.set(data, service: Self.service, account: Self.account)
        return true
    }
}
