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
    }

    func testKoreanLookalikesDoNotTrip() {
        XCTAssertFalse(DietRules.allergens(in: "땅콩버터").contains(.milk), "peanut butter isn't butter")
        XCTAssertFalse(DietRules.allergens(in: "땅콩").contains(.soy), "peanuts aren't soy")
        XCTAssertFalse(DietRules.allergens(in: "들기름").contains(.sesame), "perilla oil isn't sesame")
        XCTAssertFalse(DietRules.allergens(in: "쌀국수").contains(.wheat), "rice noodles")
        XCTAssertFalse(DietRules.allergens(in: "메밀국수").contains(.wheat), "buckwheat noodles")
        XCTAssertFalse(DietRules.allergens(in: "두유").contains(.milk), "soy milk")
        XCTAssertFalse(DietRules.dietsBroken(by: "콩고기").contains(.vegetarian), "soy meat")
        XCTAssertTrue(RecipeLanguage.allergyCheckAvailable(title: "엄마표 김치찌개와 돼지고기",
                                                           ingredients: ["돼지고기 목살", "신김치", "두부", "대파"]))
    }
}
