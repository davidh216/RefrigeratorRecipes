import Foundation

/// Metric or US units for showing quantities (HANDOFF-cuisines-languages-moods.md §4.1).
/// Recipes keep their original quantities; this only converts what's shown.
public enum UnitSystem: String, CaseIterable, Codable, Sendable, Identifiable {
    case us, metric

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .us: "US (cups, oz, °F)"
        case .metric: "Metric (ml, g, °C)"
        }
    }

    /// The usual system for a region: US units in the United States, Liberia and Myanmar, metric elsewhere.
    public static func `default`(for locale: Locale = .current) -> UnitSystem {
        switch locale.measurementSystem {
        case .us: .us
        default: .metric
        }
    }
}

public extension QuantityFormatter {
    /// A quantity and unit converted for display in `system`. Units it doesn't know (cloves, cans,
    /// pinches), or that already belong to the system, come back unchanged.
    static func converted(quantity: Double, unit: String, to system: UnitSystem) -> (quantity: Double, unit: String) {
        guard quantity > 0, let known = MeasureUnit(unit) else { return (quantity, unit) }
        switch (system, known.kind) {
        case (.metric, .usVolume):
            return metricVolume(milliliters: quantity * known.factor)
        case (.metric, .usWeight):
            return metricWeight(grams: quantity * known.factor)
        case (.us, .metricVolume):
            return usVolume(milliliters: quantity * known.factor)
        case (.us, .metricWeight):
            return usWeight(grams: quantity * known.factor)
        default:
            return (quantity, unit)
        }
    }

    /// "1 cup" in metric is "240 ml"; in US it stays "1 cup".
    static func string(quantity: Double, unit: String, system: UnitSystem) -> String {
        let shown = converted(quantity: quantity, unit: unit, to: system)
        return string(quantity: shown.quantity, unit: shown.unit)
    }

    private static func metricVolume(milliliters ml: Double) -> (Double, String) {
        if ml >= 1000 { return (round(ml / 100) / 10, "L") }
        if ml < 20 { return ((ml * 2).rounded() / 2, "ml") }
        return (roundNicely(ml), "ml")
    }

    private static func metricWeight(grams g: Double) -> (Double, String) {
        if g >= 1000 { return (round(g / 50) * 50 / 1000, "kg") }
        if g < 20 { return ((g * 2).rounded() / 2, "g") }
        return (roundNicely(g), "g")
    }

    private static func usVolume(milliliters ml: Double) -> (Double, String) {
        if ml < 15 { return (roundToQuarter(ml / 4.929), "tsp") }
        if ml < 60 { return (roundToQuarter(ml / 14.787), "tbsp") }
        let cups = roundToQuarter(ml / 236.6)
        return (cups, cups == 1 ? "cup" : "cups")
    }

    private static func usWeight(grams g: Double) -> (Double, String) {
        if g >= 454 { return (roundToQuarter(g / 453.6), "lb") }
        return (max(0.25, roundToQuarter(g / 28.35)), "oz")
    }

    /// To the nearest 5 under 250, 10 under 1000.
    private static func roundNicely(_ value: Double) -> Double {
        let step: Double = value < 250 ? 5 : 10
        return (value / step).rounded() * step
    }

    private static func roundToQuarter(_ value: Double) -> Double {
        max(0.25, (value * 4).rounded() / 4)
    }
}

/// A unit the converter knows, with its size in milliliters or grams.
struct MeasureUnit {
    enum Kind { case usVolume, usWeight, metricVolume, metricWeight }
    let kind: Kind
    /// Milliliters or grams per one of this unit.
    let factor: Double

    init?(_ raw: String) {
        let key = raw.lowercased().trimmingCharacters(in: .whitespaces).trimmingCharacters(in: CharacterSet(charactersIn: "."))
        guard let found = Self.table[key] else { return nil }
        self = found
    }

    private init(_ kind: Kind, _ factor: Double) {
        self.kind = kind
        self.factor = factor
    }

    private static let table: [String: MeasureUnit] = {
        var table: [String: MeasureUnit] = [:]
        func add(_ names: [String], _ unit: MeasureUnit) { for name in names { table[name] = unit } }
        add(["cup", "cups", "c"], MeasureUnit(.usVolume, 236.6))
        add(["tbsp", "tablespoon", "tablespoons", "tbs", "tbl"], MeasureUnit(.usVolume, 14.787))
        add(["tsp", "teaspoon", "teaspoons"], MeasureUnit(.usVolume, 4.929))
        add(["fl oz", "fluid ounce", "fluid ounces", "fl. oz"], MeasureUnit(.usVolume, 29.57))
        add(["pint", "pints", "pt"], MeasureUnit(.usVolume, 473.2))
        add(["quart", "quarts", "qt"], MeasureUnit(.usVolume, 946.4))
        add(["gallon", "gallons", "gal"], MeasureUnit(.usVolume, 3785.4))
        add(["oz", "ounce", "ounces"], MeasureUnit(.usWeight, 28.35))
        add(["lb", "lbs", "pound", "pounds"], MeasureUnit(.usWeight, 453.6))
        add(["ml", "milliliter", "milliliters", "millilitre", "millilitres"], MeasureUnit(.metricVolume, 1))
        add(["l", "liter", "liters", "litre", "litres"], MeasureUnit(.metricVolume, 1000))
        add(["g", "gram", "grams", "gr"], MeasureUnit(.metricWeight, 1))
        add(["kg", "kilogram", "kilograms"], MeasureUnit(.metricWeight, 1000))
        return table
    }()
}
