import Foundation
import SwiftData
import FridgeCore

/// Adds what planned recipes are missing to the shopping list.
enum ShoppingAdder {
    /// - Returns: the number of items added.
    @MainActor
    @discardableResult
    static func addMissing(
        for planned: [PlannedRecipe],
        pantry: [PantryItem],
        existing: [ShoppingItem],
        preferences: KitchenPreferences,
        context: ModelContext
    ) -> Int {
        let needed = ShoppingListBuilder.build(
            planned: planned,
            stock: pantry.map(\.stockItem),
            alreadyListed: existing.filter { !$0.isChecked }.map(\.name),
            staples: preferences.staples
        )
        for item in needed {
            context.insert(ShoppingItem(
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                reason: item.forRecipes.joined(separator: ", ")
            ))
        }
        return needed.count
    }
}
