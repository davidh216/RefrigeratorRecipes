import Foundation

/// One tag from the fixed recipe vocabulary (HANDOFF-cuisines-languages-moods.md §1.1).
///
/// Recipes store tag ids as plain strings; this is what the app knows about each id.
/// Old, imported and AI spellings are mapped onto an id with `RecipeTag.id(for:)`.
public struct RecipeTag: Hashable, Sendable, Identifiable {
    public enum Kind: String, CaseIterable, Sendable {
        case meal, diet, effort, audience, nutrition, mood, discovery

        public var title: String {
            switch self {
            case .meal: "Meal"
            case .diet: "Diet"
            case .effort: "Effort and method"
            case .audience: "Audience and budget"
            case .nutrition: "Nutrition"
            case .mood: "Mood"
            case .discovery: "Discovery"
            }
        }
    }

    public let id: String
    public let kind: Kind
    public let name: String
    /// SF Symbol shown on chips.
    public let symbol: String
    /// Other spellings that mean this tag ("protein-rich" for high-protein).
    public let aliases: [String]

    public init(_ id: String, _ kind: Kind, _ name: String, symbol: String, aliases: [String] = []) {
        self.id = id
        self.kind = kind
        self.name = name
        self.symbol = symbol
        self.aliases = aliases
    }

    /// The whole vocabulary, in display order within each kind.
    public static let all: [RecipeTag] = [
        // Meal
        RecipeTag("breakfast", .meal, "Breakfast", symbol: "sunrise", aliases: ["breakfasts"]),
        RecipeTag("brunch", .meal, "Brunch", symbol: "cup.and.saucer"),
        RecipeTag("lunch", .meal, "Lunch", symbol: "takeoutbag.and.cup.and.straw", aliases: ["lunches", "lunchbox"]),
        RecipeTag("dinner", .meal, "Dinner", symbol: "fork.knife",
                  aliases: ["dinners", "supper", "main", "main-course", "main-dish", "mains", "entree", "weeknight-dinner"]),
        RecipeTag("snack", .meal, "Snack", symbol: "carrot",
                  aliases: ["snacks", "appetizer", "appetizers", "starter", "starters", "finger-food"]),
        RecipeTag("side", .meal, "Side", symbol: "square.split.2x1", aliases: ["sides", "side-dish", "side-dishes"]),
        RecipeTag("dessert", .meal, "Dessert", symbol: "birthday.cake", aliases: ["desserts", "sweets"]),

        // Diet: set from the ingredients and checked by the linter, never hand-set wrongly.
        RecipeTag("vegetarian", .diet, "Vegetarian", symbol: "leaf", aliases: ["veggie", "meatless"]),
        RecipeTag("vegan", .diet, "Vegan", symbol: "leaf.circle", aliases: ["plant-based-vegan"]),
        RecipeTag("pescatarian", .diet, "Pescatarian", symbol: "fish", aliases: ["pescetarian"]),
        RecipeTag("gluten-free", .diet, "Gluten-free", symbol: "checkmark.seal", aliases: ["gf", "no-gluten"]),
        RecipeTag("dairy-free", .diet, "Dairy-free", symbol: "drop.triangle", aliases: ["df", "no-dairy", "lactose-free"]),

        // Effort and method
        RecipeTag("quick", .effort, "Quick", symbol: "bolt",
                  aliases: ["fast", "quick-and-easy", "30-minute", "30-minutes", "under-30-minutes", "weeknight"]),
        RecipeTag("one-pot", .effort, "One pot", symbol: "frying.pan",
                  aliases: ["one-pan", "one-skillet", "one-pot-meal", "skillet"]),
        RecipeTag("sheet-pan", .effort, "Sheet pan", symbol: "rectangle.portrait", aliases: ["traybake", "tray-bake"]),
        RecipeTag("slow-cooker", .effort, "Slow cooker", symbol: "timer",
                  aliases: ["crockpot", "crock-pot", "slow-cooked", "slow-cook"]),
        RecipeTag("grill", .effort, "Grill", symbol: "flame",
                  aliases: ["grilled", "grilling", "bbq", "barbecue", "barbeque", "cookout"]),
        RecipeTag("no-cook", .effort, "No cook", symbol: "snowflake", aliases: ["no-bake", "raw"]),
        RecipeTag("meal-prep", .effort, "Meal prep", symbol: "square.stack.3d.up", aliases: ["mealprep", "batch-cooking"]),
        RecipeTag("freezer-friendly", .effort, "Freezer-friendly", symbol: "snowflake.circle", aliases: ["freezable", "freezer"]),
        RecipeTag("make-ahead", .effort, "Make ahead", symbol: "clock.arrow.circlepath", aliases: ["make-ahead-friendly"]),

        // Audience and budget
        RecipeTag("kid-friendly", .audience, "Kid-friendly", symbol: "figure.and.child.holdinghands",
                  aliases: ["kids", "kid-approved", "family-friendly", "family", "for-kids"]),
        RecipeTag("picky-eaters", .audience, "Picky eaters", symbol: "hand.thumbsup", aliases: ["picky-eater"]),
        RecipeTag("budget", .audience, "Budget", symbol: "dollarsign.circle",
                  aliases: ["cheap", "budget-friendly", "inexpensive", "frugal", "affordable"]),
        RecipeTag("crowd-pleaser", .audience, "Crowd-pleaser", symbol: "person.3",
                  aliases: ["party", "entertaining", "potluck", "game-day"]),

        // Nutrition
        RecipeTag("high-protein", .nutrition, "High protein", symbol: "dumbbell", aliases: ["protein-rich", "protein", "high-in-protein"]),
        RecipeTag("high-fiber", .nutrition, "High fiber", symbol: "chart.bar", aliases: ["high-fibre", "fiber-rich", "fibre-rich"]),
        RecipeTag("lighter", .nutrition, "Lighter", symbol: "scalemass",
                  aliases: ["healthy", "light", "low-calorie", "low-cal", "healthier"]),

        // Mood
        RecipeTag("comfort-food", .mood, "Comfort food", symbol: "sofa", aliases: ["comfort", "comforting"]),
        RecipeTag("feeling-spicy", .mood, "Feeling spicy", symbol: "flame.fill", aliases: ["spicy", "hot-and-spicy", "fiery"]),
        RecipeTag("under-the-weather", .mood, "Under the weather", symbol: "cloud.drizzle",
                  aliases: ["healing", "sick-day", "feeling-sick", "under-the-weather-food"]),
        RecipeTag("easy-to-stomach", .mood, "Easy to stomach", symbol: "mug",
                  aliases: ["gentle", "bland", "easy-on-the-stomach"]),
        RecipeTag("cozy-night-in", .mood, "Cozy night in", symbol: "moon.stars", aliases: ["cozy", "cosy", "cosy-night-in"]),
        RecipeTag("light-and-fresh", .mood, "Light & fresh", symbol: "sun.max", aliases: ["light-fresh", "fresh-and-light"]),
        RecipeTag("hot-day", .mood, "Hot day", symbol: "thermometer.sun", aliases: ["summer", "hot-weather"]),
        RecipeTag("date-night", .mood, "Date night", symbol: "wineglass", aliases: ["romantic", "special-occasion"]),
        RecipeTag("lazy-sunday", .mood, "Lazy Sunday", symbol: "bed.double", aliases: ["weekend", "sunday"]),

        // Discovery
        RecipeTag("viral", .discovery, "Viral", symbol: "chart.line.uptrend.xyaxis", aliases: ["trending", "trendy", "tiktok"]),
        RecipeTag("seasonal", .discovery, "Seasonal", symbol: "calendar", aliases: ["in-season"]),
        RecipeTag("new", .discovery, "New", symbol: "sparkles"),
    ]

