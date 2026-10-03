import Foundation

/// The FDA's nine major food allergens, plus gluten.
public enum Allergen: String, CaseIterable, Codable, Sendable, Identifiable {
    case milk, egg, fish, shellfish, treeNut, peanut, wheat, soy, sesame, gluten

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .milk: "Milk"
        case .egg: "Eggs"
        case .fish: "Fish"
        case .shellfish: "Shellfish"
        case .treeNut: "Tree nuts"
        case .peanut: "Peanuts"
        case .wheat: "Wheat"
        case .soy: "Soy"
        case .sesame: "Sesame"
        case .gluten: "Gluten"
        }
    }
}

public enum Diet: String, CaseIterable, Codable, Sendable, Identifiable {
    case vegetarian, vegan, pescatarian

    public var id: String { rawValue }
    public var title: String { rawValue.capitalized }
}

/// What one person (or a whole household, merged) can't or won't eat.
public struct Restrictions: Equatable, Sendable {
    public var allergens: Set<Allergen>
    public var diets: Set<Diet>
    /// Anything else to leave out ("cilantro", "mushrooms").
    public var avoid: [String]

    public init(allergens: Set<Allergen> = [], diets: Set<Diet> = [], avoid: [String] = []) {
        self.allergens = allergens
        self.diets = diets
        self.avoid = avoid
    }

    public var isEmpty: Bool { allergens.isEmpty && diets.isEmpty && avoid.isEmpty }

    /// Everyone's restrictions at once, for food the whole household shares.
    public static func merged(_ all: [Restrictions]) -> Restrictions {
        var merged = Restrictions()
        for item in all {
            merged.allergens.formUnion(item.allergens)
            merged.diets.formUnion(item.diets)
            for name in item.avoid where !merged.avoid.contains(where: { IngredientName.normalize($0) == IngredientName.normalize(name) }) {
                merged.avoid.append(name)
            }
        }
        return merged
    }
}

/// An ingredient that breaks a restriction, and why ("Parmesan", "milk").
public struct DietConflict: Hashable, Sendable {
    public var ingredient: String
    /// Allergen or diet title, or the avoided food as the user typed it.
    public var reason: String

    public init(ingredient: String, reason: String) {
        self.ingredient = ingredient
        self.reason = reason
    }
}

/// Keyword-based allergen and diet checks, in English and Spanish.
///
/// This can miss things (brand recipes, unusual names), so the app only ever says
/// "contains", never "free of". A recipe in a language without keywords gets a visible
/// "allergy check not available" note instead of a silent pass (`RecipeLanguage`).
public enum DietRules {
    /// Languages (ISO 639-1) whose ingredient names the keyword lists cover.
    public static let checkedLanguages: Set<String> = ["en", "es", "ko"]

    private struct Rule {
        /// Each entry is one or more words that must all appear in the ingredient.
        let keywords: [[String]]
        /// Ingredients containing any of these word groups are exempt from this rule.
        let except: [[String]]
        /// Korean keywords, matched inside words: Korean writes compound ingredient names without
        /// spaces ("새우젓" is salted shrimp), so whole-word matching would miss them.
        let korean: [String]
        let koreanExcept: [String]

        init(_ keywords: [String], except: [String] = [], korean: [String] = [], koreanExcept: [String] = []) {
            self.keywords = keywords.map { IngredientName.tokens($0) }
            self.except = except.map { IngredientName.tokens($0) }
            self.korean = korean
            self.koreanExcept = koreanExcept
        }

        func matches(_ tokens: Set<String>) -> Bool {
            if except.contains(where: { Set($0).isSubset(of: tokens) }) { return false }
            if keywords.contains(where: { !$0.isEmpty && Set($0).isSubset(of: tokens) }) { return true }
            guard !korean.isEmpty else { return false }
            // Exempt words are removed before looking (땅콩버터 is peanut butter, not butter).
            // Composed form: folding accents can split Hangul syllables into jamo.
            var text = tokens.sorted().joined(separator: " ").precomposedStringWithCanonicalMapping
            for word in koreanExcept { text = text.replacingOccurrences(of: word, with: " ") }
            return korean.contains { text.contains($0) }
        }
    }

