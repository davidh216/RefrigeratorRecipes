import Foundation

/// Which meal of the day a recipe is for. Raw values match the app's `MealSlot`.
public enum MealKind: String, CaseIterable, Sendable {
    case breakfast, lunch, dinner, snack

    private static let breakfastWords: Set<String> = [
        "pancake", "waffle", "omelet", "omelette", "oatmeal", "oat", "granola", "frittata",
        "smoothie", "muffin", "scrambled", "porridge", "shakshuka",
    ]
    private static let lunchWords: Set<String> = ["sandwich", "wrap", "panini", "sub"]

    /// Guesses the meal from a recipe's tags, then its title. Anything unclear is dinner,
    /// since that's the meal people plan most.
    public static func guess(tags: [String], title: String) -> MealKind {
        let tags = Set(tags.map { $0.lowercased().trimmingCharacters(in: .whitespaces) })
        let words = Set(IngredientName.tokens(title))
        let lowerTitle = title.lowercased()
        let dinnerTagged = tags.contains("dinner") || tags.contains("main")

        if !dinnerTagged && (tags.contains("breakfast") || tags.contains("brunch")) { return .breakfast }
        if tags.contains("dessert") || tags.contains("snack") { return .snack }
        if !dinnerTagged && tags.contains("lunch") { return .lunch }
        if dinnerTagged { return .dinner }
        if !words.isDisjoint(with: breakfastWords) || lowerTitle.contains("french toast") { return .breakfast }
        if !words.isDisjoint(with: lunchWords) { return .lunch }
        return .dinner
    }
}

/// Fills the empty nights of a week with dinners.
public enum WeekPlanner {
    public struct Pick: Equatable, Sendable {
        /// Index into the `days` passed to `fill`.
        public var dayIndex: Int
        /// Index into the `recipes` passed to `fill`.
        public var recipeIndex: Int
        public var reason: String
    }

    /// A week plan may lean on the shopping list more than tonight's dinner can.
    public static let maxMissing = 4
    /// When shopping for the week, what's in the fridge only breaks ties.
    public static let shoppingPantryWeight = 0.25

    /// One dinner per day in `days`, chosen with the Tonight ranking as of that day.
    ///
    /// - Recipes in `alreadyPlanned` (and ones picked earlier in the week) aren't repeated.
    /// - Expiring food a pick uses counts as eaten, so later nights don't claim it too.
    /// - With an `objective`, recipes near everyone's dinner target rank higher, and the
    ///   week is balanced: after a heavy night the next target is a little lower (and
    ///   after a light or low-protein one, a little higher), within ±25%.
    /// - `shopping`: any recipe can be picked however much it needs, and having the
    ///   ingredients only breaks ties; variety and goals decide. Expiring food still counts.
    /// - A day with nothing suitable is left empty.
    public static func fill(
        days: [Date],
        recipes: [TonightRecipe],
        stock: [StockItem],
        staples: [String] = RecipeMatcher.defaultStaples,
        alreadyPlanned: Set<Int> = [],
        soonThresholdDays: Int = 3,
        objective: NutritionObjective? = nil,
        shopping: Bool = false,
        calendar: Calendar = .current
    ) -> [Pick] {
        var used = alreadyPlanned
        var remaining = stock
        var picks: [Pick] = []
        let reference = objective?.averageTarget
        // Each known pick adds its share of the target (1.0 = exactly on target).
        var kcalShares = 0.0, proteinShares = 0.0, known = 0
        for (dayIndex, day) in days.enumerated() {
            var tonight = objective
            if let objective, known > 0 {
                let nightsLeft = Double(days.count - dayIndex)
                tonight = objective.scaled(
                    kcal: balance(shares: kcalShares, known: known, nightsLeft: nightsLeft),
                    protein: balance(shares: proteinShares, known: known, nightsLeft: nightsLeft)
                )
            }
            guard let best = TonightPlanner.picks(
                recipes: recipes, stock: remaining, staples: staples, now: day,
                soonThresholdDays: soonThresholdDays, excluding: used, count: 1,
                maxMissing: shopping ? .max : maxMissing,
                pantryWeight: shopping ? shoppingPantryWeight : 1, calendar: calendar,
                adjust: tonight.map { objective in { objective.adjustment(recipe: $0, match: $1) } }
            ).first else { continue }
            used.insert(best.recipeIndex)
            picks.append(Pick(dayIndex: dayIndex, recipeIndex: best.recipeIndex, reason: best.reason))
            remaining.removeAll { item in
                best.rescues.contains { IngredientName.matches($0, item.name) }
            }
            if let objective, let reference, objective.recipeNutrition.indices.contains(best.recipeIndex),
               let facts = objective.recipeNutrition[best.recipeIndex] {
                kcalShares += reference.kcal > 0 ? facts.kcal / reference.kcal : 1
                proteinShares += reference.protein > 0 ? facts.protein / reference.protein : 1
                known += 1
            }
        }
        return picks
    }

    /// How much to scale the next night's target so the week evens out.
    static func balance(shares: Double, known: Int, nightsLeft: Double) -> Double {
        let surplus = shares - Double(known)
        return min(max(1 - surplus / max(nightsLeft, 1), 0.75), 1.25)
    }

    /// The best dinner for `day` other than the recipes in `excluding`, for "Swap".
    public static func alternative(
        on day: Date,
        recipes: [TonightRecipe],
        stock: [StockItem],
        staples: [String] = RecipeMatcher.defaultStaples,
        excluding: Set<Int>,
        soonThresholdDays: Int = 3,
        objective: NutritionObjective? = nil,
        shopping: Bool = false,
        calendar: Calendar = .current
    ) -> Int? {
        TonightPlanner.picks(
            recipes: recipes, stock: stock, staples: staples, now: day,
            soonThresholdDays: soonThresholdDays, excluding: excluding, count: 1,
            maxMissing: shopping ? .max : maxMissing,
            pantryWeight: shopping ? shoppingPantryWeight : 1, calendar: calendar,
            adjust: objective.map { objective in { objective.adjustment(recipe: $0, match: $1) } }
        ).first?.recipeIndex
    }
}
