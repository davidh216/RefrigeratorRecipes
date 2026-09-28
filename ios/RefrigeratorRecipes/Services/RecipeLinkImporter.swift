import Foundation
import FridgeCore

/// A recipe ready to save, plus where it came from.
struct ImportedRecipe {
    var recipe: GeneratedRecipe
    var sourceURL: String?
    var creator: String
    /// Rebuilt from a title/caption rather than read from a written recipe.
    var isReconstructed: Bool
}

/// Imports a recipe from a link the user shared: recipe sites, YouTube, TikTok, Instagram.
///
/// Recipe sites are read from their schema.org data when they have it, so nothing is
/// guessed. Videos are read from their title, description or caption (public preview
/// data); the video itself isn't downloaded. Claude fills in whatever isn't written down.
enum RecipeLinkImporter {
    enum Source: Equatable {
        case web, youtube, tiktok, instagram

        var title: String {
            switch self {
            case .web: "website"
            case .youtube: "YouTube"
            case .tiktok: "TikTok"
            case .instagram: "Instagram"
            }
        }
    }

    enum ImportError: LocalizedError {
        case badLink, notARecipe, unreachable(String)

        var errorDescription: String? {
            switch self {
            case .badLink: "That doesn't look like a link."
            case .notARecipe: "Couldn't find a dish there. Try the recipe page itself, or paste the recipe text."
            case .unreachable(let detail): "Couldn't open that link (\(detail)). Check it and try again."
            }
        }
    }

