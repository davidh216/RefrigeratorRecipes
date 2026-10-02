import UIKit

/// Home Screen quick actions (long-press the app icon).
///
/// They are dynamic so the subtitles stay live ("3 to use by tomorrow"); `RootView`
/// republishes them whenever the pantry or shopping list changes. iOS shows at most four.
enum QuickAction: String, CaseIterable {
    case scanReceipt = "com.davidh216.RefrigeratorRecipes.scanReceipt"
    case tonight = "com.davidh216.RefrigeratorRecipes.tonight"
    case addToShopping = "com.davidh216.RefrigeratorRecipes.addToShopping"
    case checkIn = "com.davidh216.RefrigeratorRecipes.checkIn"

    /// The live numbers behind the subtitles.
    struct Snapshot: Equatable {
        var useByTomorrow = 0
        var toBuy = 0
        var toCheck = 0
    }

    /// In display order: the first sits closest to the icon.
    @MainActor
    static func publish(_ snapshot: Snapshot) {
        UIApplication.shared.shortcutItems = allCases.map { $0.shortcutItem(snapshot) }
    }

    private func shortcutItem(_ snapshot: Snapshot) -> UIApplicationShortcutItem {
        UIApplicationShortcutItem(
            type: rawValue,
            localizedTitle: title,
            localizedSubtitle: subtitle(snapshot),
            icon: UIApplicationShortcutIcon(systemImageName: symbol),
            userInfo: nil
        )
    }

    private var title: String {
        switch self {
        case .scanReceipt: String(localized: "Scan receipt")
        case .tonight: String(localized: "What's for dinner?")
        case .addToShopping: String(localized: "Add to shopping list")
        case .checkIn: String(localized: "Fridge check-in")
        }
    }

    private func subtitle(_ snapshot: Snapshot) -> String? {
        switch self {
        case .scanReceipt:
            return String(localized: "Add a whole shop at once")
        case .tonight:
            let count = snapshot.useByTomorrow
            return count > 0 ? String(localized: "\(count) to use by tomorrow") : String(localized: "Cook from what you have")
        case .addToShopping:
            let count = snapshot.toBuy
            return count > 0 ? String(localized: "\(count) on the list") : nil
        case .checkIn:
            let count = snapshot.toCheck
            if count == 1 { return String(localized: "1 item to confirm") }
            return count > 0 ? String(localized: "\(count) items to confirm") : String(localized: "Keep your fridge accurate")
        }
    }

    /// All available since iOS 16, so none render blank.
    private var symbol: String {
        switch self {
        case .scanReceipt: "doc.text.viewfinder"
        case .tonight: "fork.knife"
        case .addToShopping: "cart.badge.plus"
        case .checkIn: "checklist"
        }
    }

    /// Routes a tapped quick action. Returns false for an unknown type (e.g. from an older build).
    @MainActor
    @discardableResult
    static func perform(_ item: UIApplicationShortcutItem) -> Bool {
        guard let action = QuickAction(rawValue: item.type) else { return false }
        AppRouter.shared.quickAction = action
        return true
    }
}

/// Receives quick actions while the app is already running. Cold launches arrive in
/// `AppDelegate.application(_:configurationForConnecting:options:)`.
final class SceneDelegate: NSObject, UIWindowSceneDelegate {
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(QuickAction.perform(shortcutItem))
    }
}
