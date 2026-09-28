import Foundation

public enum QuantityFormatter {
    /// "1.5 cups", "2", "½ tsp" — trims trailing zeros and renders common fractions.
    public static func string(quantity: Double, unit: String) -> String {
        let q = number(quantity)
        let u = unit.trimmingCharacters(in: .whitespaces)
        if q.isEmpty { return u }
        return u.isEmpty ? q : "\(q) \(u)"
    }

    public static func number(_ value: Double) -> String {
        guard value > 0 else { return "" }
        let whole = Int(value)
        let frac = value - Double(whole)
        let fractions: [(Double, String)] = [(0.25, "¼"), (0.33, "⅓"), (0.5, "½"), (0.67, "⅔"), (0.75, "¾")]
        if frac < 0.01 { return "\(whole)" }
        if let symbol = fractions.first(where: { abs($0.0 - frac) < 0.02 })?.1 {
            return whole == 0 ? symbol : "\(whole)\(symbol)"
        }
        let formatter = NumberFormatter()
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
    }
}
