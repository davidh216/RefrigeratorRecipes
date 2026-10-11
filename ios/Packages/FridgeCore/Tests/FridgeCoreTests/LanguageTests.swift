import XCTest
@testable import FridgeCore

final class LanguageTests: XCTestCase {
    func testSpanishAllergensAndDiets() {
        XCTAssertTrue(DietRules.allergens(in: "Camarones pelados").contains(.shellfish))
        XCTAssertTrue(DietRules.allergens(in: "camarón").contains(.shellfish))
        XCTAssertTrue(DietRules.allergens(in: "Leche entera").contains(.milk))
        XCTAssertTrue(DietRules.allergens(in: "Queso fresco").contains(.milk))
        XCTAssertTrue(DietRules.allergens(in: "Huevos").contains(.egg))
        XCTAssertTrue(DietRules.allergens(in: "Harina de trigo").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "Harina de trigo").contains(.gluten))
        XCTAssertTrue(DietRules.allergens(in: "Cacahuates tostados").contains(.peanut))
        XCTAssertTrue(DietRules.allergens(in: "Nueces picadas").contains(.treeNut))
        XCTAssertTrue(DietRules.allergens(in: "Ajonjolí").contains(.sesame))
        XCTAssertTrue(DietRules.allergens(in: "Salsa de soya").contains(.wheat))
        XCTAssertTrue(DietRules.dietsBroken(by: "Pechuga de pollo").contains(.vegetarian))
        XCTAssertTrue(DietRules.dietsBroken(by: "Miel").contains(.vegan))
    }

    func testSpanishLookalikesDoNotTrip() {
        XCTAssertFalse(DietRules.allergens(in: "Nuez moscada").contains(.treeNut), "nutmeg isn't a nut")
        XCTAssertFalse(DietRules.allergens(in: "Harina de maíz").contains(.wheat))
        XCTAssertFalse(DietRules.allergens(in: "Masa harina").contains(.wheat))
        XCTAssertFalse(DietRules.allergens(in: "Leche de coco").contains(.milk))
        XCTAssertFalse(DietRules.allergens(in: "Tortillas de maíz").contains(.wheat))
        XCTAssertFalse(DietRules.allergens(in: "Pan drippings").contains(.wheat))
        XCTAssertFalse(DietRules.allergens(in: "Pasta de tomate").contains(.wheat), "a paste, not pasta")
        XCTAssertFalse(DietRules.allergens(in: "Pasta de curry rojo").contains(.wheat))
        XCTAssertFalse(DietRules.allergens(in: "Fideos transparentes de camote").contains(.wheat))
        XCTAssertFalse(DietRules.allergens(in: "Ajo dorado").contains(.fish), "dorado is also golden-brown")
        XCTAssertFalse(DietRules.allergens(in: "Oil for the pan").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "Panes para hamburguesa").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "Láminas de lasaña").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "Callos de hacha").contains(.shellfish))
    }

    func testAccentsAreFolded() {
        XCTAssertEqual(IngredientName.normalize("Jalapeño"), IngredientName.normalize("jalapeno"))
        XCTAssertTrue(IngredientName.matches("camarón", "Camaron"))
    }

    func testLanguageDetection() {
        XCTAssertEqual(RecipeLanguage.detect(title: "Arroz con pollo de mi abuela",
                                             ingredients: ["pechuga de pollo", "arroz blanco", "cebolla picada", "caldo de pollo"]), "es")
        XCTAssertTrue(RecipeLanguage.allergyCheckAvailable(title: "Arroz con pollo de mi abuela",
                                                           ingredients: ["pechuga de pollo", "arroz blanco", "cebolla picada"]))
        XCTAssertFalse(RecipeLanguage.allergyCheckAvailable(title: "Gà kho gừng với nước dừa tươi",
                                                            ingredients: ["thịt gà", "gừng tươi", "nước mắm", "đường thốt nốt"]))
        XCTAssertNil(RecipeLanguage.detect(title: "Tea", ingredients: []), "too short to tell")
    }

    func testMetricConversion() {
        let cup = QuantityFormatter.converted(quantity: 1, unit: "cup", to: .metric)
        XCTAssertEqual(cup.unit, "ml")
        XCTAssertEqual(cup.quantity, 235, accuracy: 0.1)
        XCTAssertEqual(QuantityFormatter.string(quantity: 2, unit: "lb", system: .metric), "910 g")
        XCTAssertEqual(QuantityFormatter.string(quantity: 3, unit: "lb", system: .metric), "1.35 kg")
        XCTAssertEqual(QuantityFormatter.string(quantity: 1, unit: "tsp", system: .metric), "5 ml")
        XCTAssertEqual(QuantityFormatter.string(quantity: 2, unit: "cloves", system: .metric), "2 cloves")
        XCTAssertEqual(QuantityFormatter.string(quantity: 1, unit: "cup", system: .us), "1 cup")
    }

    func testUSConversion() {
        XCTAssertEqual(QuantityFormatter.string(quantity: 500, unit: "g", system: .us), "1 lb")
        XCTAssertEqual(QuantityFormatter.string(quantity: 250, unit: "ml", system: .us), "1 cup")
        XCTAssertEqual(QuantityFormatter.string(quantity: 100, unit: "g", system: .us), "3½ oz")
        XCTAssertEqual(QuantityFormatter.string(quantity: 15, unit: "ml", system: .us), "1 tbsp")
        XCTAssertEqual(QuantityFormatter.string(quantity: 200, unit: "g", system: .metric), "200 g")
        XCTAssertEqual(QuantityFormatter.string(quantity: 2.5, unit: "ml", system: .metric), "2.5 ml", "decimals, not ½")
    }
}

