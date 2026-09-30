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
    /// Titles from the recipe library.
    var recipes: [String]

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

enum SuperIngredients {
    /// All editions in rotation order.
    static let all: [SuperIngredient] = {
        guard let url = Bundle.main.url(forResource: "SuperIngredients", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let editions = try? JSONDecoder().decode([SuperIngredient].self, from: data) else { return [] }
        return editions
    }()

    /// This week's edition; changes every Monday.
    static func current(on date: Date = .now) -> SuperIngredient? {
        guard !all.isEmpty else { return nil }
        return all[WeeklySpotlight.index(for: date, count: all.count)]
    }
}
