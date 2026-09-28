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

    /// Last words that make a different product from the words before them:
    /// "chicken broth" isn't chicken, "butter lettuce" isn't butter.
    static let productHeads: Set<String> = [
        "broth", "stock", "bouillon", "powder", "paste", "sauce", "vinegar", "oil", "lettuce",
        "extract", "flake", "seasoning", "syrup", "chip", "jam", "jelly", "soup",
    ]

    /// Two-word products that are never the same as either word alone.
    static let distinctCompounds: [[String]] = [
        ["coconut", "milk"], ["almond", "milk"], ["oat", "milk"], ["soy", "milk"], ["rice", "milk"],
        ["peanut", "butter"], ["almond", "butter"], ["apple", "butter"],
        ["cream", "cheese"], ["sour", "cream"], ["ice", "cream"], ["coconut", "cream"],
        ["baking", "soda"], ["baking", "powder"], ["green", "onion"], ["sweet", "potato"],
    ]

    /// Whether a stocked item satisfies a recipe ingredient.
    ///
    /// Two names match when one's words are a subset of the other's, so pantry
    /// "chicken breast" covers recipe "chicken" and vice versa. Compounds that name
    /// a different product ("chicken broth", "butter lettuce", "coconut milk") only
    /// match themselves.
    public static func matches(_ a: String, _ b: String) -> Bool {
        let wa = tokens(a), wb = tokens(b)
        let ta = Set(wa), tb = Set(wb)
        guard !ta.isEmpty, !tb.isEmpty else { return false }
        guard ta.isSubset(of: tb) || tb.isSubset(of: ta) else { return false }
        if ta == tb { return true }

        let (shorter, longerWords) = ta.count < tb.count ? (ta, wb) : (tb, wa)
        if let head = longerWords.last, productHeads.contains(head), !shorter.contains(head) { return false }
        for compound in distinctCompounds {
            let inA = compound.allSatisfy { ta.contains($0) }, inB = compound.allSatisfy { tb.contains($0) }
            if inA != inB { return false }
        }
        return true
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
