import SwiftUI
import UserNotifications

/// App-wide navigation requests that come from outside a view, like tapping a notification.
@MainActor
final class AppRouter: ObservableObject {
    static let shared = AppRouter()
    @Published var checkInRequested = false
}

/// Shows notifications while the app is open and routes taps on the weekly check-in reminder.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard response.notification.request.identifier == ExpiryNotifier.checkInIdentifier else { return }
        await MainActor.run { AppRouter.shared.checkInRequested = true }
    }
}
