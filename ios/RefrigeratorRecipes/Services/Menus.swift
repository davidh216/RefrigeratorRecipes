import Foundation
import FridgeCore

/// A named set of recipes from the server (`server/content/menus.json`, HANDOFF-cuisines-languages-moods.md §3):
/// a weekly theme like Taco Tuesday, a mood, or an occasion with dates it's in season.
struct RecipeMenu: Codable, Equatable, Identifiable {
    struct Window: Codable, Equatable {
        var from: String
        var to: String
    }

    var id: String
    var title: String
    var intro: String
    /// "weekly", "occasion" or "mood"; kept as text so a new kind doesn't break older builds.
    var kind: String
    /// The meal "Add all to plan" fills: "dinner" (the default) or "lunch".
    var slot: String?
    /// A mood tag id, for menus that belong to a mood.
    var mood: String?
    var window: Window?
    /// Recipe ids: the bundled library, the recipe packs, or `recipeDetails`.
    var recipes: [String]
    /// Recipes only this menu has.
    var recipeDetails: [SampleData.SampleRecipe]?
    /// Waiting for review; the server leaves drafts out, and so does the app.
    var draft: Bool?

    private enum CodingKeys: String, CodingKey {
        case id, title, intro, kind, slot, mood, window, recipes, recipeDetails, draft
    }

    /// An included recipe that doesn't decode is skipped, not the whole menu.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        intro = try container.decode(String.self, forKey: .intro)
        kind = try container.decode(String.self, forKey: .kind)
        slot = try? container.decodeIfPresent(String.self, forKey: .slot)
        mood = try? container.decodeIfPresent(String.self, forKey: .mood)
        window = try? container.decodeIfPresent(Window.self, forKey: .window)
        recipes = try container.decode([String].self, forKey: .recipes)
        recipeDetails = (try? container.decodeIfPresent(LossyArray<SampleData.SampleRecipe>.self, forKey: .recipeDetails))?.elements
        draft = try? container.decodeIfPresent(Bool.self, forKey: .draft)
    }

    var isOccasion: Bool { kind == "occasion" }

    /// Whether a recipe is one of the menu's main dishes (tagged for its meal), rather than a side
    /// or dessert that goes alongside one. Recipes with no course tags count as mains.
    func isMain(tags: [String]) -> Bool {
        let ids = Set(RecipeTag.ids(for: tags))
        return ids.contains(mealSlot.rawValue) || ids.isDisjoint(with: ["side", "dessert", "snack"])
    }

    var mealSlot: MealSlot { slot == "lunch" ? .lunch : .dinner }

    /// The window, when it's valid.
    var schedule: MenuWindow? { window.flatMap { MenuWindow(from: $0.from, to: $0.to) } }

    /// In season on `date`: always for menus without dates.
    func isInSeason(on date: Date = .now, calendar: Calendar = .current) -> Bool {
        guard window != nil else { return true }
        return schedule?.contains(date, calendar: calendar) ?? false
    }
}

/// The server's menus, cached for offline use. Without a server, or before the first download,
/// there are none and Explore and Tonight simply don't show the menu sections.
@MainActor
final class Menus: ObservableObject {
    static let shared = Menus()

    /// What the server sends; also cached on the phone.
    struct ServerContent: Codable, Equatable {
        var rotation: [String]
        var menus: [RecipeMenu]

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            rotation = (try? container.decode([String].self, forKey: .rotation)) ?? []
            menus = try container.decode(LossyArray<RecipeMenu>.self, forKey: .menus).elements
        }
    }

    @Published private(set) var content: ServerContent? {
        didSet { recipes = Self.included(content) }
    }

    /// Recipes included with menus that aren't in the library or packs, for saving when opened or planned.
    private(set) var recipes: [SampleData.SampleRecipe] = []

    private let loader = ServerContentLoader<ServerContent>(path: "v1/content/menus", cacheName: "menus.json")

    private init() {
        content = loader.cached()
        recipes = Self.included(content)
    }

    private static func included(_ content: ServerContent?) -> [SampleData.SampleRecipe] {
        var seen = Set<String>()
        return (content?.menus ?? []).flatMap { $0.recipeDetails ?? [] }.filter { recipe in
            guard let id = recipe.id, !id.isEmpty else { return false }
            return seen.insert(id).inserted
        }
    }

    /// Published menus, first of each id.
    var all: [RecipeMenu] {
        var seen = Set<String>()
        return (content?.menus ?? []).filter { $0.draft != true && seen.insert($0.id).inserted }
    }

    func menu(_ id: String) -> RecipeMenu? { all.first { $0.id == id } }

    /// This week's menu from the rotation, changing on Mondays.
    func weekly(for date: Date = .now, calendar: Calendar = .current) -> RecipeMenu? {
        let menus = all
        let id = MenuSchedule.weekly(content?.rotation ?? [], for: date, calendar: calendar) { candidate in
            menus.contains { $0.id == candidate }
        }
        return menus.first { $0.id == id }
    }

    /// Occasion menus in season on `date`, for Tonight.
    func inSeason(on date: Date = .now, calendar: Calendar = .current) -> [RecipeMenu] {
        all.filter { $0.isOccasion && $0.window != nil && $0.isInSeason(on: date, calendar: calendar) }
    }

    /// Menus to list in Explore: occasions only while in season, everything else always.
    func browsable(on date: Date = .now, calendar: Calendar = .current) -> [RecipeMenu] {
        all.filter { !$0.isOccasion || $0.isInSeason(on: date, calendar: calendar) }
    }

    /// Fetches the server's menus (if this build has a server) and caches them.
    func refresh() async {
        if let fetched = await loader.fetch(replacing: content) { content = fetched }
    }
}
