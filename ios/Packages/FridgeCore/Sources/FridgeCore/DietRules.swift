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

/// Keyword-based allergen and diet checks, in English, Spanish, Korean and Chinese.
///
/// This can miss things (brand recipes, unusual names), so the app only ever says
/// "contains", never "free of". A recipe in a language without keywords gets a visible
/// "allergy check not available" note instead of a silent pass (`RecipeLanguage`).
public enum DietRules {
    /// Languages (ISO 639-1) whose ingredient names the keyword lists cover.
    public static let checkedLanguages: Set<String> = ["en", "es", "ko", "zh"]

    private struct Rule {
        /// Each entry is one or more words that must all appear in the ingredient.
        let keywords: [[String]]
        /// Ingredients containing any of these word groups are exempt from this rule.
        let except: [[String]]
        /// Korean keywords, matched inside words: Korean writes compound ingredient names without
        /// spaces ("새우젓" is salted shrimp), so whole-word matching would miss them.
        let korean: [String]
        let koreanExcept: [String]
        /// Chinese keywords in Simplified characters, matched inside words the same way.
        let chinese: [String]
        let chineseExcept: [String]

        init(_ keywords: [String], except: [String] = [], korean: [String] = [], koreanExcept: [String] = [],
             chinese: [String] = [], chineseExcept: [String] = []) {
            self.keywords = keywords.map { IngredientName.tokens($0) }
            self.except = except.map { IngredientName.tokens($0) }
            self.korean = korean
            self.koreanExcept = koreanExcept
            self.chinese = chinese
            self.chineseExcept = chineseExcept
        }

        func matches(_ tokens: Set<String>) -> Bool {
            if except.contains(where: { Set($0).isSubset(of: tokens) }) { return false }
            if keywords.contains(where: { !$0.isEmpty && Set($0).isSubset(of: tokens) }) { return true }
            guard !korean.isEmpty || !chinese.isEmpty else { return false }
            // Composed form: folding accents can split Hangul syllables into jamo.
            let text = tokens.sorted().joined(separator: " ").precomposedStringWithCanonicalMapping
            // Exempt words are removed before looking (땅콩버터 is peanut butter, not butter).
            if Self.contains(korean, in: text, except: koreanExcept) { return true }
            guard !chinese.isEmpty, text.unicodeScalars.contains(where: { (0x4E00...0x9FFF).contains($0.value) }) else {
                return false
            }
            // Traditional characters (蝦, 雞) are read as Simplified (虾, 鸡) so one list covers both.
            let simplified = text.applyingTransform(StringTransform("Hant-Hans"), reverse: false) ?? text
            return Self.contains(chinese, in: simplified, except: chineseExcept)
        }

