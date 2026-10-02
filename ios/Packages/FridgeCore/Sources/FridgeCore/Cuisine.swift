import Foundation

/// One cuisine from the fixed taxonomy (HANDOFF-cuisines-languages-moods.md §1.3).
///
/// `Recipe.cuisine` stays a plain string (so the CloudKit schema doesn't change); it holds one of these ids.
public struct Cuisine: Hashable, Sendable, Identifiable {
    public enum Region: String, CaseIterable, Sendable {
        case northAmerica, latinAmerica, europe, middleEast, africa, southAsia, eastAsia, southeastAsia, other

        public var title: String {
            switch self {
            case .northAmerica: "North America"
            case .latinAmerica: "Latin America & Caribbean"
            case .europe: "Europe"
            case .middleEast: "Middle East & North Africa"
            case .africa: "Africa"
            case .southAsia: "South Asia"
            case .eastAsia: "East Asia"
            case .southeastAsia: "Southeast Asia"
            case .other: "Other"
            }
        }
    }

    public let id: String
    public let name: String
    public let region: Region
    /// Other names that mean this cuisine: countries, sub-cuisines and old library values.
    public let aliases: [String]

    public init(_ id: String, _ name: String, _ region: Region, aliases: [String] = []) {
        self.id = id
        self.name = name
        self.region = region
        self.aliases = aliases
    }

    /// For anything that isn't one of the cuisines below.
    public static let otherID = "other"

    public static let all: [Cuisine] = [
        // North America
        Cuisine("american", "American", .northAmerica,
                aliases: ["usa", "us", "new american", "modern american", "classic american", "diner", "bbq", "barbecue", "hawaiian"]),
        Cuisine("southern", "Southern & Soul", .northAmerica, aliases: ["southern", "soul", "soul food", "southern us", "lowcountry"]),
        Cuisine("cajun-creole", "Cajun & Creole", .northAmerica, aliases: ["cajun", "creole", "louisiana", "new orleans"]),
        Cuisine("tex-mex", "Tex-Mex", .northAmerica, aliases: ["texmex", "southwestern"]),
        Cuisine("canadian", "Canadian", .northAmerica, aliases: ["quebecois", "french canadian"]),

        // Latin America & Caribbean
        Cuisine("mexican", "Mexican", .latinAmerica, aliases: ["oaxacan", "yucatecan"]),
        Cuisine("caribbean", "Caribbean", .latinAmerica,
                aliases: ["jamaican", "cuban", "puerto rican", "dominican", "haitian", "trinidadian", "west indian"]),
        Cuisine("brazilian", "Brazilian", .latinAmerica),
        Cuisine("peruvian", "Peruvian", .latinAmerica),
        Cuisine("argentinian", "Argentinian", .latinAmerica, aliases: ["argentine", "argentinean", "uruguayan"]),
        Cuisine("colombian", "Colombian", .latinAmerica, aliases: ["venezuelan"]),

        // Europe
        Cuisine("italian", "Italian", .europe, aliases: ["sicilian", "tuscan", "roman", "neapolitan", "italian american", "italian-american"]),
        Cuisine("french", "French", .europe, aliases: ["provencal", "parisian", "bistro"]),
        Cuisine("spanish", "Spanish", .europe, aliases: ["basque", "catalan", "tapas"]),
        Cuisine("greek", "Greek", .europe, aliases: ["cypriot", "mediterranean"]),
        Cuisine("british-irish", "British & Irish", .europe, aliases: ["british", "english", "irish", "scottish", "welsh", "uk"]),
        Cuisine("german-austrian", "German & Austrian", .europe, aliases: ["german", "austrian", "bavarian", "swiss"]),
        Cuisine("eastern-european", "Polish & Eastern European", .europe,
                aliases: ["polish", "eastern european", "russian", "ukrainian", "hungarian", "czech", "slovak", "romanian", "georgian", "balkan"]),
        Cuisine("scandinavian", "Scandinavian", .europe, aliases: ["nordic", "swedish", "norwegian", "danish", "finnish", "icelandic"]),
        Cuisine("portuguese", "Portuguese", .europe),

        // Middle East & North Africa
        Cuisine("levantine", "Lebanese & Levantine", .middleEast,
                aliases: ["lebanese", "levantine", "syrian", "palestinian", "jordanian", "middle eastern", "middle-eastern", "arab"]),
        Cuisine("turkish", "Turkish", .middleEast, aliases: ["ottoman"]),
        Cuisine("persian", "Persian", .middleEast, aliases: ["iranian"]),
        Cuisine("north-african", "Moroccan & North African", .middleEast,
                aliases: ["moroccan", "north african", "tunisian", "algerian", "egyptian", "libyan", "maghrebi"]),
        Cuisine("israeli", "Israeli", .middleEast),

        // Africa
        Cuisine("ethiopian", "Ethiopian", .africa, aliases: ["eritrean"]),
        Cuisine("west-african", "West African", .africa,
                aliases: ["nigerian", "ghanaian", "senegalese", "ivorian", "liberian", "sierra leonean"]),
        Cuisine("south-african", "South African", .africa, aliases: ["cape malay"]),

        // South Asia
        Cuisine("indian", "Indian", .southAsia,
                aliases: ["north indian", "south indian", "punjabi", "bengali", "goan", "keralan", "gujarati", "mughlai", "indo chinese"]),
        Cuisine("pakistani", "Pakistani", .southAsia),
        Cuisine("sri-lankan", "Sri Lankan", .southAsia),

        // East Asia
        Cuisine("chinese", "Chinese", .eastAsia,
                aliases: ["cantonese", "sichuan", "szechuan", "szechwan", "hunan", "shanghainese", "dim sum", "chinese american", "chinese-american"]),
        Cuisine("japanese", "Japanese", .eastAsia, aliases: ["okinawan"]),
        Cuisine("korean", "Korean", .eastAsia, aliases: ["korean american"]),
        Cuisine("taiwanese", "Taiwanese", .eastAsia),

        // Southeast Asia
        Cuisine("thai", "Thai", .southeastAsia, aliases: ["isan", "lao", "laotian"]),
        Cuisine("vietnamese", "Vietnamese", .southeastAsia),
        Cuisine("filipino", "Filipino", .southeastAsia, aliases: ["philippine", "pinoy"]),
        Cuisine("indonesian-malaysian", "Indonesian & Malaysian", .southeastAsia,
                aliases: ["indonesian", "malaysian", "singaporean", "balinese", "malay", "peranakan"]),

        Cuisine(otherID, "Other", .other, aliases: ["fusion", "international", "global"]),
    ]

