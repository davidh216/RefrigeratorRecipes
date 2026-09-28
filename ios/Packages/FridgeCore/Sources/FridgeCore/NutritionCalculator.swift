import Foundation

/// A recipe's estimated nutrition per serving.
public struct NutritionEstimate: Equatable, Sendable {
    public var perServing: NutritionFacts
    /// Ingredients the estimate covers, out of `total`.
    public var covered: Int
    public var total: Int
    /// Ingredients left out: unknown food, or an amount that can't be turned into grams.
    public var missing: [String]

    /// 0…1. Below `NutritionCalculator.reliableCoverage` the UI calls it partial.
    public var coverage: Double { total == 0 ? 0 : Double(covered) / Double(total) }
    public var isReliable: Bool { total > 0 && coverage >= NutritionCalculator.reliableCoverage }
}

public enum NutritionCalculator {
    public static let reliableCoverage = 0.8

    /// Grams of an ingredient amount, or nil when the unit can't be converted for this food.
    /// A zero quantity ("salt, to taste") counts as 0 g.
    public static func grams(quantity: Double, unit: String, food: FoodNutrition, ingredient: String) -> Double? {
        guard quantity > 0 else { return 0 }
        let canonical = KitchenUnit.canonical(unit)
        if let perUnit = food.gramsPerUnit[canonical] { return quantity * perUnit }
        if let grams = KitchenUnit.convert(quantity, from: canonical, to: "g") { return grams }
        if let ml = KitchenUnit.convert(quantity, from: canonical, to: "ml") {
            return ml * (food.gramsPerCup ?? 236.6) / 236.6
        }
        // A weight-only food asked for by count, e.g. "2 chicken breasts" when only a per-item weight is missing.
        return nil
    }

    /// Nutrition per serving for a recipe. Optional ingredients are left out.
    public static func estimate(
        requirements: [IngredientRequirement],
        servings: Int,
        table: NutritionTable = .standard
    ) -> NutritionEstimate {
        let required = requirements.filter { !$0.isOptional }
        var total = NutritionFacts.zero
        var covered = 0
        var missing: [String] = []
        for requirement in required {
            guard let food = table.lookup(requirement.name),
                  let grams = grams(quantity: requirement.quantity, unit: requirement.unit, food: food, ingredient: requirement.name)
            else {
                missing.append(requirement.name)
                continue
            }
            covered += 1
            total = total + food.per100g.scaled(by: grams / 100)
        }
        return NutritionEstimate(
            perServing: total.scaled(by: 1 / Double(max(servings, 1))),
            covered: covered,
            total: required.count,
            missing: missing
        )
    }
}
