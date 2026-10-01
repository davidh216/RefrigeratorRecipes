import Foundation

/// What the mood rules need to know about a recipe.
public struct MoodRecipe: Sendable {
    public var title: String
    public var requirements: [IngredientRequirement]
    public var instructions: [String]
    public var prepMinutes: Int
    public var cookMinutes: Int
    public var servings: Int
    /// Tag ids (or free text; it's normalized).
    public var tags: [String]

    public init(title: String, requirements: [IngredientRequirement], instructions: [String] = [],
                prepMinutes: Int = 0, cookMinutes: Int = 0, servings: Int = 1, tags: [String] = []) {
        self.title = title
        self.requirements = requirements
        self.instructions = instructions
        self.prepMinutes = prepMinutes
        self.cookMinutes = cookMinutes
        self.servings = servings
        self.tags = tags
    }
}

/// The hard rules behind each mood tag (HANDOFF-cuisines-languages-moods.md §1.2).
///
/// A mood tag is only allowed on a recipe that passes its rules. The linter
/// (`ios/tools/recipe_lint.py`) mirrors these for the bundled library; the app uses them
/// to drop mood tags that imported or AI-written recipes don't earn. Softer guidance
/// ("brothy soups, congee") is left to a person.
public enum MoodRules {
    /// Easy to stomach: most fat per serving, in grams.
    public static let gentleMaxFat = 15.0
    /// Easy to stomach: most fibre per serving, in grams.
    public static let gentleMaxFiber = 6.0
    /// Light & fresh: most calories per serving.
    public static let lightMaxKcal = 500.0
    /// Under the weather: most hands-on (prep) minutes.
    public static let underWeatherMaxPrep = 15
    /// Under the weather: most ingredients, not counting staples or optional ones.
    public static let underWeatherMaxIngredients = 8
    /// Cozy night in: least total minutes.
    public static let cozyMinMinutes = 45
    /// Hot day: most minutes of cooking, unless it's no-cook or grilled.
    public static let hotDayMaxCook = 15

    /// Ingredients that make a dish hot: fresh or dried chili, chili pastes and sauces, Sichuan pepper.
    static let chiliWords: [String] = [
        "chili", "chile", "chilli", "chilies", "chiles", "jalapeno", "jalapeño", "serrano", "habanero",
        "scotch bonnet", "thai chili", "bird eye", "cayenne", "chipotle", "red pepper flake",
        "crushed red pepper", "chili flake", "chili powder", "gochujang", "gochugaru", "sriracha",
        "hot sauce", "curry paste", "sichuan pepper", "sichuan peppercorn", "szechuan peppercorn",
        "harissa", "sambal", "chili oil", "chili crisp", "doubanjiang", "aleppo pepper", "piri piri",
        "peri peri", "buffalo sauce", "tabasco", "berbere", "nduja", "ancho", "guajillo",
        "pepper jack", "kimchi",
    ].map { IngredientName.tokens($0) }

    /// Chili words that don't bring real heat.
    static let mildChili: [[String]] = ["sweet chili", "chili bean"].map { IngredientName.tokens($0) }

    static let alcoholWords: [[String]] = [
        "wine", "beer", "ale", "lager", "stout", "sake", "mirin", "shaoxing", "vodka", "rum", "bourbon",
        "whiskey", "whisky", "brandy", "cognac", "sherry", "marsala", "tequila", "mezcal", "liqueur",
        "vermouth", "port", "prosecco", "champagne", "cider", "gin",
    ].map { IngredientName.tokens($0) }

    /// Alcohol words in products without the alcohol.
    static let alcoholFree: [[String]] = [
        "vinegar", "ginger ale", "ginger beer", "root beer", "apple cider", "non alcoholic", "alcohol free",
        "cider vinegar", "port wine cheese", "sherry vinegar", "wine vinegar",
    ].map { IngredientName.tokens($0) }

    /// Whether an ingredient brings chili heat.
    public static func isChili(_ ingredient: String) -> Bool {
        let tokens = Set(IngredientName.tokens(ingredient))
        guard !tokens.isEmpty else { return false }
        if mildChili.contains(where: { Set($0).isSubset(of: tokens) }) { return false }
        return chiliWords.contains { !$0.isEmpty && Set($0).isSubset(of: tokens) }
    }

    public static func isAlcohol(_ ingredient: String) -> Bool {
        let tokens = Set(IngredientName.tokens(ingredient))
        guard !tokens.isEmpty else { return false }
        if alcoholFree.contains(where: { Set($0).isSubset(of: tokens) }) { return false }
        return alcoholWords.contains { !$0.isEmpty && Set($0).isSubset(of: tokens) }
    }

    /// Deep-frying in the method, or oil "for frying" in the list.
    public static func isDeepFried(_ recipe: MoodRecipe) -> Bool {
        let text = (recipe.instructions + recipe.requirements.map(\.name)).joined(separator: " ").lowercased()
        return ["deep-fr", "deep fr", "for frying", "oil for deep"].contains { text.contains($0) }
    }

