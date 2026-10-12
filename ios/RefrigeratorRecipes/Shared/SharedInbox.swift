import Foundation

/// Links handed from the share extension to the app, through the shared Keychain.
/// Compiled into both targets.
enum SharedInbox {
    private static let service = "RefrigeratorRecipes.share"
    private static let account = "pending-link"

    static func put(_ url: URL) {
        SharedKeychain.set(Data(url.absoluteString.utf8), service: service, account: account)
    }

    /// The link waiting to be imported, removed as it's read.
    static func take() -> URL? {
        guard let data = SharedKeychain.data(service: service, account: account),
              let url = URL(string: String(decoding: data, as: UTF8.self)) else { return nil }
        SharedKeychain.delete(service: service, account: account)
        return url
    }
}
