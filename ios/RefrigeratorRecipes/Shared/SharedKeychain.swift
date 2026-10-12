import Foundation
import Security

/// Small values handed between the app and its extensions through a Keychain item they can all see
/// (the `…RefrigeratorRecipes.shared` access group in each target's entitlements). Unlike an App Group,
/// it needs no setup in the developer portal. Compiled into the app, the share extension and the widget.
enum SharedKeychain {
    /// The keychain access group listed in the targets' entitlements, minus the team prefix.
    private static let groupSuffix = "com.davidh216.RefrigeratorRecipes.shared"

    static func data(service: String, account: String) -> Data? {
        var query = baseQuery(service: service, account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else { return nil }
        return result as? Data
    }

    /// Readable after the phone's first unlock, so a widget can read it on the Lock Screen.
    static func set(_ data: Data, service: String, account: String) {
        var query = baseQuery(service: service, account: account)
        SecItemDelete(query as CFDictionary)
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(query as CFDictionary, nil)
    }

    static func delete(service: String, account: String) {
        SecItemDelete(baseQuery(service: service, account: account) as CFDictionary)
    }

    private static func baseQuery(service: String, account: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        if let teamPrefix { query[kSecAttrAccessGroup as String] = teamPrefix + groupSuffix }
        return query
    }

    /// "TEAMID." from Info.plist (`AppIdentifierPrefix`); nil in unsigned builds.
    private static let teamPrefix: String? = {
        guard let prefix = Bundle.main.object(forInfoDictionaryKey: "AppIdentifierPrefix") as? String,
              prefix.hasSuffix("."), prefix.count > 1 else { return nil }
        return prefix
    }()
}
