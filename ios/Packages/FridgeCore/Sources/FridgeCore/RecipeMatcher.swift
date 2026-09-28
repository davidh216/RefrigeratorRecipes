import Foundation

/// An ingredient a recipe calls for.
public struct IngredientRequirement: Hashable, Sendable {
    public var name: String
    public var quantity: Double
    public var unit: String
    public var isOptional: Bool

    public init(name: String, quantity: Double = 0, unit: String = "", isOptional: Bool = false) {
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.isOptional = isOptional
    }
}

/// Something the user has on hand.
public struct StockItem: Hashable, Sendable {
    public var name: String
    public var quantity: Double
    public var unit: String
    public var expiresAt: Date?

    public init(name: String, quantity: Double = 1, unit: String = "", expiresAt: Date? = nil) {
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.expiresAt = expiresAt
    }
}

public struct RecipeMatch: Equatable, Sendable {
    /// Required ingredient names the user has (including staples).
    public var have: [String]
    /// Required ingredient names the user is missing.
    public var missing: [String]
    /// How many of `have` come from items that are expired or expiring soon.
    public var usesExpiringCount: Int

    public var requiredCount: Int { have.count + missing.count }
    public var coverage: Double { requiredCount == 0 ? 1 : Double(have.count) / Double(requiredCount) }
    public var canMake: Bool { missing.isEmpty }
}

public enum RecipeMatcher {
    /// Ingredients most kitchens always have; never reported as missing.
    public static let defaultStaples = ["salt", "black pepper", "pepper", "water", "olive oil", "vegetable oil", "oil"]

    public static func match(
        requirements: [IngredientRequirement],
        stock: [StockItem],
        staples: [String] = defaultStaples,
        now: Date = .now,
        soonThresholdDays: Int = 3
    ) -> RecipeMatch {
        var have: [String] = []
        var missing: [String] = []
        var expiring = 0
        let stapleKeys = Set(staples.map(IngredientName.normalize))

        for req in requirements where !req.isOptional {
            if stapleKeys.contains(IngredientName.normalize(req.name)) {
                have.append(req.name)
                continue
            }
            let matches = stock.filter { IngredientName.matches($0.name, req.name) }
            if matches.isEmpty {
                missing.append(req.name)
            } else {
                have.append(req.name)
                let urgent = matches.contains {
                    ExpiryStatus.of(expiresAt: $0.expiresAt, now: now, soonThresholdDays: soonThresholdDays).isUrgent
                }
                if urgent { expiring += 1 }
            }
        }
        return RecipeMatch(have: have, missing: missing, usesExpiringCount: expiring)
    }

    /// Ordering for "what can I make": complete matches first, then recipes that
    /// rescue expiring food, then by coverage and fewest missing items.
    public static func isBetter(_ a: RecipeMatch, than b: RecipeMatch) -> Bool {
        if a.canMake != b.canMake { return a.canMake }
        if a.usesExpiringCount != b.usesExpiringCount { return a.usesExpiringCount > b.usesExpiringCount }
        if a.coverage != b.coverage { return a.coverage > b.coverage }
        return a.missing.count < b.missing.count
    }
}