        private static func contains(_ keywords: [String], in text: String, except: [String]) -> Bool {
            guard !keywords.isEmpty else { return false }
            var text = text
            for word in except { text = text.replacingOccurrences(of: word, with: " ") }
            return keywords.contains { text.contains($0) }
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
                    korean: ["우유", "버터", "치즈", "크림", "요거트", "요구르트", "연유", "생크림", "분유", "유청", "파니르",
                             "모차렐라", "크레마", "케소", "리코타", "마스카르포네", "파르메산", "페타", "할루미", "기버터",
                             "아이스크림", "둘세"],
                    koreanExcept: ["땅콩버터", "아몬드버터", "코코넛크림", "코코넛밀크", "두유", "귀리우유", "아몬드우유",
                                   "아이스크림치즈", "버터넛"],
                    chinese: ["奶", "酪", "黄油", "芝士", "起司", "乳清", "炼乳", "酸乳", "酥油", "马斯卡彭", "马苏里拉",
                              "帕玛森", "哈罗米", "冰淇淋"],
                    // Coconut and plant milks (大米奶, not 米奶, which would also cut 哈罗米奶酪); 奶白菜 is a bok
                    // choy, 奶油南瓜 butternut squash, 起酥油 shortening, 酪梨 avocado.
                    chineseExcept: ["椰奶", "椰浆", "椰子奶", "豆奶", "杏仁奶", "燕麦奶", "大米奶", "腰果奶", "植物奶",
                                    "奶白菜", "奶油南瓜", "奶油生菜", "起酥油", "酪梨"]),
        .egg: Rule(["egg", "mayonnaise", "mayo", "aioli", "meringue",
                    "huevo", "huevos", "yema", "yemas", "clara", "claras", "mayonesa", "merengue"],
                   except: ["vegan mayo", "egg free", "mayonesa vegana", "sin huevo"],
                   korean: ["계란", "달걀", "마요네즈", "메추리알", "노른자", "흰자", "머랭", "에그"],
                   koreanExcept: ["에그플랜트"],
                   chinese: ["蛋", "美乃滋", "沙拉酱"],
                   chineseExcept: ["蛋白质"]),
        .fish: Rule(["fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "sardine", "anchovy",
                     "mackerel", "haddock", "snapper", "sea bass", "swordfish", "catfish", "pollock",
                     "worcestershire", "bonito", "dashi",
                     "pescado", "salmon", "atun", "bacalao", "tilapia", "merluza", "trucha", "sardina", "sardinas",
                     "anchoa", "anchoas", "boquerone", "boquerones", "huachinango", "robalo", "mojarra", "pescado dorado",
                     "pez espada", "bagre", "caballa", "salsa inglesa"],
                   korean: ["생선", "연어", "참치", "대구", "고등어", "멸치", "명태", "황태", "북어", "동태", "가자미", "꽁치",
                            "갈치", "조기", "굴비", "삼치", "광어", "도미", "액젓", "피시소스", "어묵", "다시마육수", "가쓰오",
                            "맛살", "피시", "우스터", "다시", "틸라피아", "안초비", "가마보코", "해덕"],
                   // 다시마 is kelp; 도미니카 (Dominican) isn't 도미 (sea bream).
                   koreanExcept: ["다시마", "도미니카"],
                   chinese: ["鱼", "鲑", "鳕", "鲭", "鲈", "鲷", "鳗", "鲶", "鲫", "鲤", "鲣", "鳀", "沙丁", "带鱼", "黄花",
                             "柴鱼", "木鱼花", "辣酱油", "喼汁", "伍斯特", "日式高汤"],
                   // Squid, cuttlefish, octopus and abalone are shellfish; 鱼香 ("fish-fragrant") has no fish,
                   // 鱼腥草 is a herb.
                   chineseExcept: ["鱿鱼", "墨鱼", "章鱼", "八爪鱼", "鲍鱼", "甲鱼", "鱼香", "鱼腥草"]),
        .shellfish: Rule(["shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel", "oyster",
                          "crawfish", "crayfish", "langoustine", "squid", "calamari", "octopus",
                          "camaron", "camarones", "gamba", "gambas", "langostino", "langostinos", "cangrejo",
                          "jaiba", "langosta", "vieira", "vieiras", "almeja", "almejas", "mejillon", "mejillones",
                          "ostion", "ostiones", "ostra", "ostras", "calamar", "calamares", "pulpo", "mariscos",
                          "marisco", "callo de hacha", "callos de hacha"],
                          korean: ["새우", "꽃게", "대게", "게살", "킹크랩", "랍스터", "가리비", "조개", "홍합", "굴", "오징어",
                                   "문어", "낙지", "주꾸미", "전복", "바지락", "소라", "꼬막", "관자", "해물", "해산물", "가재",
                                   "크레이피시"],
                          chinese: ["虾", "蟹", "贝", "蚝", "牡蛎", "蛤", "蛏", "螺", "鱿鱼", "墨鱼", "章鱼", "八爪鱼", "鲍鱼",
                                    "青口", "淡菜", "海鲜", "瑶柱", "xo酱"],
                          // Shell and spiral pasta, bagels, tempeh (天贝), shimeji (蟹味菇) and hoisin (海鲜酱) have
                          // no shellfish.
                          chineseExcept: ["贝壳面", "贝壳粉", "贝果", "天贝", "螺丝", "螺旋", "蟹味菇", "海鲜酱"]),
        .treeNut: Rule(["almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut", "macadamia",
                        "pine nut", "brazil nut", "pesto", "praline", "marzipan", "nutella", "frangipane",
                        "almendra", "almendras", "nuez", "nueces", "pecana", "pecanas", "anacardo", "anacardos",
                        "maranon", "pistacho", "pistachos", "avellana", "avellanas", "pinon", "pinones",
                        "mazapan", "turron", "pistache", "pistaches"],
                       except: ["nutmeg", "nuez moscada"],
                       korean: ["아몬드", "호두", "캐슈", "피스타치오", "헤이즐넛", "잣", "마카다미아", "피칸", "브라질너트"],
                       chinese: ["杏仁", "核桃", "胡桃", "腰果", "开心果", "榛子", "夏威夷果", "澳洲坚果", "碧根果", "松子",
                                 "松仁", "巴西坚果", "坚果", "青酱", "能多益"],
                       // Butternut squash (小胡桃南瓜) and chimichurri (阿根廷青酱) have no nuts.
                       chineseExcept: ["胡桃南瓜", "阿根廷青酱"]),
        .peanut: Rule(["peanut", "satay", "groundnut", "cacahuate", "cacahuates", "cacahuete", "cacahuetes",
                       "mani", "manies", "manises"],
                       // Kecap manis is a sweet soy sauce; "manis" would otherwise read as maní.
                       except: ["kecap manis"],
                       korean: ["땅콩"],
                       chinese: ["花生", "沙爹", "沙嗲"]),
        .wheat: Rule(["flour", "bread", "pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni",
                      "lasagna", "noodle", "tortilla", "couscous", "bulgur", "breadcrumb", "panko",
                      "soy sauce", "kecap", "seitan", "cracker", "pita", "bun", "croissant", "farro", "semolina",
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
                              "소면", "칼국수", "수제비", "간장", "고추장", "된장", "쿠키", "크래커", "또띠아", "중력분",
                              "박력분", "강력분", "세몰리나", "불구르", "링귀니", "펜네", "마카로니", "라자냐", "오르조",
                              "누들", "브레드", "크러스트", "반죽", "소바", "면", "몐", "번", "노두유", "쿠스쿠스", "엠파나다",
                              "마니스"],
                     // Rice, buckwheat and glass noodles; milk (밀크), molasses (당밀), cornmeal, oats, turkey
                     // (칠면조), cottonseed oil (면실유), cheesecloth (면포) and tamari. Words are joined in sorted
                     // order, so "쌀국수 면" reads "면 쌀국수".
                     koreanExcept: ["면 쌀국수", "밀감", "메밀국수", "메밀면", "쌀국수", "당면", "메밀", "쌀가루", "글루텐프리",
                                    "쌀빵", "쌀면", "쌀누들", "밀크", "당밀", "콘밀", "오트밀", "칠면조", "면실유",
                                    "면포", "간장 타마리"],
                     chinese: ["面", "小麦", "全麦", "馒头", "包子", "饺子", "馄饨", "云吞", "烧卖", "锅贴", "油条", "意粉",
                               "通心粉", "乌冬", "麸", "饼干", "煎饼", "烙饼", "葱油饼", "薄饼", "烧饼", "月饼", "饼皮",
                               "蛋糕", "披萨", "比萨", "春卷皮", "派皮", "皮塔", "法棍", "吐司", "贝果", "可颂", "粗麦粉", "古斯古斯", "库斯库斯",
                               "酱油", "生抽", "老抽"],
                     // Cornmeal, mung bean and buckwheat flours; tamari and gluten-free soy sauce.
                     chineseExcept: ["玉米面", "玉米薄饼", "玉米饼", "绿豆面", "荞麦粉", "荞麦面粉", "鹰嘴豆细面", "溜酱油",
                                     "无麸质"]),
        .soy: Rule(["soy", "soya", "tofu", "edamame", "miso", "tempeh", "tamari", "soja", "kecap"],
                   korean: ["콩", "두부", "된장", "간장", "고추장", "청국장", "두유", "유부", "미소", "낫토", "쌈장", "템페", "노두유", "마니스"],
                   koreanExcept: ["땅콩", "강낭콩", "완두콩", "병아리콩", "렌틸콩", "녹두", "팥", "카넬리니 콩", "동부콩",
                                  "블랙아이드"],
                   chinese: ["大豆", "黄豆", "豆腐", "豆浆", "豆奶", "豆皮", "豆干", "腐竹", "千张", "素鸡", "毛豆", "纳豆",
                             "豆豉", "味噌", "味增", "天贝", "黄豆酱", "大酱", "海鲜酱", "酱油", "生抽", "老抽"]),
        .sesame: Rule(["sesame", "tahini", "hummus", "furikake", "halva", "sesamo", "ajonjoli"],
                      korean: ["참깨", "깨", "참기름", "후리가케", "타히니", "후무스"],
                      // 어깨살 is a shoulder cut.
                      koreanExcept: ["들깨", "들기름", "어깨"],
                      chinese: ["芝麻", "麻油", "香油", "麻酱", "塔希尼", "鹰嘴豆泥"],
                      // 芝麻菜 is arugula.
                      chineseExcept: ["芝麻菜"]),
    ]

