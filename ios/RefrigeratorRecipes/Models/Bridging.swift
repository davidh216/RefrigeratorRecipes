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