    /// Cooked and eaten warm: there's cooking time, it isn't no-cook, and it isn't a salad.
    public static func isServedWarm(_ recipe: MoodRecipe) -> Bool {
        let tags = Set(RecipeTag.ids(for: recipe.tags))
        return recipe.cookMinutes > 0 && !tags.contains("no-cook")
            && !recipe.title.localizedCaseInsensitiveContains("salad")
            && !recipe.title.localizedCaseInsensitiveContains("overnight")
    }

    /// Required ingredients that aren't kitchen staples (salt, pepper, oil, water).
    public static func countedIngredients(_ recipe: MoodRecipe, staples: [String] = RecipeMatcher.defaultStaples) -> Int {
        let stapleKeys = Set(staples.map(IngredientName.normalize))
        return recipe.requirements.filter { !$0.isOptional && !stapleKeys.contains(IngredientName.normalize($0.name)) }.count
    }

    /// Why a recipe can't carry a mood: empty when it passes, or when the mood has no hard rules.
    /// Unknown moods return no reasons; it's the vocabulary's job to reject unknown tags.
    public static func violations(mood: String, recipe: MoodRecipe, table: NutritionTable = .standard) -> [String] {
        let id = RecipeTag.id(for: mood) ?? mood
        var reasons: [String] = []
        let names = recipe.requirements.filter { !$0.isOptional }.map(\.name)
        let tags = Set(RecipeTag.ids(for: recipe.tags))

        func nutrition() -> NutritionEstimate? {
            let estimate = NutritionCalculator.estimate(requirements: recipe.requirements, servings: recipe.servings, table: table)
            return estimate.isReliable ? estimate : nil
        }

        switch id {
        case "comfort-food":
            if !isServedWarm(recipe) { reasons.append("comfort food is served warm (not a salad or no-cook)") }
        case "feeling-spicy":
            if !names.contains(where: isChili) { reasons.append("feeling spicy needs a chili ingredient") }
        case "under-the-weather":
            if !isServedWarm(recipe) { reasons.append("under the weather is served warm") }
            if recipe.prepMinutes > underWeatherMaxPrep {
                reasons.append("under the weather needs ≤ \(underWeatherMaxPrep) min hands-on (has \(recipe.prepMinutes))")
            }
            let count = countedIngredients(recipe)
            if count > underWeatherMaxIngredients {
                reasons.append("under the weather needs ≤ \(underWeatherMaxIngredients) ingredients besides staples (has \(count))")
            }
        case "easy-to-stomach":
            if let chili = names.first(where: isChili) { reasons.append("easy to stomach can't have chili (\(chili))") }
            if isDeepFried(recipe) { reasons.append("easy to stomach can't be deep-fried") }
            if let drink = names.first(where: isAlcohol) { reasons.append("easy to stomach can't have alcohol (\(drink))") }
            if let estimate = nutrition() {
                let facts = estimate.perServing
                if facts.fat > gentleMaxFat {
                    reasons.append("easy to stomach needs ≤ \(Int(gentleMaxFat)) g fat per serving (≈\(Int(facts.fat.rounded())) g)")
                }
                if facts.fiber > gentleMaxFiber {
                    reasons.append("easy to stomach needs ≤ \(Int(gentleMaxFiber)) g fibre per serving (≈\(Int(facts.fiber.rounded())) g)")
                }
            } else {
                reasons.append("easy to stomach needs a reliable nutrition estimate")
            }
        case "cozy-night-in":
            let total = recipe.prepMinutes + recipe.cookMinutes
            if total < cozyMinMinutes { reasons.append("cozy night in needs ≥ \(cozyMinMinutes) min in total (has \(total))") }
        case "light-and-fresh":
            if let estimate = nutrition() {
                if estimate.perServing.kcal > lightMaxKcal {
                    reasons.append("light & fresh needs ≤ \(Int(lightMaxKcal)) kcal per serving (≈\(Int(estimate.perServing.kcal.rounded())))")
                }
            } else {
                reasons.append("light & fresh needs a reliable nutrition estimate")
            }
        case "hot-day":
            if !tags.contains("no-cook") && !tags.contains("grill") && recipe.cookMinutes > hotDayMaxCook {
                reasons.append("hot day needs no-cook, grill, or ≤ \(hotDayMaxCook) min of cooking (has \(recipe.cookMinutes))")
            }
        default:
            break
        }
        return reasons
    }

    public static func fits(mood: String, recipe: MoodRecipe, table: NutritionTable = .standard) -> Bool {
        violations(mood: mood, recipe: recipe, table: table).isEmpty
    }

    /// Tags with any mood the recipe doesn't earn removed. Used on imported and AI-written recipes.
    public static func keepingEarnedMoods(_ tags: [String], recipe: MoodRecipe, table: NutritionTable = .standard) -> [String] {
        tags.filter { tag in
            guard let id = RecipeTag.id(for: tag), RecipeTag.tag(id)?.kind == .mood else { return true }
            return fits(mood: id, recipe: recipe, table: table)
        }
    }
}
