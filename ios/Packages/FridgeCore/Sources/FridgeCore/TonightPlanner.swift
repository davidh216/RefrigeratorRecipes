import Foundation

/// What the Tonight picker needs to know about a recipe.
public struct TonightRecipe: Sendable {
    public var title: String
    public var requirements: [IngredientRequirement]
    /// Prep + cook time; 0 when unknown.
    public var totalMinutes: Int
    public var tags: [String]
    public var isFavorite: Bool
    public var lastCookedAt: Date?

    public init(title: String, requirements: [IngredientRequirement], totalMinutes: Int = 0, tags: [String] = [], isFavorite: Bool = false, lastCookedAt: Date? = nil) {
        self.title = title
        self.requirements = requirements
        self.totalMinutes = totalMinutes
        self.tags = tags
        self.isFavorite = isFavorite
        self.lastCookedAt = lastCookedAt
    }
}

public struct TonightPick: Equatable, Sendable {
    /// Index into the recipes passed to the planner.
    public var recipeIndex: Int
    public var score: Double
    public var match: RecipeMatch
    /// Pantry items this recipe would use up before they go bad, most urgent first.
    public var rescues: [String]
    /// One short line explaining the pick.
    public var reason: String
}

public enum TonightPlanner {
    /// Recipes that need more than this many extra items aren't "tonight" options.
    public static let maxMissing = 2

    /// The best dinner options right now.
    ///
    /// Ranking favors, in rough order: recipes that use food expiring soon, recipes
    /// you can make without shopping, favorites, and recipes you haven't cooked in
    /// the last few days. Breakfast-only and dessert recipes are pushed down.
    public static func picks(
        recipes: [TonightRecipe],
        stock: [StockItem],
        staples: [String] = RecipeMatcher.defaultStaples,
        now: Date = .now,
        soonThresholdDays: Int = 3,
        maxMinutes: Int? = nil,
        excluding excluded: Set<Int> = [],
        count: Int = 3,
        calendar: Calendar = .current
    ) -> [TonightPick] {
        let urgent = stock
            .map { ($0, ExpiryStatus.of(expiresAt: $0.expiresAt, now: now, soonThresholdDays: soonThresholdDays, calendar: calendar)) }
            .filter { if case .expiringSoon = $0.1 { return true } else { return false } }
            .sorted { $0.1.urgency < $1.1.urgency }

        var scored: [TonightPick] = []
        for (index, recipe) in recipes.enumerated() where !excluded.contains(index) {
            if let maxMinutes, recipe.totalMinutes > maxMinutes { continue }
            let match = RecipeMatcher.match(
                requirements: recipe.requirements, stock: stock, staples: staples,
                now: now, soonThresholdDays: soonThresholdDays
            )
            guard match.requiredCount > 0, match.missing.count <= maxMissing else { continue }

            let required = recipe.requirements.filter { !$0.isOptional }
            let rescues = urgent
                .filter { item in required.contains { IngredientName.matches(item.0.name, $0.name) } }
                .map(\.0.name)

            var score = Double(rescues.count) * 3
            score += match.coverage * 4
            score -= Double(match.missing.count) * 1.5
            if recipe.isFavorite { score += 1 }
            if let cooked = recipe.lastCookedAt {
                let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: cooked), to: calendar.startOfDay(for: now)).day ?? 99
                if days < 3 { score -= 3 } else if days < 7 { score -= 1 }
            }
            let tags = Set(recipe.tags.map { $0.lowercased() })
            if tags.contains("dessert") || (tags.contains("breakfast") && !tags.contains("dinner") && !tags.contains("lunch")) {
                score -= 2
            }

            scored.append(TonightPick(
                recipeIndex: index, score: score, match: match, rescues: rescues,
                reason: reason(match: match, rescues: rescues)
            ))
        }

        return scored
            .sorted {
                if $0.score != $1.score { return $0.score > $1.score }
                let a = recipes[$0.recipeIndex].totalMinutes, b = recipes[$1.recipeIndex].totalMinutes
                if a != b { return (a == 0 ? Int.max : a) < (b == 0 ? Int.max : b) }
                return $0.recipeIndex < $1.recipeIndex
            }
            .prefix(count)
            .map { $0 }
    }

    static func reason(match: RecipeMatch, rescues: [String]) -> String {
        if !rescues.isEmpty {
            return "Uses \(list(rescues.map { $0.lowercased() })) before \(rescues.count == 1 ? "it goes" : "they go") bad"
        }
        if match.canMake { return "You have everything for this" }
        return "Just need \(list(match.missing.map { $0.lowercased() }))"
    }

    /// "a", "a and b", "a, b and c" — longer lists are shortened to "a, b and 2 more".
    static func list(_ items: [String]) -> String {
        switch items.count {
        case 0: return ""
        case 1: return items[0]
        case 2: return "\(items[0]) and \(items[1])"
        case 3: return "\(items[0]), \(items[1]) and \(items[2])"
        default: return "\(items[0]), \(items[1]) and \(items.count - 2) more"
        }
    }
}
