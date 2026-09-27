import Foundation

/// The food "crate" an item belongs to. Drives the category color and glyph in
/// the app, and the aisle grouping of the shopping list.
public enum FoodCategory: String, CaseIterable, Identifiable, Sendable {
    case produce, dairy, meat, seafood, bakery, frozen, grains, condiments, beverages, snacks, other

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .produce: return "Produce"
        case .dairy: return "Dairy & eggs"
        case .meat: return "Meat"
        case .seafood: return "Seafood"
        case .bakery: return "Bakery"
        case .frozen: return "Frozen"
        case .grains: return "Grains & dry goods"
        case .condiments: return "Sauces & spices"
        case .beverages: return "Drinks"
        case .snacks: return "Snacks"
        case .other: return "Other"
        }
    }

    /// Infers the category from a free-text category (which wins when it names
    /// one) and the item's name.
    public init(category: String, name: String) {
        self = Self.guess(category: category, name: name)
    }

    /// Shopping aisle order.
    public static let aisleOrder: [FoodCategory] = [
        .produce, .bakery, .meat, .seafood, .dairy, .frozen, .grains, .condiments, .snacks, .beverages, .other,
    ]

    /// An explicit category string wins; otherwise the name is matched against
    /// keyword lists with whole-word matching, so "eggplant" never matches "egg".
    public static func guess(category: String, name: String) -> FoodCategory {
        if let explicit = fromCategoryString(category) { return explicit }

        let joined = joinedWords(name)
        guard joined.count > 2 else { return .other }

        for (keys, result) in nameExceptions where containsAny(joined, keys) {
            return result
        }
        for (result, keys) in nameKeywords where containsAny(joined, keys) {
            return result
        }
        return .other
    }

    /// First non-optional, non-staple ingredient whose guess isn't `.other`; else `.other`.
    /// The caller passes only non-optional ingredient names, in recipe order.
    public static func lead(ingredients: [String], staples: [String]) -> FoodCategory {
        let stapleKeys = Set(staples.map { IngredientName.normalize($0) })
        for ingredient in ingredients {
            if stapleKeys.contains(IngredientName.normalize(ingredient)) { continue }
            let category = guess(category: "", name: ingredient)
            if category != .other { return category }
        }
        return .other
    }

    // MARK: - Tokenizing

    /// Lowercased, singular words. Descriptors are kept on purpose ("frozen" must survive).
    static func words(_ raw: String) -> [String] {
        raw.lowercased()
            .components(separatedBy: CharacterSet.letters.inverted)
            .filter { !$0.isEmpty }
            .map { IngredientName.singularize($0) }
    }

    /// `" word word "`, ready for whole-word `contains(" key ")` checks.
    static func joinedWords(_ raw: String) -> String {
        " " + words(raw).joined(separator: " ") + " "
    }

    static func containsAny(_ joined: String, _ keys: [String]) -> Bool {
        keys.contains { joined.contains(" " + $0 + " ") }
    }

    // MARK: - Category strings

    static let categorySynonyms: [String: FoodCategory] = [
        "vegetable": .produce, "veg": .produce, "veggie": .produce, "veggy": .produce, "fruit": .produce,
        "herb": .produce, "salad": .produce, "green": .produce,
        "egg": .dairy, "cheese": .dairy, "milk": .dairy, "yogurt": .dairy,
        "poultry": .meat, "deli": .meat, "protein": .meat,
        "fish": .seafood, "shellfish": .seafood,
        "bread": .bakery, "baked": .bakery, "baked goods": .bakery,
        "frozen foods": .frozen,
        "grain": .grains, "baking": .grains, "pasta": .grains, "rice": .grains, "cereal": .grains,
        "dry goods": .grains, "bean": .grains, "legume": .grains,
        "condiment": .condiments, "sauce": .condiments, "oil": .condiments, "spice": .condiments,
        "spread": .condiments, "seasoning": .condiments, "dressing": .condiments,
        "beverage": .beverages, "drink": .beverages, "juice": .beverages, "soda": .beverages,
        "snack": .snacks, "sweet": .snacks, "candy": .snacks,
        "canned": .other, "household": .other,
    ]

    /// Resolves a free-text category: an exact raw value, then a whole-string
    /// synonym, then the first word that is a raw value or a synonym
    /// ("Dairy & eggs", "Frozen foods").
    static func fromCategoryString(_ raw: String) -> FoodCategory? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty else { return nil }
        if let exact = FoodCategory(rawValue: trimmed) { return exact }
        if let synonym = categorySynonyms[trimmed] { return synonym }

        let categoryWords = words(trimmed)
        if let synonym = categorySynonyms[categoryWords.joined(separator: " ")] { return synonym }
        for word in categoryWords {
            if let exact = FoodCategory(rawValue: word) { return exact }
            if let synonym = categorySynonyms[word] { return synonym }
        }
        return nil
    }

    // MARK: - Names

    /// Checked before the keyword lists, in this order.
    static let nameExceptions: [([String], FoodCategory)] = [
        (["broth", "stock", "bouillon", "soup"], .other),
        (["peanut butter", "almond butter", "black pepper"], .condiments),
        (["ice cream", "frozen"], .frozen),
        (["butter lettuce", "green bean", "green onion"], .produce),
        (["egg noodle"], .grains),
    ]

    /// Checked in this order; the first hit wins. Keys are singular, in the form
    /// `IngredientName.singularize` produces ("cookies" becomes "cooky").
    static let nameKeywords: [(FoodCategory, [String])] = [
        (.seafood, [
            "salmon", "shrimp", "prawn", "tuna", "cod", "fish", "crab", "scallop", "tilapia", "halibut",
            "mussel", "clam", "lobster", "sardine", "anchovy",
        ]),
        (.meat, [
            "chicken", "beef", "pork", "bacon", "sausage", "turkey", "ham", "lamb", "steak", "prosciutto",
            "salami", "chorizo", "mince", "duck", "veal", "pepperoni", "meatball",
        ]),
        (.dairy, [
            "milk", "cheese", "cheddar", "parmesan", "mozzarella", "feta", "ricotta", "yogurt", "yoghurt",
            "cream", "butter", "egg", "buttermilk", "kefir", "ghee",
        ]),
        (.bakery, [
            "bread", "sourdough", "bagel", "baguette", "bun", "roll", "tortilla", "pita", "croissant",
            "muffin", "naan", "brioche",
        ]),
        (.condiments, [
            "sauce", "ketchup", "mustard", "mayo", "mayonnaise", "vinegar", "oil", "honey", "jam", "salsa",
            "dressing", "syrup", "soy", "pesto", "spice", "cumin", "paprika", "cinnamon", "oregano", "salt",
        ]),
        (.grains, [
            "flour", "rice", "pasta", "spaghetti", "penne", "noodle", "oat", "quinoa", "cereal", "couscous",
            "sugar", "cornstarch", "baking powder", "baking soda", "yeast", "lentil", "bean", "chickpea",
            "breadcrumb",
        ]),
        (.beverages, [
            "coffee", "tea", "juice", "soda", "water", "wine", "beer", "kombucha", "lemonade", "seltzer",
        ]),
        (.snacks, [
            "chip", "cracker", "cookie", "cooky", "chocolate", "pretzel", "popcorn", "nut", "almond", "walnut",
            "cashew", "peanut", "granola", "candy",
        ]),
        (.produce, [
            "apple", "avocado", "banana", "basil", "berry", "blueberry", "strawberry", "raspberry",
            "broccoli", "cabbage", "carrot", "cauliflower", "celery", "cilantro", "cucumber", "eggplant",
            "garlic", "ginger", "grape", "kale", "lemon", "lettuce", "lime", "mango", "mushroom", "onion",
            "orange", "parsley", "pea", "peach", "pear", "pepper", "potato", "scallion", "shallot",
            "spinach", "squash", "sweet potato", "thyme", "rosemary", "tomato", "zucchini", "corn",
            "arugula", "asparagus", "jalapeno", "herb", "salad", "green",
        ]),
    ]
}