    /// Gluten is wheat plus these grains.
    private static let glutenOnly = Rule(["barley", "rye", "malt", "beer", "cebada", "centeno", "malta", "cerveza"],
                                         except: ["gluten free", "sin gluten"],
                                         korean: ["보리", "호밀", "맥주", "엿기름", "맥아"],
                                         koreanExcept: ["아르보리오"],
                                         chinese: ["大麦", "黑麦", "麦芽", "啤酒", "青稞"],
                                         chineseExcept: ["无麸质"])

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
                                            "스팸", "젤라틴", "치킨", "포크", "라드", "스테이크", "립아이", "초리소", "칠면조",
                                            "브리스킷", "핫도그", "어깨살", "치마살", "등심", "안심", "목살", "양지", "살라미", "페퍼로니",
                                            "프로슈토", "판체타"],
                                   // Collards (콜라드) and urad dal (우라드) aren't lard; hamburger buns aren't ham.
                                   koreanExcept: ["물고기", "콩고기", "대체육", "비건", "채식", "채소육수", "버섯육수", "멸치육수",
                                                  "다시마육수", "해물육수", "육수 채소", "버섯 육수", "멸치 육수", "육수 조개",
                                                  "다시마 육수", "육수 해물", "콜라드", "우라드", "번 햄버거", "햄버거빵"],
                                   chinese: ["肉", "牛", "猪", "鸡", "鸭", "鹅", "羊", "培根", "火腿", "肠", "热狗", "萨拉米", "排骨",
                                             "骨汤", "叉烧", "吉利丁", "明胶"],
                                   // Eggs and milk; avocado (牛油果), cinnamon (肉桂), nutmeg (肉豆蔻), oregano (牛至),
                                   // burdock (牛蒡), croissants (牛角, 羊角), cocktails (鸡尾酒), mushrooms named after
                                   // animals (牛肝菌, 羊肚菌, 鸡枞, 鸡腿菇, 鸡油菌), fruit and nut flesh, and mock meats.
                                   chineseExcept: ["鸡蛋", "鸭蛋", "鹅蛋", "牛奶", "牛乳", "羊奶", "羊乳", "牛油果", "肉桂",
                                                   "肉豆蔻", "牛至", "牛蒡", "牛角", "羊角", "鸡尾酒", "牛肝菌", "羊肚菌",
                                                   "鸡枞", "鸡腿菇", "鸡油菌", "鸡毛菜", "鸡头米", "鸭梨", "羊栖菜", "果肉",
                                                   "椰肉", "龙眼肉", "桂圆肉", "核桃肉", "素肉", "素鸡", "人造肉", "植物肉",
                                                   "蟹肉", "虾肉", "鱼肉", "白肉鱼", "贝肉", "蛤蜊肉", "肠粉", "伏牛花",
                                                   "烤肉酱"])
    private static let animalOther = Rule(["honey", "miel"], except: ["miel de agave", "miel de maple", "miel de cana",
                                                                      "miel de piloncillo"],
                                          korean: ["꿀"], chinese: ["蜂蜜"])

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
