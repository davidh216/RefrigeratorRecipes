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
    /// Opens this week's super ingredient (from its Monday notification).
    @Published var superIngredientRequested = false
    /// A Home Screen quick action waiting to be handled by `RootView`.
    @Published var quickAction: QuickAction?
    /// A recipe link to import, from a fridge://import?url=… link (e.g. an iOS Shortcut
    /// on the share sheet). The Recipes tab opens the import sheet with it.
    @Published var importLink: URL?
    /// Asks the Shopping tab to focus its "Add an item" field.
    @Published var shoppingAddRequested = false
}

/// Shows notifications while the app is open, routes taps on the weekly check-in and
/// super-ingredient reminders,
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
        let id = response.notification.request.identifier
        if id == ExpiryNotifier.checkInIdentifier {
            await MainActor.run { AppRouter.shared.checkInRequested = true }
        } else if id.hasPrefix(ExpiryNotifier.superIngredientPrefix) {
            await MainActor.run {
                AppRouter.shared.tab = .tonight
                AppRouter.shared.superIngredientRequested = true
            }
        }
    }
}