    private static let nonDairyMilks = ["coconut milk", "almond milk", "oat milk", "soy milk", "rice milk",
                                        "cashew milk", "coconut cream", "cream of tartar", "peanut butter",
                                        "almond butter", "cashew butter", "apple butter", "cocoa butter",
                                        "sunflower butter", "vegan", "dairy free", "non dairy",
                                        // Spanish
                                        "leche de coco", "leche de almendra", "leche de avena", "leche de soya",
                                        "leche de soja", "leche de arroz", "crema de coco", "crema de cacahuate",
                                        "crema de mani", "mantequilla de mani", "mantequilla de cacahuate",
                                        "sin lactosa vegana", "vegano", "vegana", "sin lacteos",
                                        "crema de avellana", "crema de almendra"]

    private static let allergenRules: [Allergen: Rule] = [
        .milk: Rule(["milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "ghee", "whey", "buttermilk",
                     "parmesan", "parmigiano", "mozzarella", "cheddar", "feta", "ricotta", "gouda", "brie",
                     "mascarpone", "halloumi", "paneer", "gruyere", "pecorino", "burrata", "custard",
                     "creme fraiche", "half and half", "queso", "kefir", "casein",
                     // Spanish
                     "leche", "mantequilla", "crema", "nata", "yogur", "requeson", "jocoque", "cajeta",
                     "dulce de leche", "lechera", "condensada", "evaporada"],
                    except: nonDairyMilks,
                    korean: ["우유", "버터", "치즈", "크림", "요거트", "요구르트", "연유", "생크림", "분유", "유청"],
                    koreanExcept: ["땅콩버터", "아몬드버터", "코코넛크림", "코코넛밀크", "두유", "귀리우유", "아몬드우유",
                                   "아이스크림치즈"]),
        .egg: Rule(["egg", "mayonnaise", "mayo", "aioli", "meringue",
                    "huevo", "huevos", "yema", "yemas", "clara", "claras", "mayonesa", "merengue"],
                   except: ["vegan mayo", "egg free", "mayonesa vegana", "sin huevo"],
                   korean: ["계란", "달걀", "마요네즈", "메추리알", "노른자", "흰자", "머랭"]),
        .fish: Rule(["fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "sardine", "anchovy",
                     "mackerel", "haddock", "snapper", "sea bass", "swordfish", "catfish", "pollock",
                     "worcestershire", "bonito", "dashi",
                     "pescado", "salmon", "atun", "bacalao", "tilapia", "merluza", "trucha", "sardina", "sardinas",
                     "anchoa", "anchoas", "boquerone", "boquerones", "huachinango", "robalo", "mojarra", "pescado dorado",
                     "pez espada", "bagre", "caballa", "salsa inglesa"],
                   korean: ["생선", "연어", "참치", "대구", "고등어", "멸치", "명태", "황태", "북어", "동태", "가자미", "꽁치",
                            "갈치", "조기", "굴비", "삼치", "광어", "도미", "액젓", "피시소스", "어묵", "다시마육수", "가쓰오",
                            "맛살"]),
        .shellfish: Rule(["shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel", "oyster",
                          "crawfish", "crayfish", "langoustine", "squid", "calamari", "octopus",
                          "camaron", "camarones", "gamba", "gambas", "langostino", "langostinos", "cangrejo",
                          "jaiba", "langosta", "vieira", "vieiras", "almeja", "almejas", "mejillon", "mejillones",
                          "ostion", "ostiones", "ostra", "ostras", "calamar", "calamares", "pulpo", "mariscos",
                          "marisco", "callo de hacha", "callos de hacha"],
                          korean: ["새우", "꽃게", "대게", "게살", "킹크랩", "랍스터", "가리비", "조개", "홍합", "굴", "오징어",
                                   "문어", "낙지", "주꾸미", "전복", "바지락", "소라", "꼬막", "관자", "해물", "해산물"]),
        .treeNut: Rule(["almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut", "macadamia",
                        "pine nut", "brazil nut", "pesto", "praline", "marzipan", "nutella", "frangipane",
                        "almendra", "almendras", "nuez", "nueces", "pecana", "pecanas", "anacardo", "anacardos",
                        "maranon", "pistacho", "pistachos", "avellana", "avellanas", "pinon", "pinones",
                        "mazapan", "turron", "pistache", "pistaches"],
                       except: ["nutmeg", "nuez moscada"],
                       korean: ["아몬드", "호두", "캐슈", "피스타치오", "헤이즐넛", "잣", "마카다미아", "피칸", "브라질너트"]),
        .peanut: Rule(["peanut", "satay", "groundnut", "cacahuate", "cacahuates", "cacahuete", "cacahuetes",
                       "mani", "manies", "manises"],
                       korean: ["땅콩"]),
        .wheat: Rule(["flour", "bread", "pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni",
                      "lasagna", "noodle", "tortilla", "couscous", "bulgur", "breadcrumb", "panko",
                      "soy sauce", "seitan", "cracker", "pita", "bun", "croissant", "farro", "semolina",
                      "orzo", "udon", "ramen", "gnocchi", "wheat", "baguette", "crouton", "pastry",
                      "pie crust", "pizza dough", "wonton", "dumpling", "naan", "bagel", "spelt",
                      "harina", "trigo", "pan", "bolillo", "telera", "fideo", "fideos", "galleta", "galletas",
                      "cuscus", "semola", "salsa de soya", "salsa de soja", "masa para pizza", "hojaldre",
                      "empanada", "empanadas", "pan rallado", "tortilla de harina", "macarrones", "espagueti",
                      "tallarines", "bizcocho", "panes", "panecillo", "panecillos", "lasana", "codito", "coditos"],
                     except: ["rice flour", "almond flour", "coconut flour", "corn flour", "cornflour", "cassava flour",
                              "chickpea flour", "buckwheat flour", "tapioca flour", "rice noodle",
                              "glass noodle", "corn tortilla", "gluten free", "zucchini noodle",
                              "harina de maiz", "harina de arroz", "harina de almendra", "harina de coco",
                              "harina de garbanzo", "harina de yuca", "masa harina", "tortilla de maiz",
                              "sin gluten", "fideo de arroz", "fideos de arroz", "pan drippings", "pan juice",
                              "sheet pan", "for the pan", "for pan", "trigo sarraceno",
                              "fideo transparente", "fideos transparentes", "fideo de camote", "fideos de camote",
                              "fideo de frijol", "fideos de frijol",
                              // "Pasta de …" in Spanish is a paste, not pasta.
                              "pasta de tomate", "pasta de jitomate", "pasta de curry", "pasta de tamarindo",
                              "pasta de miso", "pasta de ajo", "pasta de chile", "pasta de frijol", "pasta de jengibre",
                              "pasta de cacahuate", "pasta de mani", "pasta de ajonjoli", "pasta de sesamo",
                              "pasta de achiote", "pasta de camaron", "pasta de guayaba", "pasta de gochujang"],
                     korean: ["밀가루", "밀", "빵", "국수", "라면", "파스타", "스파게티", "만두", "부침가루", "튀김가루", "우동",
                              "소면", "칼국수", "수제비", "간장", "고추장", "된장", "쿠키", "크래커", "또띠아"],
                     koreanExcept: ["밀감", "메밀국수", "메밀면", "쌀국수", "당면", "메밀", "쌀가루", "글루텐프리", "쌀빵"]),
        .soy: Rule(["soy", "soya", "tofu", "edamame", "miso", "tempeh", "tamari", "soja"],
                   korean: ["콩", "두부", "된장", "간장", "고추장", "청국장", "두유", "유부", "미소", "낫토", "쌈장"],
                   koreanExcept: ["땅콩", "강낭콩", "완두콩", "병아리콩", "렌틸콩", "녹두", "팥"]),
        .sesame: Rule(["sesame", "tahini", "hummus", "furikake", "halva", "sesamo", "ajonjoli"],
                      korean: ["참깨", "깨", "참기름", "후리가케"],
                      koreanExcept: ["들깨", "들기름"]),
    ]