    public static let ids: [String] = all.map(\.id)

    private static let byID: [String: Cuisine] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    private static let lookup: [String: String] = {
        var map: [String: String] = [:]
        for cuisine in all {
            for spelling in [cuisine.id, cuisine.name] + cuisine.aliases {
                map[RecipeTag.key(spelling)] = cuisine.id
            }
        }
        return map
    }()

    public static func cuisine(_ id: String) -> Cuisine? { byID[id] }

    /// The taxonomy id a free-text cuisine means ("Sichuan" → "chinese"), or nil when it isn't one we know.
    public static func id(for raw: String) -> String? {
        if byID[raw] != nil { return raw }
        let normalized = RecipeTag.key(raw)
        guard !normalized.isEmpty else { return nil }
        return lookup[normalized]
    }

    /// For imports: a known id, or "other" for anything else (including an empty cuisine).
    public static func idOrOther(for raw: String) -> String {
        id(for: raw) ?? otherID
    }

    /// The name to show for a stored cuisine string; unknown values are shown as typed.
    public static func displayName(for raw: String) -> String {
        if let id = id(for: raw), let cuisine = byID[id] { return cuisine.name }
        return raw.capitalized
    }
}

// MARK: - Explore

extension Cuisine {
    /// Only cuisines with at least this many recipes are shown in Explore, so every page has real choice.
    public static let minimumToShow = 6

    /// One line for the top of a cuisine page: what cooks there tend to reach for, not "the" definition.
    public var intro: String { Self.intros[id] ?? "" }

