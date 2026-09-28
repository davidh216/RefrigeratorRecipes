import Foundation
import FridgeCore

// Adapters between SwiftData models and the pure FridgeCore value types.

extension PantryItem {
    var stockItem: StockItem {
        StockItem(name: name, quantity: quantity, unit: unit, expiresAt: expiresAt)
    }

    var checkInCandidate: CheckInCandidate {
        CheckInCandidate(name: name, location: locationRaw, expiresAt: expiresAt, addedAt: addedAt, lastConfirmedAt: lastConfirmedAt)
    }

    func expiryStatus(soonThresholdDays: Int) -> ExpiryStatus {
        ExpiryStatus.of(expiresAt: expiresAt, soonThresholdDays: soonThresholdDays)
    }
}

extension RecipeIngredient {
    var requirement: IngredientRequirement {
        IngredientRequirement(name: name, quantity: quantity, unit: unit, isOptional: isOptional)
    }

    var displayQuantity: String {
        QuantityFormatter.string(quantity: quantity, unit: unit)
    }
}

extension Recipe {
    var requirements: [IngredientRequirement] { sortedIngredients.map(\.requirement) }

    func match(stock: [StockItem], staples: [String], soonThresholdDays: Int) -> RecipeMatch {
        RecipeMatcher.match(
            requirements: requirements,
            stock: stock,
            staples: staples,
            soonThresholdDays: soonThresholdDays
        )
    }

    var tonightRecipe: TonightRecipe {
        TonightRecipe(title: title, requirements: requirements, totalMinutes: totalMinutes,
                      tags: tags, isFavorite: isFavorite, lastCookedAt: lastCookedAt)
    }

    /// The meal this recipe is most likely for, from its tags and title.
    var guessedSlot: MealSlot {
        MealSlot(rawValue: MealKind.guess(tags: tags, title: title).rawValue) ?? .dinner
    }

    /// Replaces the ingredient list, keeping order stable.
    func setIngredients(_ items: [RecipeIngredient]) {
        for (index, item) in items.enumerated() { item.order = index }
        ingredients = items
    }
}

extension FoodEvent {
    var outcome: FoodOutcome {
        FoodOutcome(kind: kind == "tossed" ? .tossed : .used, date: date, value: value)
    }
}

extension ShoppingItem {
    var displayQuantity: String {
        QuantityFormatter.string(quantity: quantity, unit: unit)
    }
}

extension HouseholdMember {
    var allergens: Set<Allergen> {
        get { Set(allergensRaw.compactMap(Allergen.init(rawValue:))) }
        set { allergensRaw = newValue.map(\.rawValue).sorted() }
    }

    var diets: Set<Diet> {
        get { Set(dietsRaw.compactMap(Diet.init(rawValue:))) }
        set { dietsRaw = newValue.map(\.rawValue).sorted() }
    }

    var restrictions: Restrictions {
        Restrictions(allergens: allergens, diets: diets, avoid: avoid)
    }

    var displayName: String {
        name.trimmingCharacters(in: .whitespaces).isEmpty ? "Someone" : name
    }

    /// "Milk, peanuts · vegetarian · no cilantro", or nil when there's nothing to note.
    var restrictionSummary: String? {
        var parts: [String] = []
        let allergyNames = Allergen.allCases.filter { allergens.contains($0) }.map(\.title)
        if !allergyNames.isEmpty { parts.append(allergyNames.joined(separator: ", ")) }
        let dietNames = Diet.allCases.filter { diets.contains($0) }.map { $0.title.lowercased() }
        if !dietNames.isEmpty { parts.append(dietNames.joined(separator: ", ")) }
        if !avoid.isEmpty { parts.append("no " + avoid.joined(separator: ", ")) }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

enum Household {
    /// Everyone's restrictions merged: what a shared meal has to respect.
    static func restrictions(_ members: [HouseholdMember]) -> Restrictions {
        Restrictions.merged(members.map(\.restrictions))
    }

    /// Indexes of recipes that break the household's restrictions.
    static func unsafeIndexes(_ recipes: [Recipe], members: [HouseholdMember]) -> Set<Int> {
        let merged = restrictions(members)
        guard !merged.isEmpty else { return [] }
        return Set(recipes.indices.filter { !recipes[$0].conflicts(with: merged).isEmpty })
    }
}

extension Recipe {
    func conflicts(with restrictions: Restrictions) -> [DietConflict] {
        DietRules.conflicts(ingredients: sortedIngredients.map(\.name), restrictions: restrictions)
    }
}

extension IngredientNutrition {
    var food: FoodNutrition {
        var units: [String: Double] = [:]
        for pair in unitsRaw {
            let parts = pair.split(separator: "=", omittingEmptySubsequences: false)
            if parts.count == 2, let grams = Double(parts[1]) { units[String(parts[0])] = grams }
        }
        return FoodNutrition(
            names: [name],
            per100g: NutritionFacts(kcal: kcal, protein: protein, carbs: carbs, fat: fat, fiber: fiber),
            gramsPerCup: gramsPerCup > 0 ? gramsPerCup : nil,
            gramsPerUnit: units
        )
    }
}

enum Nutrition {
    /// The built-in table plus anything Claude has estimated for this household.
    static func table(_ cached: [IngredientNutrition]) -> NutritionTable {
        cached.isEmpty ? .standard : NutritionTable.standard.adding(cached.map(\.food))
    }

    /// "≈ 540 kcal"
    static func kcalText(_ facts: NutritionFacts) -> String {
        "≈ " + Int(facts.kcal.rounded()).formatted() + " kcal"
    }
}

extension Recipe {
    func nutrition(table: NutritionTable) -> NutritionEstimate {
        NutritionCalculator.estimate(requirements: requirements, servings: servings, table: table)
    }
}
