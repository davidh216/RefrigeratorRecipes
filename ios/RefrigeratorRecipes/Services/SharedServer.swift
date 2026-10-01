import Foundation

/// The app's own Claude server (`server/` in the repo), for people without an API key.
///
/// TestFlight builds get its address and app token from the build (Info.plist keys
/// `FridgeProxyURL` / `FridgeAppToken`); builds without them simply don't offer it.
/// Each install sends a random ID, kept in the Keychain, that the server counts
/// requests against, and signs its requests with App Attest (`AppAttestClient`).
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

    /// The app's privacy policy, served by the same server.
    var privacyPolicyURL: URL { baseURL.appending(path: "privacy") }

    func request(path: String) -> URLRequest {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.setValue(appToken, forHTTPHeaderField: "x-fridge-token")
        request.setValue(Self.installID, forHTTPHeaderField: "x-fridge-install")
        return request
    }

    /// Sends a request signed with App Attest (when this device supports it): a POST with `body`,
    /// or a GET without. If the server says it doesn't recognize this copy of the app, the key is
    /// registered again and the request retried once.
    func send(path: String, body: Data? = nil, timeout: TimeInterval) async throws -> (Data, HTTPURLResponse) {
        for attempt in 0..<2 {
            var request = request(path: path)
            request.timeoutInterval = timeout
            if let body {
                request.httpMethod = "POST"
                request.httpBody = body
                request.setValue("application/json", forHTTPHeaderField: "content-type")
            }
            // The server checks the signature over the exact body, or "GET /path" for a GET.
            let clientData = body ?? Data("GET /\(path)".utf8)
            for (field, value) in await AppAttestClient.shared.headers(for: clientData, server: self) {
                request.setValue(value, forHTTPHeaderField: field)
            }
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
            let unrecognized = http.value(forHTTPHeaderField: "x-fridge-attest") == "invalid"
                || (http.statusCode == 401 && String(decoding: data, as: UTF8.self).contains("attestation_required"))
            if unrecognized { await AppAttestClient.shared.forget() }
            if http.statusCode == 401, unrecognized, attempt == 0 { continue }
            return (data, http)
        }
        throw URLError(.userAuthenticationRequired)
    }

    /// A one-time challenge for registering an App Attest key.
    func attestChallenge() async throws -> String {
        struct Challenge: Decodable { let challenge: String }
        var request = request(path: "v1/attest/challenge")
        request.timeoutInterval = 20
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return try JSONDecoder().decode(Challenge.self, from: data).challenge
    }

    /// Hands the server Apple's attestation for a new key.
    func registerKey(keyID: String, attestation: Data, challenge: String) async throws {
        var request = request(path: "v1/attest")
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "keyId": keyID, "attestation": attestation.base64EncodedString(), "challenge": challenge,
        ])
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.userAuthenticationRequired) }
    }

    /// Requests left today, from the server.
    func remainingToday() async -> (remaining: Int, limit: Int)? {
        struct Quota: Decodable { let remaining: Int; let limit: Int }
        guard let (data, response) = try? await send(path: "v1/quota", timeout: 15),
              response.statusCode == 200,
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
