import XCTest
@testable import FridgeCore

final class RecipeTagTests: XCTestCase {
    func testVocabularyIsWellFormed() {
        XCTAssertEqual(Set(RecipeTag.ids).count, RecipeTag.all.count, "ids are unique")
        for tag in RecipeTag.all {
            XCTAssertEqual(RecipeTag.key(tag.id), tag.id, "\(tag.id) is already normalized")
            XCTAssertFalse(tag.name.isEmpty)
            XCTAssertFalse(tag.symbol.isEmpty)
        }
        // No spelling may point at two tags.
        var owner: [String: String] = [:]
        for tag in RecipeTag.all {
            for spelling in [tag.id, tag.name] + tag.aliases {
                let key = RecipeTag.key(spelling)
                if let other = owner[key] { XCTAssertEqual(other, tag.id, "\(spelling) means both \(other) and \(tag.id)") }
                owner[key] = tag.id
            }
        }
    }

    func testTheNineMoods() {
        XCTAssertEqual(RecipeTag.moods.map(\.id), [
            "comfort-food", "feeling-spicy", "under-the-weather", "easy-to-stomach", "cozy-night-in",
            "light-and-fresh", "hot-day", "date-night", "lazy-sunday",
        ])
        XCTAssertEqual(RecipeTag.tag("light-and-fresh")?.name, "Light & fresh")
    }

    func testNormalizesSpellings() {
        XCTAssertEqual(RecipeTag.id(for: "dinner"), "dinner")
        XCTAssertEqual(RecipeTag.id(for: "#Comfort Food"), "comfort-food")
        XCTAssertEqual(RecipeTag.id(for: "comfort_food"), "comfort-food")
        XCTAssertEqual(RecipeTag.id(for: "  Gluten Free "), "gluten-free")
        XCTAssertEqual(RecipeTag.id(for: "Light & Fresh"), "light-and-fresh")
        XCTAssertEqual(RecipeTag.id(for: "Kid Friendly"), "kid-friendly")
    }

    func testMergesAliasesFromTheOldLibrary() {
        XCTAssertEqual(RecipeTag.id(for: "protein-rich"), "high-protein")
        XCTAssertEqual(RecipeTag.id(for: "healthy"), "lighter")
        XCTAssertEqual(RecipeTag.id(for: "spicy"), "feeling-spicy")
        XCTAssertEqual(RecipeTag.id(for: "healing"), "under-the-weather")
        XCTAssertEqual(RecipeTag.id(for: "trendy"), "viral")
        XCTAssertEqual(RecipeTag.id(for: "Crock-Pot"), "slow-cooker")
    }

    func testUnknownTagsAndCuisinesAreNil() {
        for raw in ["", "  ", "#", "italian", "asian-inspired", "cookies", "elegant", "cheesy", "creamy", "pizza", "soup", "curry", "classic", "authentic"] {
            XCTAssertNil(RecipeTag.id(for: raw), raw)
        }
    }

    func testIDsForAListDedupesAndDrops() {
        XCTAssertEqual(RecipeTag.ids(for: ["Dinner", "spicy", "feeling spicy", "italian", "quick"]),
                       ["dinner", "feeling-spicy", "quick"])
    }
}

final class CuisineTests: XCTestCase {
    func testTaxonomyIsWellFormed() {
        XCTAssertEqual(Set(Cuisine.ids).count, Cuisine.all.count)
        XCTAssertTrue(Cuisine.ids.contains(Cuisine.otherID))
        var owner: [String: String] = [:]
        for cuisine in Cuisine.all {
            XCTAssertEqual(RecipeTag.key(cuisine.id), cuisine.id)
            for spelling in [cuisine.id, cuisine.name] + cuisine.aliases {
                let key = RecipeTag.key(spelling)
                if let other = owner[key] { XCTAssertEqual(other, cuisine.id, "\(spelling) means both \(other) and \(cuisine.id)") }
                owner[key] = cuisine.id
            }
        }
        // Every region in the plan has at least one cuisine.
        for region in Cuisine.Region.allCases {
            XCTAssertTrue(Cuisine.all.contains { $0.region == region }, region.title)
        }
    }

    func testMapsOldLibraryValuesAndCountries() {
        XCTAssertEqual(Cuisine.id(for: "middle-eastern"), "levantine")
        XCTAssertEqual(Cuisine.id(for: "cajun"), "cajun-creole")
        XCTAssertEqual(Cuisine.id(for: "Cuban"), "caribbean")
        XCTAssertEqual(Cuisine.id(for: "russian"), "eastern-european")
        XCTAssertEqual(Cuisine.id(for: "german"), "german-austrian")
        XCTAssertEqual(Cuisine.id(for: "british"), "british-irish")
        XCTAssertEqual(Cuisine.id(for: "Sichuan"), "chinese")
        XCTAssertEqual(Cuisine.id(for: "Southern & Soul"), "southern")
        XCTAssertEqual(Cuisine.id(for: "Tex Mex"), "tex-mex")
        XCTAssertEqual(Cuisine.id(for: "Moroccan"), "north-african")
    }

    func testUnknownCuisinesBecomeOtherOnImport() {
        XCTAssertNil(Cuisine.id(for: "healthy"))
        XCTAssertNil(Cuisine.id(for: "asian"))
        XCTAssertNil(Cuisine.id(for: ""))
        XCTAssertEqual(Cuisine.idOrOther(for: "Martian"), "other")
        XCTAssertEqual(Cuisine.idOrOther(for: ""), "other")
        XCTAssertEqual(Cuisine.idOrOther(for: "Thai"), "thai")
    }

    func testDisplayName() {
        XCTAssertEqual(Cuisine.displayName(for: "levantine"), "Lebanese & Levantine")
        XCTAssertEqual(Cuisine.displayName(for: "cajun"), "Cajun & Creole")
        XCTAssertEqual(Cuisine.displayName(for: "home style"), "Home Style")
    }
}