final class KoreanDietTests: XCTestCase {
    func testKoreanAllergensInsideCompoundWords() {
        XCTAssertTrue(DietRules.allergens(in: "새우젓").contains(.shellfish), "salted shrimp")
        XCTAssertTrue(DietRules.allergens(in: "굴소스").contains(.shellfish), "oyster sauce")
        XCTAssertTrue(DietRules.allergens(in: "계란 2개").contains(.egg))
        XCTAssertTrue(DietRules.allergens(in: "땅콩").contains(.peanut))
        XCTAssertTrue(DietRules.allergens(in: "밀가루").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "진간장").contains(.soy))
        XCTAssertTrue(DietRules.allergens(in: "진간장").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "참기름").contains(.sesame))
        XCTAssertTrue(DietRules.allergens(in: "우유").contains(.milk))
        XCTAssertTrue(DietRules.allergens(in: "멸치액젓").contains(.fish))
        XCTAssertTrue(DietRules.dietsBroken(by: "돼지고기 목살").contains(.vegetarian))
        XCTAssertTrue(DietRules.dietsBroken(by: "꿀").contains(.vegan))
        XCTAssertTrue(DietRules.allergens(in: "중력분").contains(.wheat), "all-purpose flour")
        XCTAssertTrue(DietRules.allergens(in: "햄버거 번").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "피시 소스").contains(.fish), "spaced fish sauce")
        XCTAssertTrue(DietRules.allergens(in: "파니르").contains(.milk))
        XCTAssertTrue(DietRules.allergens(in: "기버터(정제 버터)").contains(.milk), "ghee")
        XCTAssertTrue(DietRules.allergens(in: "타히니").contains(.sesame))
        XCTAssertTrue(DietRules.dietsBroken(by: "칠면조 가슴살").contains(.vegetarian))
    }

    func testKoreanLookalikesDoNotTrip() {
        XCTAssertFalse(DietRules.allergens(in: "땅콩버터").contains(.milk), "peanut butter isn't butter")
        XCTAssertFalse(DietRules.allergens(in: "땅콩").contains(.soy), "peanuts aren't soy")
        XCTAssertFalse(DietRules.allergens(in: "들기름").contains(.sesame), "perilla oil isn't sesame")
        XCTAssertFalse(DietRules.allergens(in: "쌀국수").contains(.wheat), "rice noodles")
        XCTAssertFalse(DietRules.allergens(in: "메밀국수").contains(.wheat), "buckwheat noodles")
        XCTAssertFalse(DietRules.allergens(in: "두유").contains(.milk), "soy milk")
        XCTAssertFalse(DietRules.dietsBroken(by: "콩고기").contains(.vegetarian), "soy meat")
        XCTAssertFalse(DietRules.allergens(in: "코코넛 밀크").contains(.wheat), "coconut milk isn't 밀")
        XCTAssertFalse(DietRules.allergens(in: "돼지 어깨살").contains(.sesame), "shoulder isn't 깨")
        XCTAssertFalse(DietRules.allergens(in: "아르보리오 쌀").contains(.gluten), "arborio isn't 보리")
        XCTAssertFalse(DietRules.allergens(in: "쌀국수 면").contains(.wheat), "rice noodles")
        XCTAssertFalse(DietRules.allergens(in: "칠면조 가슴살").contains(.wheat), "turkey isn't 면")
        XCTAssertFalse(DietRules.dietsBroken(by: "콜라드 그린").contains(.vegetarian), "collards aren't lard")
        XCTAssertFalse(DietRules.dietsBroken(by: "햄버거 번").contains(.vegetarian), "buns aren't ham")
        XCTAssertFalse(DietRules.dietsBroken(by: "채소 육수").contains(.vegetarian), "vegetable broth")
        XCTAssertTrue(RecipeLanguage.allergyCheckAvailable(title: "엄마표 김치찌개와 돼지고기",
                                                           ingredients: ["돼지고기 목살", "신김치", "두부", "대파"]))
    }
}

