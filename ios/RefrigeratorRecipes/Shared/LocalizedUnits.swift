import FridgeCore
import Foundation

// Units in the app's language: "2 tazas", "1큰술", "200 克". Recipes, the fridge and the shopping list keep
// their English units (matching, conversion and the chef all read them); only what's shown changes.
// The String Catalog has "unit.<name>.one" / "unit.<name>.other" for each unit below, looked up at runtime.

enum LocalizedUnit {
    /// Spellings `KitchenUnit.canonical` doesn't reduce to the catalog's names.
    private static let spellings: [String: String] = [
        "leaves": "leaf", "inches": "inch", "bunches": "bunch", "dashes": "dash", "boxes": "box",
        "pinches": "pinch", "loaves": "loaf", "lbs": "lb", "pkg": "package", "packages": "package",
    ]

    /// The catalog name for an English unit ("Tablespoons" → "tbsp", "pcs" → "piece"), or nil for none.
    static func key(_ unit: String) -> String? {
        var lower = unit.lowercased().trimmingCharacters(in: .whitespaces)
        while lower.hasSuffix(".") { lower.removeLast() }
        guard !lower.isEmpty else { return nil }
        if let spelled = spellings[lower] { return spelled }
        let canonical = KitchenUnit.canonical(lower)
        // "piece", "pcs", "each", "whole"… all mean a count.
        return canonical.isEmpty ? "piece" : canonical.replacingOccurrences(of: " ", with: "-")
    }

    /// The unit's name in the app's language for `quantity`, or the unit as written when there's no
    /// translation (English, or a unit someone typed in their own language).
    static func name(_ unit: String, quantity: Double) -> String {
        guard AppLanguage.current != "en", let key = key(unit) else { return unit }
        let form = "unit.\(key).\(quantity > 1 ? "other" : "one")"
        let shown = Bundle.main.localizedString(forKey: form, value: nil, table: nil)
        return shown == form ? unit : shown
    }
}

enum LocalizedQuantity {
    /// "1½ tazas", or the amount alone. With a `system`, converted to it first (Settings → Units).
    static func string(quantity: Double, unit: String, system: UnitSystem? = nil) -> String {
        let parts = system.map { QuantityFormatter.parts(quantity: quantity, unit: unit, system: $0) }
            ?? (number: QuantityFormatter.number(quantity), unit: unit.trimmingCharacters(in: .whitespaces), quantity: quantity)
        let name = LocalizedUnit.name(parts.unit, quantity: parts.quantity)
        if parts.number.isEmpty { return name }
        if name.isEmpty { return parts.number }
        // "%1$@ %2$@", or without the space where the language writes "2컵".
        let format = Bundle.main.localizedString(forKey: "unit.amount", value: "%1$@ %2$@", table: nil)
        return String(format: format, parts.number, name)
    }
}
