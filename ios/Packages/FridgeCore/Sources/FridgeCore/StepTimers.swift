import Foundation

/// A timer a recipe step mentions: "simmer 20 minutes", "bake 25 to 30 minutes", "1시간 30분", "煮 8–10 分钟".
public struct StepTimer: Equatable, Hashable, Sendable {
    /// What the timer counts down: the shorter end of a range, so the cook checks early.
    public let seconds: Int
    /// The longer end of "8 to 10 minutes", or nil.
    public let upperSeconds: Int?
    /// The words in the step it came from, such as "8 to 10 minutes".
    public let phrase: String

    public init(seconds: Int, upperSeconds: Int? = nil, phrase: String) {
        self.seconds = seconds
        self.upperSeconds = upperSeconds
        self.phrase = phrase
    }
}

/// Finds the durations in a recipe step, for cooking mode's timers. Reads English, Spanish, Korean and
/// Chinese, since steps are shown in the app's language: ranges ("8 to 10 minutes", "5 a 10 minutos",
/// "3~4분", "8–10 分钟"), hours with minutes ("1 hour 30 minutes", "1시간 30분"), fractions ("1 1/2 hours"),
/// and number words ("a minute", "una hora", "一分钟"). Durations under 10 seconds or over 12 hours are left
/// out, and each duration is listed once.
public enum StepTimers {
    public static func find(in text: String) -> [StepTimer] {
        let range = NSRange(text.startIndex..., in: text)
        var found: [(seconds: Int, upper: Int?, range: NSRange)] = []
        for match in pattern.matches(in: text, range: range) {
            func group(_ name: String) -> String? {
                let r = match.range(withName: name)
                guard r.location != NSNotFound, let swiftRange = Range(r, in: text) else { return nil }
                return String(text[swiftRange])
            }
            guard let a = group("a").flatMap(number), let unitText = group("u") else { continue }
            let unit = seconds(perUnit: unitText)
            var extra = 0.0
            if let c = group("c").flatMap(number), let smaller = group("u2").map(seconds(perUnit:)), smaller < unit {
                extra = c * Double(smaller)
            }
            let lower = Int((a * Double(unit) + extra).rounded())
            let upper = group("b").flatMap(number).map { Int(($0 * Double(unit) + extra).rounded()) }
            found.append((lower, upper, match.range))
        }

        // "45 minutes to 1 hour" is one range written with two units.
        var merged: [(seconds: Int, upper: Int?, range: NSRange)] = []
        let nsText = text as NSString
        for item in found {
            if let last = merged.last, last.upper == nil {
                let gapStart = last.range.location + last.range.length
                let gap = nsText.substring(with: NSRange(location: gapStart, length: item.range.location - gapStart))
                if separatorOnly.firstMatch(in: gap, range: NSRange(location: 0, length: (gap as NSString).length)) != nil {
                    merged[merged.count - 1] = (last.seconds, item.seconds,
                                                NSRange(location: last.range.location,
                                                        length: item.range.location + item.range.length - last.range.location))
                    continue
                }
            }
            merged.append(item)
        }

        var timers: [StepTimer] = []
        for item in merged where (10...12 * 3600).contains(item.seconds) {
            let upper = item.upper.flatMap { $0 > item.seconds ? $0 : nil }
            guard !timers.contains(where: { $0.seconds == item.seconds && $0.upperSeconds == upper }) else { continue }
            timers.append(StepTimer(seconds: item.seconds, upperSeconds: upper, phrase: nsText.substring(with: item.range)))
        }
        return timers
    }

    // MARK: - Pattern

    private static let fractions: [Character: Double] = ["½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1.0 / 3, "⅔": 2.0 / 3]

    private static let words: [String: Double] = [
        "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
        "nine": 9, "ten": 10, "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "forty-five": 45,
        "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "diez": 10, "quince": 15,
        "veinte": 20, "treinta": 30,
        "一": 1, "两": 2, "半": 0.5,
    ]

    private static let numberPattern = #"(?:\d+(?:[.,]\d+)?(?:\s+\d+/\d+|\s*[½¼¾⅓⅔])?|\d+/\d+|[½¼¾⅓⅔]|forty-five|fifteen|twenty|thirty|forty|twelve|seven|three|eight|four|five|nine|one|two|six|ten|an|a|una|uno|un|dos|tres|cuatro|cinco|diez|quince|veinte|treinta|一|两|半)"#
    /// "8 to 10", "5 a 10", "3~4", "8–10", "8 到 10".
    private static let separatorPattern = #"(?:-|–|—|to|or|a|o|~|〜|到|至)"#
    private static let unitPattern = #"(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|segundos?|minutos?|horas?|초|분|시간|秒钟|秒|分钟|个小时|小时|钟头)"#
    /// What may follow hours or minutes: "1 hour 30 minutes", "1분 30초".
    private static let smallerUnitPattern = #"(?:minutes?|mins?|minutos?|분|分钟|seconds?|secs?|segundos?|초|秒钟|秒)"#
    /// A unit ends the word ("min" isn't the start of "minced"), and 분의 is a fraction ("3분의 2", two-thirds).
    private static let wordEndPattern = #"(?![a-zA-Záéíóúñ의])"#
    /// Digits and CJK numerals may touch their unit ("20분", "一分钟"); a word number needs a space, so
    /// "ahora" isn't "a hora".
    private static let gapPattern = #"(?:(?:(?<=\d)|(?<=[½¼¾⅓⅔一两半]))\s*|\s+)"#
    private static let morePattern = #"(?:(?:more|extra|additional)\s+)?"#

    private static let pattern = try! NSRegularExpression(
        pattern: "(?<![A-Za-z0-9/])(?<a>\(numberPattern))(?:\\s*\(separatorPattern)\\s*(?<b>\(numberPattern)))?"
            + "\(gapPattern)\(morePattern)(?<u>\(unitPattern))\(wordEndPattern)"
            + "(?:\\s*(?:and|y|,)?\\s*(?<c>\(numberPattern))\(gapPattern)(?<u2>\(smallerUnitPattern))\(wordEndPattern))?",
        options: [.caseInsensitive])

    private static let separatorOnly = try! NSRegularExpression(pattern: "^\\s*\(separatorPattern)\\s*$",
                                                                options: [.caseInsensitive])

    private static func number(_ raw: String) -> Double? {
        var text = raw.trimmingCharacters(in: .whitespaces).lowercased()
        if let word = words[text] { return word }
        var total = 0.0
        for (glyph, value) in fractions where text.contains(glyph) {
            total += value
            text.removeAll { $0 == glyph }
        }
        text = text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        if text.isEmpty { return total > 0 ? total : nil }
        let parts = text.split(separator: " ")
        if parts.count == 2, let whole = Double(parts[0]), let fraction = fraction(String(parts[1])) {
            return whole + fraction + total
        }
        if text.contains("/") { return fraction(text).map { $0 + total } }
        return Double(text).map { $0 + total }
    }

    private static func fraction(_ text: String) -> Double? {
        let parts = text.split(separator: "/")
        guard parts.count == 2, let top = Double(parts[0]), let bottom = Double(parts[1]), bottom > 0 else { return nil }
        return top / bottom
    }

    private static func seconds(perUnit raw: String) -> Int {
        let unit = raw.lowercased()
        if unit.hasPrefix("sec") || unit.hasPrefix("seg") || unit == "초" || unit.hasPrefix("秒") { return 1 }
        if unit.hasPrefix("min") || unit == "분" || unit == "分钟" { return 60 }
        return 3600
    }
}
