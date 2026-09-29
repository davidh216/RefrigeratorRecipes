import XCTest
@testable import FridgeCore

final class IngredientLineTests: XCTestCase {
    func testAmountsUnitsNamesAndNotes() {
        XCTAssertEqual(IngredientLine.parse("2 1/2 cups all-purpose flour, sifted"),
                       IngredientLine(quantity: 2.5, unit: "cup", name: "all-purpose flour", note: "sifted"))
        XCTAssertEqual(IngredientLine.parse("½ tsp salt"), IngredientLine(quantity: 0.5, unit: "tsp", name: "salt"))
        XCTAssertEqual(IngredientLine.parse("1/4 cup olive oil"), IngredientLine(quantity: 0.25, unit: "cup", name: "olive oil"))
        XCTAssertEqual(IngredientLine.parse("1 (14 oz) can diced tomatoes"),
                       IngredientLine(quantity: 1, unit: "can", name: "diced tomatoes", note: "14 oz"))
        XCTAssertEqual(IngredientLine.parse("2-3 cloves garlic, minced"),
                       IngredientLine(quantity: 2, unit: "clove", name: "garlic", note: "minced"))
        XCTAssertEqual(IngredientLine.parse("3 large eggs"), IngredientLine(quantity: 3, name: "large eggs"))
        XCTAssertEqual(IngredientLine.parse("2 tomatoes"), IngredientLine(quantity: 2, name: "tomatoes"))
        XCTAssertEqual(IngredientLine.parse("1 Tbsp. soy sauce"), IngredientLine(quantity: 1, unit: "tbsp", name: "soy sauce"))
        XCTAssertEqual(IngredientLine.parse("Pinch of red pepper flakes"),
                       IngredientLine(quantity: 1, unit: "pinch", name: "red pepper flakes"))
        XCTAssertEqual(IngredientLine.parse("1 cup walnuts (optional)"),
                       IngredientLine(quantity: 1, unit: "cup", name: "walnuts", isOptional: true))
        XCTAssertEqual(IngredientLine.parse("Salt and pepper, to taste"),
                       IngredientLine(name: "Salt and pepper", note: "to taste"))
        XCTAssertEqual(IngredientLine.parse("1.5 lb chicken thighs"), IngredientLine(quantity: 1.5, unit: "lb", name: "chicken thighs"))
    }
}

final class WebRecipeParserTests: XCTestCase {
    let page = """
    <html><head>
    <meta property="og:title" content="Weeknight Chili &amp; Rice">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Blog"}</script>
    <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"Person","name":"Sam"},
      {"@type":["Recipe"],"name":"Weeknight Chili &amp; Rice","description":"<p>Cozy and quick.</p>",
       "author":[{"@type":"Person","name":"Sam Cook"}],"recipeYield":["4","4 bowls"],
       "prepTime":"PT15M","cookTime":"PT1H5M","recipeCuisine":"American","keywords":"chili, weeknight",
       "recipeIngredient":["1 lb ground beef","1 (15 oz) can kidney beans","2 tbsp chili powder"],
       "recipeInstructions":[
         {"@type":"HowToSection","name":"Chili","itemListElement":[
           {"@type":"HowToStep","text":"Brown the beef."},{"@type":"HowToStep","text":"Add beans &amp; spices; simmer 1 hour."}]},
         {"@type":"HowToStep","text":"Serve over rice."}]}
    ]}
    </script></head><body><p>Hello</p><script>var x = 1;</script></body></html>
    """

    func testReadsJSONLDRecipeFromGraph() throws {
        let recipe = try XCTUnwrap(WebRecipeParser.extract(fromHTML: page))
        XCTAssertEqual(recipe.title, "Weeknight Chili & Rice")
        XCTAssertEqual(recipe.summary, "Cozy and quick.")
        XCTAssertEqual(recipe.author, "Sam Cook")
        XCTAssertEqual(recipe.servings, 4)
        XCTAssertEqual(recipe.prepMinutes, 15)
        XCTAssertEqual(recipe.cookMinutes, 65)
        XCTAssertEqual(recipe.cuisine, "American")
        XCTAssertEqual(recipe.keywords, ["chili", "weeknight"])
        XCTAssertEqual(recipe.ingredientLines.count, 3)
        XCTAssertEqual(recipe.steps, ["Brown the beef.", "Add beans & spices; simmer 1 hour.", "Serve over rice."])
        XCTAssertTrue(recipe.isComplete)
    }

    func testStringInstructionsAndNoRecipe() {
        XCTAssertEqual(WebRecipeParser.steps("Mix.<br>Bake 20 minutes.\nCool."), ["Mix.", "Bake 20 minutes.", "Cool."])
        XCTAssertNil(WebRecipeParser.extract(fromHTML: "<html><body>No recipe here</body></html>"))
        XCTAssertEqual(WebRecipeParser.minutes("P0DT1H30M"), 90)
        XCTAssertEqual(WebRecipeParser.servings("Serves 6"), 6)
        XCTAssertEqual(WebRecipeParser.decodeEntities("It&#8217;s &#x2019;"), "It’s ’")
    }

    func testMetaAndReadableText() {
        XCTAssertEqual(WebRecipeParser.meta("og:title", in: page), "Weeknight Chili & Rice")
        let text = WebRecipeParser.readableText(fromHTML: page)
        XCTAssertTrue(text.contains("Hello"))
        XCTAssertFalse(text.contains("var x"))
    }
}
