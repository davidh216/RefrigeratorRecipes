import Foundation

/// Converts kitchen quantities between units of the same kind.
public enum KitchenUnit {
    private enum Kind { case volume, weight, count }

    /// Canonical unit name → (kind, size in the kind's base unit: ml, g, or items).
    private static let table: [String: (Kind, Double)] = [
        "tsp": (.volume, 4.929), "tbsp": (.volume, 14.787), "cup": (.volume, 236.6),
        "fl oz": (.volume, 29.57), "ml": (.volume, 1), "l": (.volume, 1000),
        "pint": (.volume, 473.2), "quart": (.volume, 946.4), "gal": (.volume, 3785.4),
        "g": (.weight, 1), "kg": (.weight, 1000), "oz": (.weight, 28.35), "lb": (.weight, 453.6),
        "": (.count, 1), "dozen": (.count, 12),
    ]

    private static let aliases: [String: String] = [
        "teaspoon": "tsp", "t": "tsp", "tablespoon": "tbsp", "tbs": "tbsp", "tbl": "tbsp",
        "c": "cup", "fluid ounce": "fl oz", "floz": "fl oz", "milliliter": "ml", "millilitre": "ml",
        "liter": "l", "litre": "l", "pt": "pint", "qt": "quart", "gallon": "gal",
        "gram": "g", "gm": "g", "kilogram": "kg", "kilo": "kg", "ounce": "oz", "pound": "lb",
        "piece": "", "pc": "", "each": "", "ea": "", "ct": "", "count": "", "whole": "", "item": "",
        "doz": "dozen",
    ]

    /// Lowercased, singular, alias-resolved unit ("Tablespoons." → "tbsp").
    public static func canonical(_ raw: String) -> String {
        var unit = raw.lowercased().trimmingCharacters(in: .whitespaces)
        while unit.hasSuffix(".") { unit.removeLast() }
        // Try as written, then without a plural "s" ("cups", "lbs", "pieces").
        var candidates = [unit]
        if unit.count > 1, unit.hasSuffix("s"), !unit.hasSuffix("ss") { candidates.append(String(unit.dropLast())) }
        for candidate in candidates {
            if let alias = aliases[candidate] { return alias }
            if table[candidate] != nil { return candidate }
        }
        // Unknown units ("bags", "bunches") still compare equal to their singular.
        return candidates.last ?? unit
    }

    /// `quantity` expressed in `to`, or nil when the units measure different things
    /// (or either unit is unknown, like "bag" or "bunch").
    public static func convert(_ quantity: Double, from: String, to: String) -> Double? {
        let a = canonical(from), b = canonical(to)
        if a == b { return quantity }
        guard let (kindA, sizeA) = table[a], let (kindB, sizeB) = table[b], kindA == kindB else { return nil }
        return quantity * sizeA / sizeB
    }
}

/// What cooking a recipe does to one pantry item.
public struct CookDeduction: Equatable, Sendable {
    public enum Change: Equatable, Sendable {
        /// Some is left: the new quantity, in the item's own unit.
        case reduce(to: Double)
        /// All of it was used.
        case remove
        /// The amounts can't be compared (different kinds of unit, or an unmeasured
        /// ingredient); the user decides.
        case unknown
    }

    /// Index into the `stock` array passed to the planner.
    public var stockIndex: Int
    /// Recipe ingredient names that drew on this item.
    public var ingredients: [String]
    /// How much the recipe calls for, for display ("4 tbsp"); empty when unmeasured.
    public var neededText: String
    public var change: Change
}

public enum CookPlanner {
    /// Works out how cooking a recipe changes the pantry.
    ///
    /// Each required, non-staple ingredient draws on matching items, soonest-expiring
    /// first. Quantities are converted when the units are compatible; otherwise the
    /// item is reported as `.unknown` so the user can say whether any is left.
    public static func deductions(
        requirements: [IngredientRequirement],
        scale: Double = 1,
        stock: [StockItem],
        staples: [String] = RecipeMatcher.defaultStaples
    ) -> [CookDeduction] {
        let stapleKeys = Set(staples.map(IngredientName.normalize))
        var remaining = stock.map(\.quantity)
        var touched: [Int] = []
        var ingredientsFor: [Int: [String]] = [:]
        var neededFor: [Int: [String]] = [:]
        var measured: Set<Int> = []

        func touch(_ index: Int, _ name: String) {
            if ingredientsFor[index] == nil { touched.append(index) }
            if !(ingredientsFor[index] ?? []).contains(name) { ingredientsFor[index, default: []].append(name) }
        }

        for req in requirements where !req.isOptional {
            guard !stapleKeys.contains(IngredientName.normalize(req.name)) else { continue }
            // Matching items with something left (or no recorded amount), soonest-expiring first.
            let lots = stock.indices
                .filter { IngredientName.matches(stock[$0].name, req.name) && (stock[$0].quantity <= 0 || remaining[$0] > 0.0001) }
                .sorted { (stock[$0].expiresAt ?? .distantFuture) < (stock[$1].expiresAt ?? .distantFuture) }
            guard !lots.isEmpty else { continue }

            var needed = req.quantity * scale
            let neededText = QuantityFormatter.string(quantity: needed, unit: req.unit)
            for index in lots {
                touch(index, req.name)
                if !neededText.isEmpty { neededFor[index, default: []].append(neededText) }
                guard needed > 0, stock[index].quantity > 0,
                      let inStockUnit = KitchenUnit.convert(needed, from: req.unit, to: stock[index].unit) else {
                    break
                }
                measured.insert(index)
                if remaining[index] > inStockUnit + 0.0001 {
                    remaining[index] -= inStockUnit
                    needed = 0
                    break
                }
                // This lot is used up; carry the rest over to the next one.
                let usedFromLot = remaining[index]
                remaining[index] = 0
                needed -= KitchenUnit.convert(usedFromLot, from: stock[index].unit, to: req.unit) ?? needed
                if needed <= 0.0001 { break }
            }
        }

        return touched.map { index in
            let change: CookDeduction.Change
            if measured.contains(index) {
                let left = (remaining[index] * 100).rounded() / 100
                change = left <= max(0.01, stock[index].quantity * 0.02) ? .remove : .reduce(to: left)
            } else {
                change = .unknown
            }
            return CookDeduction(
                stockIndex: index,
                ingredients: ingredientsFor[index] ?? [],
                neededText: (neededFor[index] ?? []).joined(separator: " + "),
                change: change
            )
        }
    }
}