    public static let moods: [RecipeTag] = all.filter { $0.kind == .mood }

    public static let ids: [String] = all.map(\.id)

    private static let byID: [String: RecipeTag] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    /// Normalized spelling → tag id, for ids, display names and aliases.
    private static let lookup: [String: String] = {
        var map: [String: String] = [:]
        for tag in all {
            for spelling in [tag.id, tag.name] + tag.aliases {
                map[key(spelling)] = tag.id
            }
        }
        return map
    }()

    public static func tag(_ id: String) -> RecipeTag? { byID[id] }

    /// The vocabulary id a free-text tag means, or nil when it isn't one of ours.
    /// "#Comfort Food", "comfort_food" and "comfort" all give "comfort-food".
    public static func id(for raw: String) -> String? {
        let normalized = key(raw)
        guard !normalized.isEmpty else { return nil }
        return lookup[normalized]
    }

    /// Vocabulary ids for a list of free-text tags, in order, without duplicates; unknown tags are dropped.
    public static func ids(for raws: [String]) -> [String] {
        var seen: Set<String> = []
        return raws.compactMap(id(for:)).filter { seen.insert($0).inserted }
    }

    /// Lowercase, no "#", accents folded, "&" as "and", and any run of other characters as one hyphen.
    static func key(_ raw: String) -> String {
        let folded = raw.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US"))
            .lowercased()
            .replacingOccurrences(of: "&", with: " and ")
        var out = ""
        var pendingHyphen = false
        for scalar in folded.unicodeScalars {
            if CharacterSet.alphanumerics.contains(scalar) {
                if pendingHyphen && !out.isEmpty { out.append("-") }
                pendingHyphen = false
                out.unicodeScalars.append(scalar)
            } else {
                pendingHyphen = true
            }
        }
        return out
    }
}
