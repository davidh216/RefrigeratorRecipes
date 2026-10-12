import FridgeCore
import Foundation

// Names of FridgeCore's choices in the app's language. FridgeCore keeps its English titles (its tests and
// the chef's prompt use them); everything a person reads or hears goes through these instead.

extension FoodCategory {
    var localizedTitle: String {
        switch self {
        case .produce: String(localized: "Produce")
        case .dairy: String(localized: "Dairy & eggs")
        case .meat: String(localized: "Meat")
        case .seafood: String(localized: "Seafood")
        case .bakery: String(localized: "Bakery")
        case .frozen: String(localized: "Frozen")
        case .grains: String(localized: "Grains & dry goods")
        case .condiments: String(localized: "Sauces & spices")
        case .beverages: String(localized: "Drinks")
        case .snacks: String(localized: "Snacks")
        case .other: String(localized: "Other")
        }
    }
}

extension Allergen {
    var localizedTitle: String {
        switch self {
        case .milk: String(localized: "Milk")
        case .egg: String(localized: "Eggs")
        case .fish: String(localized: "Fish")
        case .shellfish: String(localized: "Shellfish")
        case .treeNut: String(localized: "Tree nuts")
        case .peanut: String(localized: "Peanuts")
        case .wheat: String(localized: "Wheat")
        case .soy: String(localized: "Soy")
        case .sesame: String(localized: "Sesame")
        case .gluten: String(localized: "Gluten")
        }
    }
}

extension Diet {
    var localizedTitle: String {
        switch self {
        case .vegetarian: String(localized: "Vegetarian")
        case .vegan: String(localized: "Vegan")
        case .pescatarian: String(localized: "Pescatarian")
        }
    }
}

extension NutritionGoal {
    var localizedTitle: String {
        switch self {
        case .lose: String(localized: "Lose weight")
        case .maintain: String(localized: "Maintain")
        case .gain: String(localized: "Gain weight")
        case .moreProtein: String(localized: "Eat more protein")
        }
    }
}

extension BodySex {
    var localizedTitle: String {
        switch self {
        case .female: String(localized: "Female")
        case .male: String(localized: "Male")
        case .unspecified: String(localized: "Prefer not to say")
        }
    }
}

extension ActivityLevel {
    var localizedTitle: String {
        switch self {
        case .sedentary: String(localized: "Mostly sitting")
        case .light: String(localized: "Lightly active")
        case .moderate: String(localized: "Moderately active")
        case .active: String(localized: "Very active")
        case .veryActive: String(localized: "Athlete")
        }
    }
}

extension PlanStyle {
    var localizedTitle: String {
        switch self {
        case .balanced: String(localized: "Balanced")
        case .highProtein: String(localized: "High protein")
        case .lighter: String(localized: "Lighter")
        case .budget: String(localized: "Budget")
        }
    }
}

extension TargetStatus {
    /// "under target", "on target", "over target".
    var localizedLabel: String {
        switch self {
        case .under: String(localized: "under target")
        case .onTarget: String(localized: "on target")
        case .over: String(localized: "over target")
        }
    }
}

extension Cuisine {
    /// The name to show for a stored cuisine string, in the app's language; unknown values are shown as typed.
    static func localizedDisplayName(for raw: String) -> String {
        if let id = id(for: raw), let cuisine = cuisine(id) { return cuisine.localizedName }
        return raw.capitalized
    }

    /// The taxonomy id for what someone typed, which may be the name the app showed them ("멕시코" → "mexican").
    static func id(forTyped text: String) -> String? {
        if let id = id(for: text) { return id }
        return all.first { $0.localizedName.compare(text, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame }?.id
    }
}

extension DietConflict {
    /// The reason in the app's language: an allergen or diet name, or the avoided food as typed.
    var localizedReason: String {
        if let allergen = Allergen.allCases.first(where: { $0.title == reason }) { return allergen.localizedTitle }
        if let diet = Diet.allCases.first(where: { $0.title == reason }) { return diet.localizedTitle }
        return reason
    }
}

enum LocalizedList {
    /// "a", "a and b", "a, b and c" in the app's language; longer lists are shortened to "a, b and 2 more".
    static func and(_ items: [String]) -> String {
        if items.count <= 3 { return items.formatted(.list(type: .and)) }
        return String(localized: "\(items[0]), \(items[1]) and \(items.count - 2) more")
    }

    /// "milk and wheat", listing each reason once — the localized `DietRules.summary`.
    static func conflicts(_ conflicts: [DietConflict]) -> String {
        var seen: [String] = []
        for conflict in conflicts where !seen.contains(conflict.localizedReason) {
            seen.append(conflict.localizedReason)
        }
        return and(seen.map { $0.localizedLowercase })
    }
}

extension TonightPick {
    /// One short line explaining the pick, in the app's language (`TonightPlanner.reason`).
    var localizedReason: String {
        if !rescues.isEmpty {
            let names = LocalizedList.and(rescues.map { $0.localizedLowercase })
            return rescues.count == 1 ? String(localized: "Uses \(names) before it goes bad")
                                      : String(localized: "Uses \(names) before they go bad")
        }
        if match.canMake { return String(localized: "You have everything for this") }
        return String(localized: "Just need \(LocalizedList.and(match.missing.map { $0.localizedLowercase }))")
    }
}

extension HouseholdMember {
    /// "Milk, peanuts · vegetarian · no cilantro" in the app's language, or nil when there's nothing to note.
    /// (`restrictionSummary` is the English one, for the chef.)
    var localizedRestrictionSummary: String? {
        var parts: [String] = []
        let allergyNames = Allergen.allCases.filter { allergens.contains($0) }.map(\.localizedTitle)
        if !allergyNames.isEmpty { parts.append(allergyNames.formatted(.list(type: .and))) }
        let dietNames = Diet.allCases.filter { diets.contains($0) }.map { $0.localizedTitle.localizedLowercase }
        if !dietNames.isEmpty { parts.append(dietNames.formatted(.list(type: .and))) }
        if !avoid.isEmpty { parts.append(String(localized: "no \(avoid.formatted(.list(type: .and)))")) }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    /// "Lose weight · 1,800 kcal · 110 g protein", or nil without a goal.
    var goalSummary: String? {
        guard let goal, let targets = dailyTargets else { return nil }
        return String(localized: "\(goal.localizedTitle) · \(Int(targets.kcal)) kcal · \(Int(targets.protein)) g protein")
    }
}
