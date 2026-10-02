import Foundation

/// Fetches one piece of the server's public content (`GET /v1/content/…`) and keeps the last copy
/// on the phone, so the app works offline and opens with it straight away. Used by `RecipePacks` and
/// `Menus`; each keeps the decoded content and publishes it.
@MainActor
final class ServerContentLoader<Content: Codable & Equatable> {
    private let path: String
    private let cacheURL: URL?
    /// When the server was last asked; launch and becoming active both refresh, so don't ask twice in a row.
    private var lastRefresh: Date?

    /// - Parameters:
    ///   - path: the server path, such as "v1/content/menus".
    ///   - cacheName: the file in Application Support that keeps the last copy.
    init(path: String, cacheName: String) {
        self.path = path
        cacheURL = try? FileManager.default
            .url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appending(path: cacheName)
    }

    /// The copy saved last time, if there is one and this build can read it.
    func cached() -> Content? {
        guard let cacheURL, let data = try? Data(contentsOf: cacheURL) else { return nil }
        return try? JSONDecoder().decode(Content.self, from: data)
    }

    /// The server's content when it differs from `current` (and saved for next time), or nil when
    /// it's the same, the phone is offline, this build has no server, or it was asked in the last 10 minutes.
    func fetch(replacing current: Content?) async -> Content? {
        guard let base = SharedServer.configured?.baseURL else { return nil }
        if let lastRefresh, Date.now.timeIntervalSince(lastRefresh) < 10 * 60 { return nil }
        lastRefresh = .now
        var request = URLRequest(url: base.appending(path: path))
        request.timeoutInterval = 20
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let fetched = try? JSONDecoder().decode(Content.self, from: data),
              fetched != current else { return nil }
        if let cacheURL { try? data.write(to: cacheURL, options: .atomic) }
        return fetched
    }
}

/// Decodes an array, skipping elements that don't decode (say, a field a newer build added)
/// instead of failing the whole file.
struct LossyArray<Element: Decodable>: Decodable {
    let elements: [Element]

    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        var elements: [Element] = []
        while !container.isAtEnd {
            if (try? container.decodeNil()) == true { continue }
            if let element = try? container.decode(Element.self) {
                elements.append(element)
            } else if (try? container.decode(Skip.self)) == nil {
                break
            }
        }
        self.elements = elements
    }

    /// Reads nothing, so it decodes from any element and moves the container past it.
    private struct Skip: Decodable {
        init(from decoder: Decoder) throws {}
    }
}
