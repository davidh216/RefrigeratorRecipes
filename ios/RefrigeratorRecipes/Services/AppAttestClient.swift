import CryptoKit
import DeviceCheck
import Foundation

/// Proves to Fridge's server that requests come from a genuine copy of the app (Apple App Attest).
///
/// Once per install, the phone makes a key in its Secure Enclave and Apple vouches for it; the
/// server checks Apple's statement and remembers the key. After that, each request is signed with
/// the key over its exact body. Devices without App Attest (the Simulator, very old phones) just
/// send unsigned requests, which the server accepts unless it's set to require them.
actor AppAttestClient {
    static let shared = AppAttestClient()

    private static let keyAccount = "fridge-attest-key-id"
    private static let registeredAccount = "fridge-attest-registered"

    /// A registration in progress, so concurrent requests share it instead of making two keys.
    private var registration: Task<String?, Never>?
    private var lastFailure: Date?

    /// Headers that sign `clientData`, or none if this device can't (or couldn't yet) attest.
    func headers(for clientData: Data, server: SharedServer) async -> [String: String] {
        let service = DCAppAttestService.shared
        guard service.isSupported, let keyID = await registeredKey(server) else { return [:] }
        do {
            let assertion = try await service.generateAssertion(keyID, clientDataHash: Data(SHA256.hash(data: clientData)))
            return ["x-fridge-key-id": keyID, "x-fridge-assertion": assertion.base64EncodedString()]
        } catch {
            // The key is gone (e.g. the app was reinstalled); register a new one next time.
            if (error as? DCError)?.code == .invalidKey { forget() }
            return [:]
        }
    }

    /// Drops the key so the next request registers a new one; used when the server doesn't know it.
    func forget() {
        KeychainStore.delete(Self.keyAccount)
        KeychainStore.delete(Self.registeredAccount)
        lastFailure = nil
    }

    private func registeredKey(_ server: SharedServer) async -> String? {
        if let key = KeychainStore.read(Self.keyAccount), KeychainStore.read(Self.registeredAccount) == "1" {
            return key
        }
        // Don't retry a failed registration on every request; try again after an hour.
        if let lastFailure, Date.now.timeIntervalSince(lastFailure) < 3600 { return nil }
        if let registration { return await registration.value }
        let task = Task { await register(server) }
        registration = task
        let key = await task.value
        registration = nil
        return key
    }

    private func register(_ server: SharedServer) async -> String? {
        let service = DCAppAttestService.shared
        do {
            let keyID = try await service.generateKey()
            let challenge = try await server.attestChallenge()
            guard let challengeData = Data(base64Encoded: challenge) else { throw URLError(.badServerResponse) }
            let attestation = try await service.attestKey(keyID, clientDataHash: Data(SHA256.hash(data: challengeData)))
            try await server.registerKey(keyID: keyID, attestation: attestation, challenge: challenge)
            KeychainStore.write(keyID, account: Self.keyAccount)
            KeychainStore.write("1", account: Self.registeredAccount)
            return keyID
        } catch {
            // A key can only be attested once, so a failed attempt starts over with a new key.
            lastFailure = .now
            return nil
        }
    }
}
