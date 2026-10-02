import Foundation

/// Calories and macros. Stored per 100 g in tables, per serving in estimates.
public struct NutritionFacts: Equatable, Sendable {
    public var kcal: Double
    public var protein: Double
    public var carbs: Double
    public var fat: Double
    public var fiber: Double

    public init(kcal: Double = 0, protein: Double = 0, carbs: Double = 0, fat: Double = 0, fiber: Double = 0) {
        self.kcal = kcal
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
        self.fiber = fiber
    }

    public static let zero = NutritionFacts()

    public static func + (a: NutritionFacts, b: NutritionFacts) -> NutritionFacts {
        NutritionFacts(kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs,
                       fat: a.fat + b.fat, fiber: a.fiber + b.fiber)
    }

    public func scaled(by factor: Double) -> NutritionFacts {
        NutritionFacts(kcal: kcal * factor, protein: protein * factor, carbs: carbs * factor,
                       fat: fat * factor, fiber: fiber * factor)
    }
}

/// Nutrition for one food, plus what it takes to turn kitchen amounts into grams.
public struct FoodNutrition: Equatable, Sendable {
    /// Names this food goes by; the first is the display name.
    public var names: [String]
    public var per100g: NutritionFacts
    /// Density, for volume amounts. nil = treat like water.
    public var gramsPerCup: Double?
    /// Grams per canonical unit: "" is one item, plus "clove", "can", "slice"…
    public var gramsPerUnit: [String: Double]

    public init(names: [String], per100g: NutritionFacts, gramsPerCup: Double? = nil, gramsPerUnit: [String: Double] = [:]) {
        self.names = names
        self.per100g = per100g
        self.gramsPerCup = gramsPerCup
        self.gramsPerUnit = gramsPerUnit
    }
}

/// Looks up foods by ingredient name.
public struct NutritionTable: Sendable {
    private struct Entry: Sendable {
        let food: FoodNutrition
        let keys: [(tokens: Set<String>, name: String)]
        /// A cooked form ("cooked rice"), only used for ingredients that say they're cooked.
        let isCooked: Bool
    }

    private let entries: [Entry]

    public init(_ foods: [FoodNutrition]) {
        entries = foods.map { food in
            Entry(food: food, keys: food.names.map { (Set(IngredientName.tokens($0)), $0) },
                  isCooked: food.names.first?.lowercased().hasPrefix("cooked ") == true)
        }
    }

    /// `extra` foods (e.g. cached estimates) win over the built-in ones on equal matches.
    public func adding(_ extra: [FoodNutrition]) -> NutritionTable {
        NutritionTable(extra + entries.map(\.food))
    }

    /// The most specific food whose name matches the ingredient: "chicken breasts"
    /// finds chicken breast over chicken; "chicken broth" never finds chicken.
    /// "Cooked rice" or "leftover rice" finds cooked rice (about a third of the calories of dry rice);
    /// plain "rice" never does.
    public func lookup(_ ingredient: String) -> FoodNutrition? {
        if Self.saysCooked(ingredient), let cooked = lookup(ingredient, cooked: true) { return cooked }
        return lookup(ingredient, cooked: false)
    }

    /// Whether an ingredient is already cooked: "cooked rice", "Rice, cooked", "leftover jasmine rice".
    static func saysCooked(_ ingredient: String) -> Bool {
        let words = Set(ingredient.lowercased().components(separatedBy: CharacterSet.letters.inverted))
        return words.contains("cooked") || words.contains("leftover")
    }

    private func lookup(_ ingredient: String, cooked: Bool) -> FoodNutrition? {
        let tokens = Set(IngredientName.tokens(ingredient))
        guard !tokens.isEmpty else { return nil }
        var best: (food: FoodNutrition, score: Int)?
        for entry in entries where entry.isCooked == cooked {
            for key in entry.keys where !key.tokens.isEmpty {
                guard key.tokens == tokens || IngredientName.matches(key.name, ingredient) else { continue }
                // Prefer exact names, then names sharing more words with the ingredient.
                let score = key.tokens == tokens ? 1000 : key.tokens.intersection(tokens).count
                if score > (best?.score ?? 0) {
                    best = (entry.food, score)
                }
            }
        }
        return best?.food
    }

    /// About 180 everyday ingredients, per 100 g (USDA FoodData Central, rounded).
    public static let standard = NutritionTable(parse(standardData))