    /// Gluten is wheat plus these grains.
    private static let glutenOnly = Rule(["barley", "rye", "malt", "beer", "cebada", "centeno", "malta", "cerveza"],
                                         except: ["gluten free", "sin gluten"],
                                         korean: ["보리", "호밀", "맥주", "엿기름", "맥아"])

    private static let meat = Rule(["chicken", "beef", "pork", "bacon", "ham", "sausage", "turkey", "lamb",
                                    "veal", "prosciutto", "salami", "pepperoni", "chorizo", "pancetta",
                                    "duck", "venison", "gelatin", "steak", "mince", "meatball", "lard",
                                    "hot dog", "brisket", "goat",
                                    "pollo", "res", "carne", "cerdo", "puerco", "tocino", "jamon", "salchicha",
                                    "salchichas", "pavo", "cordero", "ternera", "pato", "chivo", "cabrito",
                                    "manteca de cerdo", "longaniza", "carnitas", "chicharron", "chuleta", "chuletas",
                                    "albondiga", "albondigas", "birria", "barbacoa", "gelatina", "venado", "costilla",
                                    "costillas", "bistec", "arrachera"],
                                   except: ["vegan", "plant based", "meatless", "vegetarian", "cauliflower",
                                            "portobello", "jackfruit", "vegano", "vegana", "vegetariano",
                                            "vegetariana", "sin carne", "carne vegetal", "consome vegetal"],
                                   korean: ["고기", "소고기", "쇠고기", "돼지", "닭", "베이컨", "햄", "소시지", "갈비", "불고기",
                                            "삼겹살", "차돌", "양고기", "오리", "사골", "육수", "곱창", "순대", "족발", "편육",
                                            "스팸", "젤라틴"],
                                   koreanExcept: ["물고기", "콩고기", "대체육", "비건", "채식", "채소육수", "버섯육수", "멸치육수",
                                                  "다시마육수", "해물육수"])
    private static let animalOther = Rule(["honey", "miel"], except: ["miel de agave", "miel de maple", "miel de cana",
                                                                      "miel de piloncillo"],
                                          korean: ["꿀"])

