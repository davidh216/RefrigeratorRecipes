import Foundation
import FridgeCore

/// One "super ingredient of the week" edition, from `SuperIngredients.json`.
struct SuperIngredient: Codable, Identifiable, Equatable {
    struct Benefit: Codable, Equatable, Hashable {
        var title: String
        var detail: String
    }

    struct Serving: Codable, Equatable {
        var label: String
        var grams: Double
    }

    var id: String
    var ingredient: String
    /// Name used to find it in the nutrition table and the fridge ("black bean").
    var match: String
    var category: String
    var headline: String
    var intro: String
    var benefits: [Benefit]
    var serving: Serving
    var choose: String
    var store: String
    var kidTip: String
    /// Recipe library ids, from the app's library or from `recipeDetails`. Titles still work,
    /// so editions written (or cached) before ids existed keep opening.
    var recipes: [String]
    /// Full recipes for titles the library doesn't have (server editions only).
    var recipeDetails: [SampleData.SampleRecipe]?

    var foodCategory: FoodCategory { FoodCategory(rawValue: category) ?? .other }

    /// Nutrition for one serving, from the built-in table.
    var servingNutrition: NutritionFacts? {
        NutritionTable.standard.lookup(match)?.per100g.scaled(by: serving.grams / 100)
    }

    /// Whether a pantry item is this ingredient ("Baby spinach" is spinach; "Eggplant" isn't egg).
    func matches(_ itemName: String) -> Bool {
        IngredientName.matches(match, itemName)
    }
}

/// The super-ingredient editions: the 13 built into the app, plus any the server adds,
/// replaces or pins to a particular week (`server/content/super-ingredients.json`).
@MainActor
final class SuperIngredients: ObservableObject {
    static let shared = SuperIngredients()

    /// What the server sends; also cached on the phone so it works offline.
    struct ServerContent: Codable, Equatable {
        var editions: [SuperIngredient]
        /// Week (that Monday, "YYYY-MM-DD") → edition id.
        var special: [String: String]?
        /// Edition ids in weekly order, replacing the built-in order.
        var rotation: [String]?
    }

    nonisolated static let bundled: [SuperIngredient] = {
        guard let url = Bundle.main.url(forResource: "SuperIngredients", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let editions = try? JSONDecoder().decode([SuperIngredient].self, from: data) else { return [] }
        return editions
    }()

    @Published private(set) var server: ServerContent?

    private static var cacheURL: URL? {
        try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appending(path: "super-ingredients.json")
    }

    private init() {
        if let url = Self.cacheURL, let data = try? Data(contentsOf: url) {
            server = try? JSONDecoder().decode(ServerContent.self, from: data)
        }
    }

    /// Built-in editions with the server's replacing any with the same id, then the server's new ones.
    var all: [SuperIngredient] {
        let extra = server?.editions ?? []
        let replaced = Self.bundled.map { edition in extra.first { $0.id == edition.id } ?? edition }
        return replaced + extra.filter { e in !Self.bundled.contains { $0.id == e.id } }
    }

    /// The edition for the week containing `date`: a pinned special if there is one, otherwise the
    /// next in the rotation (the built-in 13 unless the server sets its own order).
    func edition(for date: Date = .now, calendar: Calendar = .current) -> SuperIngredient? {
        let editions = all
        let monday = WeeklySpotlight.weekStart(for: date, calendar: calendar)
        let parts = calendar.dateComponents([.year, .month, .day], from: monday)
        let key = String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
        if let id = server?.special?[key], let pinned = editions.first(where: { $0.id == id }) {
            return pinned
        }
        let order = server?.rotation?.compactMap { id in editions.first { $0.id == id } }
        let rotation = (order?.isEmpty == false ? order! : editions.filter { e in Self.bundled.contains { $0.id == e.id } })
        guard !rotation.isEmpty else { return nil }
        return rotation[WeeklySpotlight.index(for: date, count: rotation.count, calendar: calendar)]
    }

    /// Fetches the server's editions (if this build has a server) and caches them.
    func refresh() async {
        guard let base = SharedServer.configured?.baseURL else { return }
        var request = URLRequest(url: base.appending(path: "v1/content/super-ingredients"))
        request.timeoutInterval = 20
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let content = try? JSONDecoder().decode(ServerContent.self, from: data) else { return }
        if content != server { server = content }
        if let url = Self.cacheURL { try? data.write(to: url, options: .atomic) }
    }
}