    /// Rows: names (slash-separated) | kcal | protein | carbs | fat | fiber | g per cup | units (unit=grams, "" = one item).
    static func parse(_ data: String) -> [FoodNutrition] {
        data.split(separator: "\n").compactMap { line -> FoodNutrition? in
            let cols = line.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
            guard cols.count == 8, let kcal = Double(cols[1]) else { return nil }
            var units: [String: Double] = [:]
            for pair in cols[7].split(separator: ",") {
                let parts = pair.split(separator: "=", omittingEmptySubsequences: false)
                guard parts.count == 2, let grams = Double(parts[1]) else { continue }
                units[KitchenUnit.canonical(String(parts[0]))] = grams
            }
            return FoodNutrition(
                names: cols[0].split(separator: "/").map { $0.trimmingCharacters(in: .whitespaces) },
                per100g: NutritionFacts(kcal: kcal, protein: Double(cols[2]) ?? 0, carbs: Double(cols[3]) ?? 0,
                                        fat: Double(cols[4]) ?? 0, fiber: Double(cols[5]) ?? 0),
                gramsPerCup: Double(cols[6]),
                gramsPerUnit: units
            )
        }
    }

    static let standardData = """
    chicken breast|120|22.5|0|2.6|0||=200
    chicken thigh|177|19.7|0|10.9|0||=110
    chicken/ground chicken|150|19|0|8|0|225|
    chicken wing|203|18|0|14|0||=32
    beef sirloin/sirloin steak|160|21|0|8|0||=250
    steak/ribeye/flank steak|200|21|0|12|0||=250
    beef/ground beef/beef mince|254|17.2|0|20|0|225|
    pork chop|172|21|0|9|0||=180
    pork/pork shoulder/ground pork|230|17|0|18|0|225|
    pork tenderloin|120|21|0|3.5|0||=450
    bacon|417|13|1.4|40|0||=12,slice=12
    sausage/italian sausage|301|12|2|27|0||=75
    ham|145|21|1.5|5.5|0||slice=28
    turkey/ground turkey|150|19|0|8|0|225|
    lamb|230|19|0|17|0|225|
    salmon/salmon fillet|208|20|0|13|0||=170,fillet=170
    fish/white fish/cod/tilapia/halibut|82|18|0|0.7|0||=150,fillet=150
    tuna|130|28|0|1|0||can=140
    shrimp/prawn|85|20|0|0.5|0|145|=12
    scallop|69|12|3|0.5|0||=20
    tofu|76|8|1.9|4.8|0.3|250|=400,block=400
    tempeh|192|20|7.6|11|0||
    egg|143|12.6|0.7|9.5|0|243|=50
    milk/whole milk|61|3.2|4.8|3.3|0|244|
    heavy cream/whipping cream|340|2.8|2.7|36|0|238|
    half and half|131|3|4.3|11.5|0|242|
    sour cream|198|2.4|4.6|19.4|0|230|
    greek yogurt|97|9|3.9|5|0|245|
    yogurt/plain yogurt|61|3.5|4.7|3.3|0|245|
    butter|717|0.9|0.1|81|0|227|stick=113
    cheddar/cheddar cheese|403|25|1.3|33|0|113|slice=28
    parmesan/parmesan cheese/parmigiano|431|38|4.1|29|0|100|
    mozzarella/mozzarella cheese|280|28|3.1|17|0|112|ball=225
    feta/feta cheese|264|14|4|21|0|150|
    gruyere/gruyere cheese/swiss cheese|413|30|0.4|32|0|108|slice=28
    cream cheese|342|6|4|34|0|232|
    ricotta/ricotta cheese|174|11|3|13|0|246|
    goat cheese|364|22|0|30|0|150|
    cheese|380|24|2|31|0|113|slice=28
    all purpose flour/flour|364|10|76|1|2.7|125|
    whole wheat flour|340|13|72|2.5|10.7|120|
    rice/white rice/jasmine rice/basmati rice/arborio rice|360|6.7|79|0.6|1.3|185|
    cooked rice/cooked white rice/cooked jasmine rice/cooked basmati rice|130|2.7|28|0.3|0.4|158|
    cooked brown rice|123|2.7|25.6|1|1.6|195|
    cooked pasta/cooked spaghetti/cooked noodles|158|5.8|31|0.9|1.8|140|
    cooked quinoa|120|4.4|21.3|1.9|2.8|185|
    brown rice|367|7.5|76|3|3.4|190|
    pasta/spaghetti/linguine/penne/macaroni/fettuccine/elbow pasta/orzo/rigatoni|371|13|75|1.5|3.2|100|
    egg noodle|384|14|71|4.4|3.3|38|
    rice noodle|364|6|80|0.6|1.6|90|
    noodle/ramen/udon/soba|370|12|75|2|3|90|
    quinoa|368|14|64|6|7|170|
    oat/rolled oat/oatmeal|389|17|66|7|10.6|90|
    couscous|376|13|77|0.6|5|173|
    lentil|352|25|63|1|11|190|
    brioche/brioche bread/brioche bun|350|8|46|14|2||=60,slice=40,loaf=500,bun=60
    bread/sourdough bread/white bread|265|9|49|3.2|2.7||=30,slice=30,loaf=450
    whole wheat bread|247|13|41|3.4|7||=32,slice=32,loaf=450
    bun/hamburger bun|279|9|50|4|2||=52
    pita|275|9|56|1.2|2.2||=60
    tortilla/flour tortilla|310|8|50|8|3||=45
    corn tortilla|218|5.7|45|2.9|6.3||=26
    pizza dough|250|7|48|3|2||=450
    breadcrumb/panko|395|13|72|5.3|4.5|108|
    potato|77|2|17|0.1|2.2|150|=210
    sweet potato|86|1.6|20|0.1|3|133|=130
    cornstarch|381|0.3|91|0.1|0.9|128|
    sugar/granulated sugar/white sugar|387|0|100|0|0|200|
    brown sugar|380|0.1|98|0|0|220|
    powdered sugar|389|0|100|0|0|120|
    honey|304|0.3|82|0|0.2|340|
    maple syrup|260|0|67|0.1|0|315|
    chocolate chip|480|4.2|63|24|6|170|
    dark chocolate/chocolate|546|4.9|61|31|7|170|
    cocoa powder/cocoa|228|20|58|14|37|85|
    black bean|132|8.9|24|0.5|8.7|172|can=240
    kidney bean|127|8.7|23|0.5|6.4|177|can=240
    pinto bean|143|9|26|0.7|9|171|can=240
    cannellini bean/white bean|114|7.3|21|0.4|6.3|179|can=240
    chickpea/garbanzo bean|164|8.9|27|2.6|7.6|164|can=240
    bean|130|8.5|23|0.5|7.5|175|can=240
    onion/yellow onion/red onion/white onion|40|1.1|9.3|0.1|1.7|160|=150
    shallot|72|2.5|17|0.1|3.2|160|=40
    green onion/scallion|32|1.8|7.3|0.2|2.6|100|=15,bunch=100
    garlic|149|6.4|33|0.5|2.1|136|=3,clove=3,head=50
    ginger|80|1.8|18|0.8|2|96|=15,inch=15
    carrot|41|0.9|9.6|0.2|2.8|128|=61
    celery|16|0.7|3|0.2|1.6|101|=40,stalk=40,rib=40
    bell pepper/red pepper/green pepper|31|1|6|0.3|2.1|149|=120
    jalapeno|29|0.9|6.5|0.4|2.8|90|=14
    tomato|18|0.9|3.9|0.2|1.2|180|=123
    cherry tomato/grape tomato|18|0.9|3.9|0.2|1.2|149|=17
    crushed tomato|32|1.6|7|0.3|1.9|242|can=794
    canned tomato/whole tomato/san marzano tomato/diced tomato|20|0.9|4|0.2|1|240|can=794
    tomato paste|82|4.3|19|0.5|4.1|262|can=170
    tomato sauce/marinara/marinara sauce|50|1.6|8|1.5|1.9|245|jar=680
    broccoli|34|2.8|6.6|0.4|2.6|91|=300,head=300,crown=300
    cauliflower|25|1.9|5|0.3|2|107|=575,head=575
    spinach/baby spinach|23|2.9|3.6|0.4|2.2|30|bag=170,bunch=340
    kale|49|4.3|9|0.9|3.6|67|bunch=200
    lettuce/romaine|15|1.4|2.9|0.2|1.3|36|=300,head=300
    mixed greens/arugula/salad greens|20|2|3|0.4|1.6|25|bag=140
    cabbage|25|1.3|5.8|0.1|2.5|89|=900,head=900
    cucumber|15|0.7|3.6|0.1|0.5|104|=300
    zucchini|17|1.2|3.1|0.3|1|124|=200
    mushroom/cremini/button mushroom/mixed mushroom|22|3.1|3.3|0.3|1|70|=18
    avocado|160|2|8.5|14.7|6.7|150|=150
    corn/corn kernel|86|3.3|19|1.4|2|154|=100,ear=100,can=340
    pea/green pea|81|5.4|14|0.4|5|145|
    green bean|31|1.8|7|0.2|2.7|100|
    asparagus|20|2.2|3.9|0.1|2.1|134|=16,bunch=450
    brussels sprout|43|3.4|9|0.3|3.8|88|=19
    bean sprout|30|3|6|0.2|1.8|104|
    water chestnut|97|1.4|24|0.1|3|124|can=140
    eggplant|25|1|6|0.2|3|82|=450
    butternut squash/squash|45|1|12|0.1|2|140|=1000
    pumpkin puree/pumpkin|34|1.1|8|0.3|2.9|245|can=425
    olive/kalamata olive|115|0.8|6|11|3.2|135|=4
    lemon|29|1.1|9.3|0.3|2.8||=85
    lemon juice|22|0.4|6.9|0.2|0.3|244|
    lemon zest|47|1.5|16|0.3|10.6|96|
    lime|30|0.7|10.5|0.2|2.8||=67
    lime juice|25|0.4|8.4|0.1|0.4|246|
    orange|47|0.9|12|0.1|2.4||=130
    apple|52|0.3|14|0.2|2.4|125|=180
    banana|89|1.1|23|0.3|2.6|225|=118
    blueberry/berry/mixed berry|57|0.7|14|0.3|2.4|148|
    strawberry|32|0.7|7.7|0.3|2|152|=12
    raisin|299|3.1|79|0.5|3.7|145|
    basil|23|3.2|2.7|0.6|1.6|24|bunch=30,leaf=0.5,sprig=2
    cilantro|23|2.1|3.7|0.5|2.8|16|bunch=30,sprig=1
    parsley|36|3|6.3|0.8|3.3|60|bunch=60,sprig=1
    mint|70|3.8|15|0.9|8|45|bunch=30,sprig=1
    dill|43|3.5|7|1.1|2.1|9|bunch=30,sprig=1
    thyme|101|5.6|24|1.7|14|40|sprig=1,bunch=20
    rosemary|131|3.3|21|5.9|14|40|sprig=1
    herb/fresh herb|30|2.5|5|0.5|2.5|20|bunch=30,sprig=1
    oregano|265|9|69|4.3|43|48|
    bay leaves/bay leaf|313|7.6|75|8.4|26|10|=0.6
    cumin|375|18|44|22|11|96|
    paprika/smoked paprika|282|14|54|13|35|110|
    chili powder|282|13|50|14|35|128|
    cayenne|318|12|57|17|27|85|
    red pepper flake/chili flake|318|12|57|17|27|90|
    cinnamon|247|4|81|1.2|53|125|stick=3
    nutmeg|525|6|49|36|21|110|
    garam masala/curry powder|325|13|56|14|33|100|
    turmeric|312|9.7|67|3.3|23|145|
    italian seasoning/dried herb|270|9|65|5|40|48|
    black pepper/pepper|251|10|64|3.3|25|110|
    salt/sea salt/kosher salt|0|0|0|0|0|292|
    water/ice|0|0|0|0|0|237|
    baking powder|53|0|28|0|0.2|220|
    baking soda|0|0|0|0|0|220|
    yeast|325|40|41|7.6|27|192|packet=7
    vanilla extract/vanilla|288|0.1|12.7|0.1|0|208|
    olive oil/extra virgin olive oil|884|0|0|100|0|216|
    oil/vegetable oil/canola oil/sesame oil/coconut oil/avocado oil|884|0|0|100|0|218|
    soy sauce/tamari|53|8|4.9|0.6|0.8|255|
    fish sauce|35|5|3.6|0|0|290|
    oyster sauce|51|1.4|11|0.3|0.3|290|
    hoisin sauce|220|3.3|44|3.4|2.8|290|
    sriracha/hot sauce|93|1.9|19|0.9|2.2|270|
    rice vinegar/vinegar/white vinegar/apple cider vinegar/red wine vinegar|18|0|0.4|0|0|240|
    balsamic vinegar|88|0.5|17|0|0|255|
    balsamic glaze|250|0.5|60|0|0|300|
    tahini|595|17|21|54|9|240|
    peanut butter|588|25|20|50|6|258|
    almond butter|614|21|19|56|10|256|
    tamarind paste|239|2.8|62|0.6|5|260|
    mayonnaise/mayo|680|1|0.6|75|0|220|
    ketchup|101|1|27|0.1|0.3|240|
    mustard/dijon mustard|60|3.7|5.8|3.3|4|250|
    salsa|36|1.5|7|0.2|1.9|260|jar=454
    pesto|470|5|6|48|1.5|250|
    coconut milk|197|2|2.8|21|0|226|can=400
    chicken broth/chicken stock|6|0.6|0.4|0.2|0|240|carton=946,can=411
    vegetable broth/vegetable stock|5|0.2|1|0|0|240|carton=946
    beef broth/beef stock|7|1.1|0.1|0.2|0|240|carton=946
    white wine/wine|82|0.1|2.6|0|0|236|
    red wine|85|0.1|2.6|0|0|236|
    beer|43|0.5|3.6|0|0|236|can=355
    peanut|567|26|16|49|8.5|146|
    almond|579|21|22|50|12.5|143|=1.2
    walnut|654|15|14|65|6.7|117|
    cashew|553|18|30|44|3.3|137|
    pecan|691|9|14|72|9.6|109|
    pine nut|673|14|13|68|3.7|135|
    pumpkin seed/pepita|559|30|11|49|6|129|
    sesame seed|573|18|23|50|12|144|
    chia seed|486|17|42|31|34|170|
    coconut/shredded coconut|660|6.9|24|65|16|93|
    """
}
