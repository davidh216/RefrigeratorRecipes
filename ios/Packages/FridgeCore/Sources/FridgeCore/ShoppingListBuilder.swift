import Foundation

public struct NeededItem: Equatable, Sendable {
    public var name: String
    public var quantity: Double
    public var unit: String
    /// Titles of the recipes that need this item.
    public var forRecipes: [String]
}

public struct PlannedRecipe: Sendable {
    public var title: String
    public var requirements: [IngredientRequirement]
    /// Multiplier applied to quantities (planned servings ÷ recipe servings).
    public var scale: Double

    public init(title: String, requirements: [IngredientRequirement], scale: Double = 1) {
        self.title = title
        self.requirements = requirements
        self.scale = scale
    }
}

public enum ShoppingListBuilder {
    /// Aggregates what planned recipes need and subtracts what is already stocked
    /// or already on the shopping list.
    ///
    /// Quantities are only summed and subtracted when units agree; if the pantry
    /// has the item in a different unit, it is treated as covered because unit
    /// conversion between e.g. "cups" and "pieces" is not knowable.
    public static func build(
        planned: [PlannedRecipe],
        stock: [StockItem],
        alreadyListed: [String] = [],
        staples: [String] = RecipeMatcher.defaultStaples
    ) -> [NeededItem] {
        let stapleKeys = Set(staples.map(IngredientName.normalize))
        let listedKeys = alreadyListed.map(IngredientName.normalize)

        struct Key: Hashable { let name: String; let unit: String }
        var order: [Key] = []
        var totals: [Key: NeededItem] = [:]

        for recipe in planned {
            for req in recipe.requirements where !req.isOptional {
                let normalized = IngredientName.normalize(req.name)
                guard !normalized.isEmpty, !stapleKeys.contains(normalized) else { continue }
                let key = Key(name: normalized, unit: req.unit.lowercased())
                if var existing = totals[key] {
                    existing.quantity += req.quantity * recipe.scale
                    if !existing.forRecipes.contains(recipe.title) { existing.forRecipes.append(recipe.title) }
                    totals[key] = existing
                } else {
                    order.append(key)
                    totals[key] = NeededItem(
                        name: req.name,
                        quantity: req.quantity * recipe.scale,
                        unit: req.unit,
                        forRecipes: [recipe.title]
                    )
                }
            }
        }

        return order.compactMap { key -> NeededItem? in
            guard var item = totals[key] else { return nil }
            if listedKeys.contains(where: { IngredientName.matches($0, key.name) }) { return nil }

            let stocked = stock.filter { IngredientName.matches($0.name, key.name) }
            guard !stocked.isEmpty else { return item }

            let sameUnit = stocked.filter { $0.unit.lowercased() == key.unit }
            if sameUnit.isEmpty || item.quantity <= 0 { return nil }
            let onHand = sameUnit.reduce(0) { $0 + $1.quantity }
            item.quantity -= onHand
            return item.quantity > 0.0001 ? item : nil
        }
    }
}
