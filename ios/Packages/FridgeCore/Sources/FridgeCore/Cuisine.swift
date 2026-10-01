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
        Cuisine("greek", "Greek", .europe, aliases: ["cypriot"]),
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
