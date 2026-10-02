import Foundation

/// New recipes from the server (`server/content/recipe-packs.json`), so the library grows without
/// an app update. Fetched when the app opens, cached for offline use, and merged with the bundled
/// library in `SampleData.catalog`. Nothing is saved until the user opens or plans a recipe.
@MainActor
final class RecipePacks: ObservableObject {
    static let shared = RecipePacks()

    struct Pack: Codable, Equatable, Identifiable {
        var id: String
        var title: String
        var recipes: [SampleData.SampleRecipe]

        /// A recipe that doesn't decode (say, a field a newer build added) is skipped, not the whole file.
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            id = try container.decode(String.self, forKey: .id)
            title = try container.decode(String.self, forKey: .title)
            recipes = try container.decode(LossyArray<SampleData.SampleRecipe>.self, forKey: .recipes).elements
        }
    }

    /// What the server sends; also cached on the phone.
    struct ServerContent: Codable, Equatable {
        var packs: [Pack]
    }

    @Published private(set) var content: ServerContent? {
        didSet { recipes = Self.usable(content) }
    }

    /// Every pack recipe that has an id and doesn't clash with the bundled library or an earlier pack.
    private(set) var recipes: [SampleData.SampleRecipe] = []

    private let loader = ServerContentLoader<ServerContent>(path: "v1/content/recipes", cacheName: "recipe-packs.json")

    private init() {
        content = loader.cached()
        recipes = Self.usable(content)
    }

    private static func usable(_ content: ServerContent?) -> [SampleData.SampleRecipe] {
        var ids = Set(SampleData.samples.compactMap(\.id))
        var titles = Set(SampleData.samples.map { $0.title.lowercased() })
        var result: [SampleData.SampleRecipe] = []
        for recipe in (content?.packs ?? []).flatMap(\.recipes) {
            guard let id = recipe.id, !id.isEmpty,
                  ids.insert(id).inserted, titles.insert(recipe.title.lowercased()).inserted else { continue }
            result.append(recipe)
        }
        return result
    }

    /// Fetches the server's packs (if this build has a server) and caches them.
    func refresh() async {
        if let fetched = await loader.fetch(replacing: content) { content = fetched }
    }
}
