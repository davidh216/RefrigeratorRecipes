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
    /// The name matching and nutrition use: the English one when there is one.
    var matchName: String { canonicalName.isEmpty ? name : canonicalName }

    var requirement: IngredientRequirement {
        IngredientRequirement(name: matchName, quantity: quantity, unit: unit, isOptional: isOptional)
    }

    /// In the units the user picked in Settings; the recipe keeps its own.
    var displayQuantity: String {
        QuantityFormatter.string(quantity: quantity, unit: unit, system: AppSettings.unitSystem)
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
        QuantityFormatter.string(quantity: quantity, unit: unit, system: AppSettings.unitSystem)
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

extension HouseholdMember {
    var goal: NutritionGoal? {
        get { NutritionGoal(rawValue: goalRaw) }
        set { goalRaw = newValue?.rawValue ?? "" }
    }

    var sex: BodySex {
        get { BodySex(rawValue: sexRaw) ?? .unspecified }
        set { sexRaw = newValue.rawValue }
    }

    var activity: ActivityLevel {
        get { ActivityLevel(rawValue: activityRaw) ?? .light }
        set { activityRaw = newValue.rawValue }
    }

    /// Age, height and weight, when all three are filled in and plausible.
    var bodyDetails: BodyDetails? {
        let details = BodyDetails(age: age, sex: sex, heightCm: heightCm, weightKg: weightKg, activity: activity)
        return details.isComplete ? details : nil
    }

    /// Daily targets, or nil without a goal.
    var dailyTargets: NutritionFacts? {
        get {
            guard goal != nil, targetKcal > 0 else { return nil }
            return NutritionFacts(kcal: targetKcal, protein: targetProtein, carbs: targetCarbs, fat: targetFat, fiber: targetFiber)
        }
        set {
            let facts = newValue ?? .zero
            targetKcal = facts.kcal
            targetProtein = facts.protein
            targetCarbs = facts.carbs
            targetFat = facts.fat
            targetFiber = facts.fiber
        }
    }

    /// "Lose weight · 1,800 kcal · 110 g protein", or nil without a goal.
    var goalSummary: String? {
        guard let goal, let targets = dailyTargets else { return nil }
        return "\(goal.title) · \(Int(targets.kcal).formatted()) kcal · \(Int(targets.protein)) g protein"
    }
}

enum Household {
    /// Everyone's restrictions merged: what a shared meal has to respect.
    static func restrictions(_ members: [HouseholdMember]) -> Restrictions {
        Restrictions.merged(members.map(\.restrictions))
    }

    /// Daily targets of everyone who has set a goal.
    static func dailyTargets(_ members: [HouseholdMember]) -> [NutritionFacts] {
        members.compactMap(\.dailyTargets)
    }

    /// The average person's daily target, or nil when nobody has a goal.
    static func averageDailyTarget(_ members: [HouseholdMember]) -> NutritionFacts? {
        let targets = dailyTargets(members)
        guard !targets.isEmpty else { return nil }
        return targets.reduce(NutritionFacts.zero, +).scaled(by: 1 / Double(targets.count))
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
        // Both names: the English one for the keyword lists, the shown one as typed (the user may have edited it).
        let conflicts = DietRules.conflicts(ingredients: sortedIngredients.flatMap { $0.canonicalName.isEmpty ? [$0.name] : [$0.canonicalName, $0.name] },
                                            restrictions: restrictions)
        var seen = Set<DietConflict>()
        return conflicts.filter { seen.insert($0).inserted }
    }

    /// Whether the allergy keywords cover this recipe's language. Recipes whose ingredients all have
    /// English names are covered whatever language the rest is in.
    var allergyCheckAvailable: Bool {
        let ingredients = sortedIngredients
        if ingredients.allSatisfy({ !$0.canonicalName.isEmpty }) { return true }
        return RecipeLanguage.allergyCheckAvailable(title: title, ingredients: ingredients.map(\.name))
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

    /// Per-serving nutrition when the estimate is reliable enough to plan with.
    func plannableNutrition(table: NutritionTable) -> NutritionFacts? {
        let estimate = nutrition(table: table)
        return estimate.isReliable ? estimate.perServing : nil
    }
}
