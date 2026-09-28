import Foundation

/// The app's own Claude server (`server/` in the repo), for people without an API key.
///
/// TestFlight builds get its address and app token from the build (Info.plist keys
/// `FridgeProxyURL` / `FridgeAppToken`); builds without them simply don't offer it.
/// Each install sends a random ID, kept in the Keychain, that the server counts
/// requests against.
struct SharedServer {
    let baseURL: URL
    let appToken: String

    static let configured: SharedServer? = {
        let info = Bundle.main.infoDictionary ?? [:]
        guard let address = (info["FridgeProxyURL"] as? String)?.trimmingCharacters(in: .whitespaces),
              !address.isEmpty, !address.hasPrefix("$("),
              let url = URL(string: address), url.scheme == "https",
              let token = info["FridgeAppToken"] as? String, !token.isEmpty, !token.hasPrefix("$(")
        else { return nil }
        return SharedServer(baseURL: url, appToken: token)
    }()

    func request(path: String) -> URLRequest {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.setValue(appToken, forHTTPHeaderField: "x-fridge-token")
        request.setValue(Self.installID, forHTTPHeaderField: "x-fridge-install")
        return request
    }

    /// Requests left today, from the server.
    func remainingToday() async -> (remaining: Int, limit: Int)? {
        struct Quota: Decodable { let remaining: Int; let limit: Int }
        var request = request(path: "v1/quota")
        request.timeoutInterval = 15
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let quota = try? JSONDecoder().decode(Quota.self, from: data) else { return nil }
        Self.noteRemaining(quota.remaining)
        return (quota.remaining, quota.limit)
    }

    // MARK: - Install ID

    private static let installAccount = "fridge-install-id"

    static var installID: String {
        if let existing = KeychainStore.read(installAccount), !existing.isEmpty { return existing }
        let made = UUID().uuidString
        KeychainStore.write(made, account: installAccount)
        return made
    }

    // MARK: - Remaining requests

    static let remainingKey = "sharedServerRemaining"

    /// Kept in UserDefaults so Settings can show it without a network call.
    static func noteRemaining(_ remaining: Int) {
        UserDefaults.standard.set(remaining, forKey: remainingKey)
    }
}
