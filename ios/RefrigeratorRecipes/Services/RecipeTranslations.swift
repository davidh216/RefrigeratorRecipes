import Foundation
import SwiftData

/// Library, pack and menu recipes in the app's language (HANDOFF-cuisines-languages-moods.md §4.2, §5.1).
///
/// Each translation holds, per recipe id, the title, summary, ingredient names and notes, and steps.
/// Quantities, units and the English ingredient names stay in the recipe, so matching, allergy checks
/// and nutrition never change. A field is shown translated only while the saved recipe still has the
/// English it was translated from; once the user edits it, their text wins.
///
/// Library recipes' translations ship in the app (`Resources/Recipes.<lang>.json`). Pack and menu
/// recipes come from the server, so theirs do too (`GET /v1/content/translations/<lang>`, cached like
/// the packs); a server translation wins when both have one.
enum RecipeTranslations {
    struct Text: Codable, Equatable {
        struct Item: Codable, Equatable {
            let name: String
            let note: String
        }
        let title: String
        let summary: String
        let ingredients: [Item]
        let instructions: [String]
    }

    /// What to show for one recipe: each field nil when it isn't translated.
    struct Shown {
        var title: String?
        var summary: String?
        /// Indexed like `Recipe.sortedIngredients`.
        var ingredients: [Text.Item]?
        var instructions: [String]?

        func ingredient(at index: Int) -> Text.Item? {
            guard let ingredients, ingredients.indices.contains(index) else { return nil }
            return ingredients[index]
        }
    }

    /// The bundled translations for this language, keyed by recipe id. Empty in English or with no file.
    static let bundled: [String: Text] = load(AppLanguage.current)

    static func load(_ language: String) -> [String: Text] {
        guard language != "en",
              let url = Bundle.main.url(forResource: "Recipes.\(language)", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return [:] }
        return (try? JSONDecoder().decode([String: Text].self, from: data)) ?? [:]
    }

    /// Whether the app shows recipes in another language at all.
    static var isActive: Bool { AppLanguage.current != "en" }

    /// One recipe's translation: the server's, or the bundled one.
    @MainActor
    static func text(_ id: String) -> Text? {
        guard isActive else { return nil }
        return Served.shared.table[id] ?? bundled[id]
    }

    /// The English recipe a translation was made from.
    @MainActor
    static func source(_ id: String) -> SampleData.SampleRecipe? {
        let all = SampleData.samples + RecipePacks.shared.recipes + Menus.shared.recipes
        return all.first { $0.id == id }
    }

    /// A catalog recipe's title (saved or not), translated when there is one.
    @MainActor
    static func title(id: String, english: String) -> String {
        text(id)?.title ?? english
    }

    @MainActor
    static func shown(for recipe: Recipe) -> Shown {
        guard !recipe.libraryID.isEmpty, let text = text(recipe.libraryID),
              let source = source(recipe.libraryID) else { return Shown() }
        var shown = Shown()
        if recipe.title == source.title { shown.title = text.title }
        if recipe.summary == source.summary { shown.summary = text.summary }
        let ingredients = recipe.sortedIngredients
        let names = ingredients.map(\.name)
        if names == source.ingredients.map(\.name), ingredients.map(\.note) == source.ingredients.map(\.note),
           text.ingredients.count == names.count {
            shown.ingredients = text.ingredients
        }
        if recipe.instructions == source.instructions, text.instructions.count == recipe.instructions.count {
            shown.instructions = text.instructions
        }
        return shown
    }
}

extension Recipe {
    /// The title to show: translated for an unedited library recipe in another language.
    @MainActor
    var displayTitle: String {
        guard RecipeTranslations.isActive, !libraryID.isEmpty else { return title }
        return RecipeTranslations.shown(for: self).title ?? title
    }
}

extension RecipeTranslations {
    /// Pack and menu recipes' translations from the server, for the app's language.
    @MainActor
    final class Served: ObservableObject {
        static let shared = Served()

        @Published private(set) var table: [String: Text] = [:]

        /// Nil in English, which has nothing to fetch.
        private let loader: ServerContentLoader<[String: Text]>?

        private init() {
            let language = AppLanguage.current
            loader = language == "en" ? nil : ServerContentLoader(
                path: "v1/content/translations/\(language)", cacheName: "recipe-translations-\(language).json")
            table = loader?.cached() ?? [:]
        }

        /// Fetches the server's translations (if this build has a server) and caches them.
        func refresh() async {
            if let fetched = await loader?.fetch(replacing: table) { table = fetched }
        }
    }
}