    /// Allergens an ingredient name suggests it contains.
    public static func allergens(in ingredient: String) -> Set<Allergen> {
        let tokens = Set(IngredientName.tokens(ingredient))
        guard !tokens.isEmpty else { return [] }
        var found: Set<Allergen> = []
        for (allergen, rule) in allergenRules where rule.matches(tokens) {
            found.insert(allergen)
        }
        if found.contains(.wheat) || glutenOnly.matches(tokens) { found.insert(.gluten) }
        return found
    }

    /// Diets an ingredient breaks.
    public static func dietsBroken(by ingredient: String) -> Set<Diet> {
        let tokens = Set(IngredientName.tokens(ingredient))
        guard !tokens.isEmpty else { return [] }
        let found = allergens(in: ingredient)
        let isMeat = meat.matches(tokens)
        let isSeafood = found.contains(.fish) || found.contains(.shellfish)
        var broken: Set<Diet> = []
        if isMeat { broken.insert(.pescatarian) }
        if isMeat || isSeafood { broken.insert(.vegetarian) }
        if isMeat || isSeafood || found.contains(.milk) || found.contains(.egg) || animalOther.matches(tokens) {
            broken.insert(.vegan)
        }
        return broken
    }

    /// Every ingredient that breaks a restriction, one entry per ingredient and reason.
    public static func conflicts(ingredients: [String], restrictions: Restrictions) -> [DietConflict] {
        guard !restrictions.isEmpty else { return [] }
        var result: [DietConflict] = []
        for ingredient in ingredients {
            for allergen in Allergen.allCases where restrictions.allergens.contains(allergen) && allergens(in: ingredient).contains(allergen) {
                result.append(DietConflict(ingredient: ingredient, reason: allergen.title))
            }
            for diet in Diet.allCases where restrictions.diets.contains(diet) && dietsBroken(by: ingredient).contains(diet) {
                result.append(DietConflict(ingredient: ingredient, reason: diet.title))
            }
            for food in restrictions.avoid where IngredientName.matches(food, ingredient) {
                result.append(DietConflict(ingredient: ingredient, reason: food))
            }
        }
        return result
    }

    public static func fits(ingredients: [String], restrictions: Restrictions) -> Bool {
        conflicts(ingredients: ingredients, restrictions: restrictions).isEmpty
    }

    /// "milk and wheat", listing each reason once.
    public static func summary(_ conflicts: [DietConflict]) -> String {
        var seen: [String] = []
        for conflict in conflicts where !seen.contains(conflict.reason) {
            seen.append(conflict.reason)
        }
        return TonightPlanner.list(seen.map { $0.lowercased() })
    }
}
