import Foundation

/// One ingredient line from a recipe website, split into amount, unit, name and note.
public struct IngredientLine: Equatable, Sendable {
    public var quantity: Double
    public var unit: String
    public var name: String
    public var note: String
    public var isOptional: Bool

    public init(quantity: Double = 0, unit: String = "", name: String, note: String = "", isOptional: Bool = false) {
        self.quantity = quantity
        self.unit = unit
        self.name = name
        self.note = note
        self.isOptional = isOptional
    }

    private static let fractions: [Character: Double] = [
        "½": 0.5, "⅓": 1.0 / 3, "⅔": 2.0 / 3, "¼": 0.25, "¾": 0.75, "⅕": 0.2, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
    ]

    /// Written unit → the unit the app stores ("Tablespoons" → "tbsp").
    private static let units: [String: String] = [
        "cup": "cup", "cups": "cup", "c": "cup",
        "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp", "tbsps": "tbsp", "tbs": "tbsp", "tbl": "tbsp", "T": "tbsp",
        "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp", "tsps": "tsp", "t": "tsp",
        "ounce": "oz", "ounces": "oz", "oz": "oz",
        "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
        "gram": "g", "grams": "g", "g": "g", "kilogram": "kg", "kilograms": "kg", "kg": "kg",
        "milliliter": "ml", "milliliters": "ml", "millilitre": "ml", "millilitres": "ml", "ml": "ml",
        "liter": "l", "liters": "l", "litre": "l", "litres": "l", "l": "l",
        "pint": "pint", "pints": "pint", "quart": "quart", "quarts": "quart",
        "clove": "clove", "cloves": "clove", "can": "can", "cans": "can", "tin": "can", "tins": "can",
        "slice": "slice", "slices": "slice", "bunch": "bunch", "bunches": "bunch", "head": "head", "heads": "head",
        "stalk": "stalk", "stalks": "stalk", "sprig": "sprig", "sprigs": "sprig", "pinch": "pinch", "pinches": "pinch",
        "stick": "stick", "sticks": "stick", "package": "package", "packages": "package", "pkg": "package",
        "jar": "jar", "jars": "jar", "bag": "bag", "bags": "bag", "block": "block", "blocks": "block",
        "handful": "handful", "handfuls": "handful", "dash": "dash", "dashes": "dash", "fillet": "fillet", "fillets": "fillet",
    ]

    /// Parses "2 1/2 cups all-purpose flour, sifted", "1 (14 oz) can tomatoes", "½ tsp salt",
    /// "Salt and pepper, to taste". Anything it can't read becomes the name, amount 0.
    public static func parse(_ raw: String) -> IngredientLine {
        var text = raw.replacingOccurrences(of: "\u{00A0}", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        text = text.replacingOccurrences(of: #"^[\-•*▢☐]\s*"#, with: "", options: .regularExpression)
        var notes: [String] = []

        // "(14 oz)" and other parentheticals become notes.
        while let range = text.range(of: #"\s*\(([^)]*)\)"#, options: .regularExpression) {
            let inner = text[range].trimmingCharacters(in: CharacterSet(charactersIn: " ()"))
            if !inner.isEmpty { notes.append(inner) }
            text.removeSubrange(range)
        }

        var quantity = 0.0
        var scanner = Substring(text)
        if let (value, rest) = readQuantity(scanner) {
            quantity = value
            scanner = rest
            // "2-3 cloves": skip the upper end of a range.
            if let dash = scanner.firstMatch(of: #/^\s*(?:-|–|to(?=\s+\d))\s*/#) {
                scanner = scanner[dash.range.upperBound...]
                if let (_, afterRange) = readQuantity(scanner) { scanner = afterRange }
            }
        }

        var unit = ""
        let trimmed = scanner.drop { $0 == " " }
        if let word = trimmed.split(separator: " ", maxSplits: 1).first {
            let bare = String(word).trimmingCharacters(in: CharacterSet(charactersIn: ".,"))
            if let mapped = units[bare] ?? units[bare.lowercased()], quantity > 0 || bare.lowercased() == "pinch" {
                unit = mapped
                scanner = trimmed.dropFirst(word.count)
                if quantity == 0 { quantity = 1 }
            } else {
                scanner = trimmed
            }
        }

        var name = scanner.trimmingCharacters(in: .whitespaces)
        if name.lowercased().hasPrefix("of ") { name = String(name.dropFirst(3)) }
        if let comma = name.firstIndex(of: ",") {
            let after = name[name.index(after: comma)...].trimmingCharacters(in: .whitespaces)
            if !after.isEmpty { notes.append(after) }
            name = String(name[..<comma])
        }

        let lowered = (name + " " + notes.joined(separator: " ")).lowercased()
        let isOptional = lowered.contains("optional")
        if lowered.contains("to taste") || lowered.contains("as needed") || lowered.contains("for serving") {
            name = name.replacingOccurrences(of: #"\s*(to taste|as needed|for serving)\s*$"#, with: "",
                                             options: [.regularExpression, .caseInsensitive])
        }
        notes = notes.map { $0.replacingOccurrences(of: #"(?i)\boptional\b,?\s*"#, with: "", options: .regularExpression) }
            .map { $0.trimmingCharacters(in: CharacterSet(charactersIn: " ,;")) }
            .filter { !$0.isEmpty }

        return IngredientLine(quantity: quantity, unit: unit,
                              name: name.trimmingCharacters(in: CharacterSet(charactersIn: " ,;.")),
                              note: notes.joined(separator: ", "), isOptional: isOptional)
    }

    /// "2", "2.5", "1/2", "2 1/2", "½", "2½" at the start.
    private static func readQuantity(_ text: Substring) -> (Double, Substring)? {
        var rest = text.drop { $0 == " " }
        var total = 0.0
        var found = false
        if let match = rest.firstMatch(of: #/^(\d+(?:[.,]\d+)?)/#) {
            total = Double(match.1.replacingOccurrences(of: ",", with: ".")) ?? 0
            rest = rest[match.range.upperBound...]
            found = true
            // A following fraction: "2 1/2", "2½".
            if let fraction = rest.firstMatch(of: #/^\s*(\d+)\/(\d+)/#), let a = Double(fraction.1), let b = Double(fraction.2), b > 0 {
                if total >= 1 && a < b {
                    total += a / b
                } else {
                    // Plain "1/2": the first number was the numerator.
                    return nil
                }
                rest = rest[fraction.range.upperBound...]
            } else if let first = rest.first, let value = fractions[first] {
                total += value
                rest = rest.dropFirst()
            } else if let slash = rest.firstMatch(of: #/^\/(\d+)/#), let b = Double(slash.1), b > 0 {
                total /= b
                rest = rest[slash.range.upperBound...]
            }
        } else if let first = rest.first, let value = fractions[first] {
            total = value
            rest = rest.dropFirst()
            found = true
        }
        return found ? (total, rest) : nil
    }
}
