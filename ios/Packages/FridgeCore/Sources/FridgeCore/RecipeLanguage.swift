import Foundation
import NaturalLanguage

/// Which language a recipe is written in, so the app can say when its allergy check doesn't cover it
/// (HANDOFF-cuisines-languages-moods.md §4.2): the keyword lists in `DietRules` are English and
/// Spanish, and a recipe in another language gets a visible note rather than a silent pass.
public enum RecipeLanguage {
    /// The dominant language (ISO 639-1, like "es") of the title and ingredient names, or nil when
    /// there's too little text to tell or the recognizer isn't confident.
    public static func detect(title: String, ingredients: [String]) -> String? {
        let text = ([title] + ingredients).joined(separator: ". ")
        guard text.filter(\.isLetter).count >= 12 else { return nil }
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(text)
        guard let (language, confidence) = recognizer.languageHypotheses(withMaximum: 1).first,
              confidence >= 0.6 else { return nil }
        return language.rawValue.split(separator: "-").first.map(String.init)
    }

    /// Whether the allergen and diet keywords cover the recipe's language. Unknown counts as covered,
    /// so a short English recipe doesn't get a needless warning.
    public static func allergyCheckAvailable(title: String, ingredients: [String]) -> Bool {
        guard let language = detect(title: title, ingredients: ingredients) else { return true }
        return DietRules.checkedLanguages.contains(language)
    }
}
