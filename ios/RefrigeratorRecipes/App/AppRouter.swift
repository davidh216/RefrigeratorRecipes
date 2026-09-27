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
    /// A Home Screen quick action waiting to be handled by `RootView`.
    @Published var quickAction: QuickAction?
    /// Asks the Shopping tab to focus its "Add an item" field.
    @Published var shoppingAddRequested = false
}

/// Shows notifications while the app is open, routes taps on the weekly check-in reminder,
/// and hands Home Screen quick actions to `AppRouter`.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    /// Installs `SceneDelegate` (for quick actions while running) and handles the
    /// quick action that launched the app, if any.
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if let item = options.shortcutItem {
            QuickAction.perform(item)
        }
        let configuration = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard response.notification.request.identifier == ExpiryNotifier.checkInIdentifier else { return }
        await MainActor.run { AppRouter.shared.checkInRequested = true }
    }
}
