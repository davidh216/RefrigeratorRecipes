import Foundation

/// A recipe read from a web page's schema.org JSON-LD (what most recipe sites embed for search engines).
public struct WebRecipe: Equatable, Sendable {
    public var title: String
    public var summary: String
    public var servings: Int?
    public var prepMinutes: Int
    public var cookMinutes: Int
    public var ingredientLines: [String]
    public var steps: [String]
    public var author: String
    public var cuisine: String
    public var keywords: [String]

    /// Enough to use as-is without asking Claude to reconstruct anything.
    public var isComplete: Bool { !title.isEmpty && ingredientLines.count >= 2 && !steps.isEmpty }
}

public enum WebRecipeParser {
    /// The first schema.org Recipe in the page's JSON-LD, or nil.
    public static func extract(fromHTML html: String) -> WebRecipe? {
        for block in jsonLDBlocks(html) {
            guard let data = block.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]),
                  let object = findRecipe(in: json) else { continue }
            return recipe(from: object)
        }
        return nil
    }

    /// Contents of every `<script type="application/ld+json">` block.
    static func jsonLDBlocks(_ html: String) -> [String] {
        let pattern = #"<script[^>]*type\s*=\s*["']application/ld\+json["'][^>]*>(.*?)</script>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators]) else { return [] }
        let range = NSRange(html.startIndex..., in: html)
        return regex.matches(in: html, range: range).compactMap { match in
            Range(match.range(at: 1), in: html).map { String(html[$0]).trimmingCharacters(in: .whitespacesAndNewlines) }
        }
    }

    private static func isRecipe(_ object: [String: Any]) -> Bool {
        if let type = object["@type"] as? String { return type.caseInsensitiveCompare("Recipe") == .orderedSame }
        if let types = object["@type"] as? [String] { return types.contains { $0.caseInsensitiveCompare("Recipe") == .orderedSame } }
        return false
    }

    /// Searches top-level objects, arrays and `@graph` for a Recipe.
    private static func findRecipe(in json: Any) -> [String: Any]? {
        if let object = json as? [String: Any] {
            if isRecipe(object) { return object }
            if let graph = object["@graph"] { return findRecipe(in: graph) }
            if let main = object["mainEntity"] { return findRecipe(in: main) }
        }
        if let array = json as? [Any] {
            for item in array {
                if let found = findRecipe(in: item) { return found }
            }
        }
        return nil
    }

    private static func recipe(from object: [String: Any]) -> WebRecipe {
        let prep = minutes(object["prepTime"])
        var cook = minutes(object["cookTime"])
        if prep == 0 && cook == 0 { cook = minutes(object["totalTime"]) }
        return WebRecipe(
            title: clean(object["name"] as? String ?? ""),
            summary: clean(object["description"] as? String ?? ""),
            servings: servings(object["recipeYield"]),
            prepMinutes: prep,
            cookMinutes: cook,
            ingredientLines: strings(object["recipeIngredient"] ?? object["ingredients"]).map { clean($0) }.filter { !$0.isEmpty },
            steps: steps(object["recipeInstructions"]),
            author: author(object["author"]),
            cuisine: strings(object["recipeCuisine"]).first.map { clean($0) } ?? "",
            keywords: keywords(object["keywords"]) + strings(object["recipeCategory"]).map { clean($0) }
        )
    }

    private static func strings(_ value: Any?) -> [String] {
        if let string = value as? String { return [string] }
        if let array = value as? [Any] { return array.compactMap { $0 as? String } }
        return []
    }

    private static func keywords(_ value: Any?) -> [String] {
        strings(value)
            .flatMap { $0.split(separator: ",").map { clean(String($0)) } }
            .filter { !$0.isEmpty }
    }

    private static func author(_ value: Any?) -> String {
        if let string = value as? String { return clean(string) }
        if let object = value as? [String: Any] { return clean(object["name"] as? String ?? "") }
        if let array = value as? [Any], let first = array.first { return author(first) }
        return ""
    }

    /// Plain strings, HowToStep objects, or HowToSections of steps.
    static func steps(_ value: Any?) -> [String] {
        if let string = value as? String {
            let html = string.replacingOccurrences(of: #"(?i)<br\s*/?>|</p>|</li>"#, with: "\n", options: .regularExpression)
            return clean(html, keepNewlines: true).components(separatedBy: "\n")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
        }
        if let array = value as? [Any] {
            return array.flatMap { item -> [String] in
                if let string = item as? String { return steps(string) }
                guard let object = item as? [String: Any] else { return [] }
                if let items = object["itemListElement"] { return steps(items) }
                if let text = object["text"] as? String { return steps(text) }
                if let name = object["name"] as? String { return steps(name) }
                return []
            }
        }
        if let object = value as? [String: Any], let items = object["itemListElement"] { return steps(items) }
        return []
    }

    /// "4", "4 servings", "Serves 6", 4, ["4", "4 cupcakes"].
    static func servings(_ value: Any?) -> Int? {
        if let number = value as? NSNumber { return number.intValue > 0 ? number.intValue : nil }
        for string in strings(value) {
            if let match = string.firstMatch(of: #/(\d+)/#), let count = Int(match.1), count > 0 { return count }
        }
        return nil
    }

    /// ISO 8601 durations like "PT1H30M" or "P0DT0H45M".
    static func minutes(_ value: Any?) -> Int {
        guard let string = value as? String else { return 0 }
        var total = 0.0
        for match in string.uppercased().matches(of: #/(\d+(?:\.\d+)?)([DHMS])/#) {
            let amount = Double(match.1) ?? 0
            switch match.2 {
            case "D": total += amount * 1440
            case "H": total += amount * 60
            case "M": total += amount
            default: total += amount / 60
            }
        }
        return Int(total.rounded())
    }

    /// Strips tags, decodes entities, collapses whitespace.
    static func clean(_ raw: String, keepNewlines: Bool = false) -> String {
        var text = raw.replacingOccurrences(of: #"<[^>]+>"#, with: " ", options: .regularExpression)
        text = decodeEntities(text)
        let spaces = keepNewlines ? #"[ \t\r\f]+"# : #"\s+"#
        text = text.replacingOccurrences(of: spaces, with: " ", options: .regularExpression)
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func decodeEntities(_ text: String) -> String {
        let named = ["&amp;": "&", "&quot;": "\"", "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">",
                     "&nbsp;": " ", "&frac12;": "½", "&frac14;": "¼", "&frac34;": "¾", "&deg;": "°",
                     "&ndash;": "–", "&mdash;": "—", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”"]
        var result = text
        for (entity, value) in named { result = result.replacingOccurrences(of: entity, with: value) }
        // Numeric: &#8217; and &#x2019;
        while let match = result.firstMatch(of: #/&#(x?)([0-9a-fA-F]+);/#) {
            let radix = match.1.isEmpty ? 10 : 16
            let scalar = UInt32(match.2, radix: radix).flatMap(Unicode.Scalar.init).map { String(Character($0)) } ?? ""
            result.replaceSubrange(match.range, with: scalar)
        }
        return result
    }

    /// Readable page text for when there's no structured recipe: scripts, styles and tags removed.
    public static func readableText(fromHTML html: String, limit: Int = 20000) -> String {
        var text = html.replacingOccurrences(of: #"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>"#,
                                             with: " ", options: .regularExpression)
        text = text.replacingOccurrences(of: #"(?i)<br\s*/?>|</p>|</li>|</h\d>|</div>"#, with: "\n", options: .regularExpression)
        text = clean(text, keepNewlines: true)
        text = text.replacingOccurrences(of: #"\n\s*\n+"#, with: "\n", options: .regularExpression)
        return String(text.prefix(limit))
    }

    /// `<meta property="og:title" content="…">` and friends.
    public static func meta(_ property: String, in html: String) -> String? {
        let escaped = NSRegularExpression.escapedPattern(for: property)
        let patterns = [
            #"<meta[^>]+(?:property|name)\s*=\s*["']"# + escaped + #"["'][^>]*content\s*=\s*["']([^"']*)["']"#,
            #"<meta[^>]+content\s*=\s*["']([^"']*)["'][^>]*(?:property|name)\s*=\s*["']"# + escaped + #"["']"#,
        ]
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
                  let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
                  let range = Range(match.range(at: 1), in: html) else { continue }
            let value = clean(String(html[range]))
            if !value.isEmpty { return value }
        }
        return nil
    }
}
