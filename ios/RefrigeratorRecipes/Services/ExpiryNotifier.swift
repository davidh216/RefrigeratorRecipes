import Foundation
import UserNotifications
import FridgeCore

/// Schedules local "use it soon" reminders for pantry items.
///
/// iOS keeps at most 64 pending notifications per app, so this reschedules the
/// soonest ones from scratch each time the pantry changes or the app becomes
/// active.
enum ExpiryNotifier {
    private static let prefix = "expiry-"
    static let checkInIdentifier = "checkin-weekly"
    static let superIngredientPrefix = "super-ingredient-"
    /// iOS keeps 64 pending notifications per app: expiry reminders + the check-in + 2 Mondays.
    private static let maxScheduled = 57

    struct Entry {
        let id: UUID
        let name: String
        let expiresAt: Date
    }

    static func requestAuthorization() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    /// A repeating reminder for the weekly check-in, at 10 AM on `weekday` (1 = Sunday).
    static func scheduleWeeklyCheckIn(enabled: Bool, weekday: Int) async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [checkInIdentifier])
        guard enabled else { return }
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        let content = UNMutableNotificationContent()
        content.title = "Two-minute fridge check-in"
        content.body = "Tap through what's still there so your recipes and shopping list stay right."
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: 10, minute: 0, weekday: weekday), repeats: true)
        try? await center.add(UNNotificationRequest(identifier: checkInIdentifier, content: content, trigger: trigger))
    }

    /// "This week's super ingredient" on the next two Mondays at 9 AM. Each Monday gets its own
    /// notification because the ingredient changes; the app tops them up whenever it opens.
    static func scheduleSuperIngredient(enabled: Bool, now: Date = .now) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(superIngredientPrefix) })
        guard enabled, !SuperIngredients.all.isEmpty else { return }
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        let calendar = Calendar.current
        var monday = WeeklySpotlight.weekStart(for: now, calendar: calendar)
        var scheduled = 0
        while scheduled < 2 {
            guard let fireDate = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: monday) else { break }
            if fireDate > now {
                let edition = SuperIngredients.all[WeeklySpotlight.index(for: monday, count: SuperIngredients.all.count, calendar: calendar)]
                let content = UNMutableNotificationContent()
                content.title = "This week's super ingredient: \(edition.ingredient)"
                content.body = "\(edition.headline). Three recipes and tips inside."
                content.sound = .default
                let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let id = superIngredientPrefix + fireDate.formatted(.iso8601.year().month().day())
                try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
                scheduled += 1
            }
            guard let next = calendar.date(byAdding: .day, value: 7, to: monday) else { break }
            monday = next
        }
    }

    static func reschedule(_ items: [Entry], leadDays: Int, hour: Int, enabled: Bool, now: Date = .now) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
        guard enabled else { return }

        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        let calendar = Calendar.current
        let upcoming = items
            .compactMap { item -> (Entry, Date)? in
                guard let fireDay = calendar.date(byAdding: .day, value: -leadDays, to: calendar.startOfDay(for: item.expiresAt)),
                      let fireDate = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: fireDay),
                      fireDate > now else { return nil }
                return (item, fireDate)
            }
            .sorted { $0.1 < $1.1 }
            .prefix(maxScheduled)

        for (item, fireDate) in upcoming {
            let content = UNMutableNotificationContent()
            content.title = "Use it soon: \(item.name)"
            content.body = leadDays == 0
                ? "\(item.name) expires today."
                : "\(item.name) expires in \(leadDays) day\(leadDays == 1 ? "" : "s"). Ask the chef for ideas."
            content.sound = .default
            let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(identifier: prefix + item.id.uuidString, content: content, trigger: trigger)
            try? await center.add(request)
        }
    }
}
