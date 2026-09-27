import SwiftUI
import UserNotifications

/// The five root tabs. Any screen can switch tabs with `AppRouter.shared.tab = .fridge`.
enum AppTab: Hashable {
    case tonight, fridge, recipes, plan, shopping
}

/// App-wide navigation requests that come from outside a view, like tapping a notification.
@MainActor
final class AppRouter: ObservableObject {
    static let shared = AppRouter()
    /// The selected root tab. `RootView`'s `TabView` is bound to it.
    @Published var tab: AppTab = .tonight
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