    /// The first http(s) link in some text, e.g. what the share sheet or clipboard gives us.
    static func firstLink(in text: String) -> URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        return detector?.matches(in: text, range: range)
            .compactMap(\.url)
            .first { $0.scheme == "http" || $0.scheme == "https" }
    }

    static func source(of url: URL) -> Source {
        let host = url.host?.lowercased() ?? ""
        if host.hasSuffix("youtube.com") || host == "youtu.be" { return .youtube }
        if host.hasSuffix("tiktok.com") { return .tiktok }
        if host.hasSuffix("instagram.com") { return .instagram }
        return .web
    }

    static func importRecipe(from url: URL, kitchenContext: String) async throws -> ImportedRecipe {
        switch source(of: url) {
        case .web:
            let html = try await fetch(url)
            if let web = WebRecipeParser.extract(fromHTML: html), web.isComplete {
                return ImportedRecipe(recipe: generated(from: web), sourceURL: url.absoluteString,
                                      creator: web.author.isEmpty ? (url.host ?? "") : web.author,
                                      isReconstructed: false)
            }
            let title = WebRecipeParser.meta("og:title", in: html) ?? ""
            let text = WebRecipeParser.readableText(fromHTML: html)
            return try await viaClaude(
                "Recipe page \(url.absoluteString)\nTitle: \(title)\n\nPage text:\n\(text)",
                url: url, creator: WebRecipeParser.meta("author", in: html) ?? url.host ?? "",
                kitchenContext: kitchenContext
            )

        case .youtube:
            let oembed = try? await oEmbed("https://www.youtube.com/oembed?format=json&url=", for: url)
            let html = (try? await fetch(url)) ?? ""
            let description = youTubeDescription(in: html) ?? WebRecipeParser.meta("og:description", in: html) ?? ""
            let title = oembed?.title ?? WebRecipeParser.meta("og:title", in: html) ?? ""
            guard !title.isEmpty || !description.isEmpty else { throw ImportError.unreachable("no title or description") }
            return try await viaClaude(
                "YouTube video \(url.absoluteString)\nTitle: \(title)\nChannel: \(oembed?.author ?? "")\n\nDescription:\n\(description)",
                url: url, creator: oembed?.author ?? "", kitchenContext: kitchenContext
            )

        case .tiktok:
            guard let oembed = try? await oEmbed("https://www.tiktok.com/oembed?url=", for: url) else {
                throw ImportError.unreachable("TikTok didn't return the post")
            }
            return try await viaClaude(
                "TikTok video \(url.absoluteString)\nCreator: \(oembed.author)\n\nCaption:\n\(oembed.title)",
                url: url, creator: oembed.author.isEmpty ? "" : "@" + oembed.author, kitchenContext: kitchenContext
            )

        case .instagram:
            let html = try await fetch(url)
            let caption = WebRecipeParser.meta("og:description", in: html) ?? WebRecipeParser.meta("description", in: html) ?? ""
            let title = WebRecipeParser.meta("og:title", in: html) ?? ""
            guard !caption.isEmpty || !title.isEmpty else { throw ImportError.unreachable("Instagram didn't share the caption") }
            return try await viaClaude(
                "Instagram post \(url.absoluteString)\nTitle: \(title)\n\nCaption:\n\(caption)",
                url: url, creator: instagramHandle(title) ?? "", kitchenContext: kitchenContext
            )
        }
    }

    // MARK: - Claude

    static func viaClaude(_ sourceText: String, frames: [Data] = [], url: URL?, creator: String,
                          kitchenContext: String) async throws -> ImportedRecipe {
        let result = try await ClaudeClient.fromSettings().importRecipe(source: sourceText, frames: frames,
                                                                      kitchenContext: kitchenContext)
        guard result.is_recipe, !result.recipe.title.isEmpty, !result.recipe.ingredients.isEmpty else {
            throw ImportError.notARecipe
        }
        return ImportedRecipe(recipe: result.recipe, sourceURL: url?.absoluteString, creator: creator,
                              isReconstructed: !result.found_in_source)
    }

    /// A schema.org recipe mapped straight to the app's format; no AI involved.
    static func generated(from web: WebRecipe) -> GeneratedRecipe {
        let lines = web.ingredientLines.map(IngredientLine.parse)
        let tags = web.keywords.map { $0.lowercased() }.filter { $0.count <= 24 }
        return GeneratedRecipe(
            title: web.title,
            summary: web.summary,
            cuisine: web.cuisine.lowercased(),
            servings: web.servings ?? 4,
            prep_minutes: web.prepMinutes,
            cook_minutes: web.cookMinutes,
            tags: Array(tags.prefix(8)),
            ingredients: lines.map {
                GeneratedRecipe.Ingredient(name: $0.name, quantity: $0.quantity, unit: $0.unit,
                                           note: $0.note, optional: $0.isOptional)
            },
            instructions: web.steps
        )
    }

    // MARK: - Fetching

    private static let userAgent =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

    static func fetch(_ url: URL) async throws -> String {
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("en-US,en;q=0.9", forHTTPHeaderField: "Accept-Language")
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw ImportError.unreachable(error.localizedDescription)
        }
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw ImportError.unreachable("error \(http.statusCode)")
        }
        return String(decoding: data, as: UTF8.self)
    }

    struct OEmbed {
        var title: String
        var author: String
    }

    static func oEmbed(_ endpoint: String, for url: URL) async throws -> OEmbed {
        let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
        guard let api = URL(string: endpoint + encoded) else { throw ImportError.badLink }
        let text = try await fetch(api)
        guard let json = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any] else {
            throw ImportError.unreachable("unexpected reply")
        }
        return OEmbed(title: json["title"] as? String ?? "", author: json["author_name"] as? String ?? "")
    }

    /// The full description from a YouTube watch page (`"shortDescription":"…"`).
    static func youTubeDescription(in html: String) -> String? {
        guard let match = html.firstMatch(of: #/"shortDescription":"((?:[^"\\]|\\.)*)"/#),
              let data = ("\"" + match.1 + "\"").data(using: .utf8),
              let decoded = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) as? String
        else { return nil }
        return decoded
    }

    /// "Name (@handle) • Instagram photos and videos" → "@handle".
    static func instagramHandle(_ title: String) -> String? {
        title.firstMatch(of: #/@([A-Za-z0-9._]+)/#).map { "@" + $0.1 }
    }
}