    static let intros: [String: String] = [
        "american": "Diner classics, backyard grills and weeknight bakes from all over the US.",
        "southern": "Slow-simmered greens, skillet cornbread and Sunday-supper favorites from the American South.",
        "cajun-creole": "Louisiana cooking built on the trinity of onion, celery and bell pepper.",
        "tex-mex": "Cheesy, cumin-warm Texas favorites with deep Mexican roots.",
        "canadian": "Hearty, cold-weather cooking from coast to coast.",
        "mexican": "Bright salsas, slow braises and weeknight tacos from Mexico's many regions.",
        "caribbean": "Allspice, thyme and citrus from Jamaican, Cuban, Puerto Rican and Dominican kitchens.",
        "brazilian": "Beans and rice, slow stews and big-flavored grills from Brazil.",
        "peruvian": "Ají peppers, potatoes and bold marinades from Peru's coast and mountains.",
        "argentinian": "Grilled meats, chimichurri and Italian-influenced home cooking.",
        "colombian": "Comforting soups, arepas and rice dishes from Colombia.",
        "italian": "Pasta, slow sauces and simple, ingredient-first cooking from Italy's regions.",
        "french": "Bistro classics and everyday French home cooking.",
        "spanish": "Olive oil, garlic and smoked paprika, from tapas to one-pan rice.",
        "greek": "Lemon, oregano, olive oil and feta: sunny Greek and Mediterranean cooking.",
        "british-irish": "Pies, roasts and cozy puddings from Britain and Ireland.",
        "german-austrian": "Hearty braises, dumplings and bakes from Germany and Austria.",
        "eastern-european": "Dumplings, soups and stews from Poland and its neighbors.",
        "scandinavian": "Simple, seasonal Nordic cooking: fish, rye and dill.",
        "portuguese": "Seafood, piri-piri and slow stews from Portugal.",
        "levantine": "Za'atar, tahini, lemon and herbs from Lebanon, Syria, Jordan and Palestine.",
        "turkish": "Grills, lentil soups and yogurt-cool sides from Turkey.",
        "persian": "Saffron rice, fresh herbs and slow, tangy stews from Iran.",
        "north-african": "Warm spices, preserved lemon and couscous from Morocco and its neighbors.",
        "israeli": "Market-fresh salads, shakshuka and tahini from Israel's mixed kitchens.",
        "ethiopian": "Berbere-spiced stews and lentils, made for sharing.",
        "west-african": "Jollof, peanut stews and peppery sauces from Nigeria, Ghana and Senegal.",
        "south-african": "Braai, bobotie and Cape Malay curries from South Africa.",
        "indian": "Dals, curries and spice-layered home cooking from India's many regions.",
        "pakistani": "Karahis, biryanis and dals from Pakistani home kitchens.",
        "sri-lankan": "Coconut curries and fragrant rice from Sri Lanka.",
        "chinese": "Stir-fries, braises and noodles from home kitchens across China.",
        "japanese": "Rice bowls, miso and teriyaki: clean, balanced Japanese home cooking.",
        "korean": "Gochujang, garlic and sesame, from sizzling stir-fries to bubbling stews.",
        "taiwanese": "Three-cup chicken, braised pork rice and night-market favorites from Taiwan.",
        "thai": "Sweet, sour, salty and spicy, balanced in every bowl.",
        "vietnamese": "Fresh herbs, fish sauce and lime from Vietnamese home cooking.",
        "filipino": "Tangy, savory adobos, soups and noodles from the Philippines.",
        "indonesian-malaysian": "Coconut, lemongrass and sambal from Indonesia, Malaysia and Singapore.",
    ]

    /// A cuisine shown in Explore, with how many recipes it has.
    public struct ExploreItem: Identifiable, Sendable {
        public let cuisine: Cuisine
        public let count: Int
        public var id: String { cuisine.id }
    }

    /// One region's cuisines in Explore.
    public struct ExploreGroup: Sendable {
        public let region: Region
        public let cuisines: [ExploreItem]
    }

    /// Cuisines to show in Explore, grouped by region in the taxonomy's order, each with its count.
    /// Cuisines with fewer than `minimum` recipes, and "other", are left out.
    public static func explore(counts: [String: Int], minimum: Int = minimumToShow) -> [ExploreGroup] {
        Region.allCases.compactMap { region in
            let shown = all
                .filter { $0.region == region && $0.id != otherID }
                .compactMap { cuisine -> ExploreItem? in
                    let count = counts[cuisine.id] ?? 0
                    return count >= minimum ? ExploreItem(cuisine: cuisine, count: count) : nil
                }
            return shown.isEmpty ? nil : ExploreGroup(region: region, cuisines: shown)
        }
    }
}
