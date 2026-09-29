import Foundation

/// What "Plan my week" leans toward, on top of using up expiring food.
public enum PlanStyle: String, CaseIterable, Codable, Sendable, Identifiable {
    case balanced, highProtein, lighter, budget

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .balanced: "Balanced"
        case .highProtein: "High protein"
        case .lighter: "Lighter"
        case .budget: "Budget"
        }
    }

    /// How much the nutrition fit moves a recipe's score, next to expiry (3 per item
    /// rescued) and coverage (up to 4).
    var nutritionWeight: Double {
        switch self {
        case .balanced: 3
        case .highProtein, .lighter: 4
        case .budget: 1
        }
    }
}

/// Scores recipes by how close one serving lands to each person's target for a meal.
///
/// Recipes whose nutrition is unknown (or only partly estimated) are neither helped
/// nor hurt. With no goals set, Balanced and Budget ignore nutrition entirely, and
/// High protein and Lighter aim at a 2,000 kcal / 100 g protein reference day.
public struct NutritionObjective: Sendable {
    public var style: PlanStyle
    /// One per person with a goal: their target for this meal.
    public private(set) var mealTargets: [NutritionFacts]
    /// Per-serving nutrition by recipe index; nil when unknown or unreliable.
    public var recipeNutrition: [NutritionFacts?]

    public static let referenceDay = NutritionFacts(kcal: 2000, protein: 100, carbs: 250, fat: 67, fiber: 28)

    public init(
        style: PlanStyle,
        dailyTargets: [NutritionFacts],
        meal: MealKind = .dinner,
        split: MealSplit = MealSplit(),
        recipeNutrition: [NutritionFacts?]
    ) {
        self.style = style
        self.recipeNutrition = recipeNutrition
        var daily = dailyTargets.filter { $0.kcal > 0 }
        if daily.isEmpty && (style == .highProtein || style == .lighter) {
            daily = [Self.referenceDay]
        }
        mealTargets = daily.map { NutritionTargets.perMeal($0, meal: meal, split: split) }
    }

    /// Whether nutrition changes the ranking at all.
    public var usesNutrition: Bool { !mealTargets.isEmpty }

    /// The average person's target for this meal, or nil with no targets.
    public var averageTarget: NutritionFacts? {
        guard !mealTargets.isEmpty else { return nil }
        return mealTargets.reduce(NutritionFacts.zero, +).scaled(by: 1 / Double(mealTargets.count))
    }

    /// 0…1: how well one serving fits one person's target in this style.
    public func fit(_ facts: NutritionFacts, target: NutritionFacts) -> Double {
        guard target.kcal > 0 else { return 0.5 }
        var kcalTarget = target.kcal
        var proteinTarget = target.protein
        var kcalWeight = 0.6
        switch style {
        case .highProtein:
            proteinTarget *= 1.25
            kcalWeight = 0.35
        case .lighter:
            kcalTarget *= 0.85
        case .balanced, .budget:
            break
        }
        let off = (facts.kcal - kcalTarget) / kcalTarget
        // Lighter: going over costs twice as much as coming in under.
        let miss = style == .lighter && off > 0 ? off * 2 : abs(off)
        let kcalScore = max(0, 1 - miss * 1.5)
        let proteinScore = proteinTarget > 0 ? min(facts.protein / proteinTarget, 1) : 1
        return kcalWeight * kcalScore + (1 - kcalWeight) * proteinScore
    }

    /// The average fit across everyone, or nil when the recipe's nutrition is unknown.
    public func fit(recipe index: Int) -> Double? {
        guard usesNutrition, recipeNutrition.indices.contains(index), let facts = recipeNutrition[index] else { return nil }
        let fits = mealTargets.map { fit(facts, target: $0) }
        return fits.reduce(0, +) / Double(fits.count)
    }

    /// Added to the Tonight score for a recipe.
    public func adjustment(recipe index: Int, match: RecipeMatch) -> Double {
        var bonus = 0.0
        if let fit = fit(recipe: index) {
            bonus += style.nutritionWeight * (2 * fit - 1)
        }
        if style == .budget {
            // Budget means buying less: every missing item costs double, and nothing missing is a plus.
            bonus -= Double(match.missing.count) * 1.5
            if match.canMake { bonus += 1 }
        }
        return bonus
    }

    /// A copy aiming a little higher or lower, to balance the rest of the week.
    func scaled(kcal: Double, protein: Double) -> NutritionObjective {
        var copy = self
        copy.mealTargets = mealTargets.map {
            var target = $0
            target.kcal *= kcal
            target.protein *= protein
            return target
        }
        return copy
    }
}
