import Foundation
import Security

/// Links handed from the share extension to the app, through a Keychain item both can see.
/// Compiled into both targets.
enum SharedInbox {
    /// The keychain access group listed in both targets' entitlements, minus the team prefix.
    private static let groupSuffix = "com.davidh216.RefrigeratorRecipes.shared"
    private static let service = "RefrigeratorRecipes.share"
    private static let account = "pending-link"

    /// "TEAMID." + suffix.
    private static var accessGroup: String? {
        guard let prefix = teamPrefix else { return nil }
        return prefix + groupSuffix
    }

    static func put(_ url: URL) {
        var query = baseQuery()
        SecItemDelete(query as CFDictionary)
        query[kSecValueData as String] = Data(url.absoluteString.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(query as CFDictionary, nil)
    }

    /// The link waiting to be imported, removed as it's read.
    static func take() -> URL? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let url = URL(string: String(decoding: data, as: UTF8.self)) else { return nil }
        SecItemDelete(baseQuery() as CFDictionary)
        return url
    }

    private static func baseQuery() -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return query
    }

    /// "TEAMID." from Info.plist (`AppIdentifierPrefix`); empty in unsigned builds.
    private static let teamPrefix: String? = {
        guard let prefix = Bundle.main.object(forInfoDictionaryKey: "AppIdentifierPrefix") as? String,
              prefix.hasSuffix("."), prefix.count > 1 else { return nil }
        return prefix
    }()
}
