import Foundation

/// Normalizes free-form ingredient names so "2 Large Tomatoes, diced" and
/// "tomato" compare as the same thing.
public enum IngredientName {
    /// Words that describe preparation or size rather than the ingredient itself.
    static let descriptors: Set<String> = [
        "fresh", "freshly", "large", "small", "medium", "chopped", "diced", "minced",
        "sliced", "grated", "shredded", "ground", "whole", "ripe", "raw", "cooked",
        "boneless", "skinless", "organic", "frozen", "dried", "canned", "extra",
        "virgin", "finely", "roughly", "thinly", "softened", "melted", "room",
        "temperature", "optional", "to", "taste", "of", "a", "an", "the", "and",
    ]

    /// Words whose trailing "s" is not a plural.
    static let singularExceptions: Set<String> = [
        "hummus", "couscous", "asparagus", "molasses", "swiss", "citrus", "grass",
        "bass", "watercress", "anise", "series", "cheese", "lettuce", "rice",
    ]

    /// Lowercased, punctuation-free, singular tokens with descriptors removed.
    public static func tokens(_ raw: String) -> [String] {
        let lowered = raw.lowercased()
        // Anything after a comma or parenthesis is usually a preparation note.
        let head = lowered.split(whereSeparator: { $0 == "," || $0 == "(" }).first.map(String.init) ?? lowered
        let words = head
            .components(separatedBy: CharacterSet.letters.inverted)
            .filter { !$0.isEmpty }
            .filter { !descriptors.contains($0) }
            .map(singularize)
        return words
    }

    /// Canonical key used for grouping and equality.
    public static func normalize(_ raw: String) -> String {
        tokens(raw).joined(separator: " ")
    }

    /// Whether a stocked item satisfies a recipe ingredient.
    ///
    /// Two names match when one's tokens are a subset of the other's, so pantry
    /// "chicken breast" covers recipe "chicken" and vice versa.
    public static func matches(_ a: String, _ b: String) -> Bool {
        let ta = Set(tokens(a)), tb = Set(tokens(b))
        guard !ta.isEmpty, !tb.isEmpty else { return false }
        return ta.isSubset(of: tb) || tb.isSubset(of: ta)
    }

    static func singularize(_ word: String) -> String {
        guard word.count > 3, !singularExceptions.contains(word) else { return word }
        if word.hasSuffix("ies") { return String(word.dropLast(3)) + "y" }
        if word.hasSuffix("oes") { return String(word.dropLast(2)) }
        if word.hasSuffix("ches") || word.hasSuffix("shes") || word.hasSuffix("xes") {
            return String(word.dropLast(2))
        }
        if word.hasSuffix("ss") || word.hasSuffix("us") { return word }
        if word.hasSuffix("s") { return String(word.dropLast()) }
        return word
    }
}