final class ChineseDietTests: XCTestCase {
    func testChineseAllergensInsideCompoundWords() {
        XCTAssertTrue(DietRules.allergens(in: "虾仁").contains(.shellfish), "shrimp")
        XCTAssertTrue(DietRules.allergens(in: "蚝油").contains(.shellfish), "oyster sauce")
        XCTAssertTrue(DietRules.allergens(in: "鸡蛋 2个").contains(.egg))
        XCTAssertTrue(DietRules.allergens(in: "花生米").contains(.peanut))
        XCTAssertTrue(DietRules.allergens(in: "中筋面粉").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "生抽").contains(.soy))
        XCTAssertTrue(DietRules.allergens(in: "生抽").contains(.wheat))
        XCTAssertTrue(DietRules.allergens(in: "芝麻油").contains(.sesame))
        XCTAssertTrue(DietRules.allergens(in: "淡奶油").contains(.milk))
        XCTAssertTrue(DietRules.allergens(in: "鱼露").contains(.fish))
        XCTAssertTrue(DietRules.allergens(in: "腰果").contains(.treeNut))
        XCTAssertTrue(DietRules.allergens(in: "啤酒").contains(.gluten))
        XCTAssertTrue(DietRules.dietsBroken(by: "五花肉").contains(.vegetarian))
        XCTAssertTrue(DietRules.dietsBroken(by: "鸡蛋").contains(.vegan))
        XCTAssertTrue(DietRules.dietsBroken(by: "蜂蜜").contains(.vegan))
        XCTAssertTrue(DietRules.allergens(in: "哈罗米奶酪").contains(.milk), "halloumi, not cut by a rice-milk exception")
        XCTAssertFalse(DietRules.allergens(in: "kecap manis").contains(.peanut), "manis isn't maní")
        XCTAssertTrue(DietRules.allergens(in: "kecap manis").contains(.soy), "sweet soy sauce")
        XCTAssertTrue(DietRules.allergens(in: "冷藏派皮").contains(.wheat), "pie crust")
        XCTAssertTrue(DietRules.dietsBroken(by: "西班牙辣肠").contains(.vegetarian), "chorizo")
    }

    func testTraditionalCharactersAreChecked() {
        XCTAssertTrue(DietRules.allergens(in: "蝦仁").contains(.shellfish), "蝦 is 虾")
        XCTAssertTrue(DietRules.allergens(in: "魚露").contains(.fish), "魚 is 鱼")
        XCTAssertTrue(DietRules.dietsBroken(by: "雞腿").contains(.vegetarian), "雞 is 鸡")
    }

    func testChineseLookalikesDoNotTrip() {
        XCTAssertFalse(DietRules.allergens(in: "椰奶").contains(.milk), "coconut milk")
        XCTAssertFalse(DietRules.allergens(in: "奶油南瓜").contains(.milk), "butternut squash")
        XCTAssertFalse(DietRules.allergens(in: "鱿鱼").contains(.fish), "squid is shellfish, not fish")
        XCTAssertTrue(DietRules.allergens(in: "鱿鱼").contains(.shellfish))
        XCTAssertFalse(DietRules.allergens(in: "鱼香茄子酱").contains(.fish), "fish-fragrant sauce has no fish")
        XCTAssertFalse(DietRules.allergens(in: "海鲜酱").contains(.shellfish), "hoisin")
        XCTAssertFalse(DietRules.allergens(in: "蟹味菇").contains(.shellfish), "shimeji")
        XCTAssertFalse(DietRules.allergens(in: "玉米面").contains(.wheat), "cornmeal")
        XCTAssertFalse(DietRules.allergens(in: "芝麻菜").contains(.sesame), "arugula")
        XCTAssertFalse(DietRules.allergens(in: "蛋白质粉").contains(.egg), "protein")
        XCTAssertFalse(DietRules.dietsBroken(by: "肠粉").contains(.vegetarian), "rice noodle rolls")
        XCTAssertFalse(DietRules.allergens(in: "小胡桃南瓜").contains(.treeNut), "butternut squash")
        let notMeat = ["牛油果", "肉桂", "肉豆蔻", "牛肝菌", "鸡蛋", "牛奶", "素鸡", "牛至"]
        for name in notMeat {
            XCTAssertFalse(DietRules.dietsBroken(by: name).contains(.pescatarian), name)
        }
        XCTAssertTrue(RecipeLanguage.allergyCheckAvailable(title: "妈妈的红烧肉和米饭",
                                                           ingredients: ["五花肉", "冰糖", "生抽", "老抽", "姜片"]))
    }
}
