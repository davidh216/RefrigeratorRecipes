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
        let trimmed = unit.trimmingCharacters(in: .whitespaces)
        // Capital T is a tablespoon; lowercased, "t" would read as a teaspoon.
        if ["T", "T.", "Tb", "Tb.", "Tbs", "Tbs."].contains(trimmed) { return "tbsp" }
        var lower = trimmed.lowercased()
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
        translated(unit, quantity: quantity) ?? unit
    }

    /// The translated name, or nil when there's none (English, or an unknown unit).
    static func translated(_ unit: String, quantity: Double) -> String? {
        guard AppLanguage.current != "en", let key = key(unit) else { return nil }
        let form = "unit.\(key).\(quantity > 1 ? "other" : "one")"
        let shown = Bundle.main.localizedString(forKey: form, value: nil, table: nil)
        return shown == form ? nil : shown
    }
}

enum LocalizedQuantity {
    /// "1½ tazas", or the amount alone. With a `system`, converted to it first (Settings → Units).
    static func string(quantity: Double, unit: String, system: UnitSystem? = nil) -> String {
        let parts = system.map { QuantityFormatter.parts(quantity: quantity, unit: unit, system: $0) }
            ?? (number: QuantityFormatter.number(quantity), unit: unit.trimmingCharacters(in: .whitespaces), quantity: quantity)
        let translated = LocalizedUnit.translated(parts.unit, quantity: parts.quantity)
        let name = translated ?? parts.unit
        if parts.number.isEmpty { return name }
        if name.isEmpty { return parts.number }
        // "%1$@ %2$@", or without the space where the language writes "2컵". A unit left as written
        // ("2 pack") keeps its space.
        guard translated != nil else { return "\(parts.number) \(name)" }
        let format = Bundle.main.localizedString(forKey: "unit.amount", value: "%1$@ %2$@", table: nil)
        return String(format: format, parts.number, name)
    }
}
