import SwiftUI
import FridgeCore

// `ExpiryBadge` and `CoverageBadge` live in DesignSystem/ (Freshness.swift, Coverage.swift).

/// Reads the shared settings the matching logic needs.
struct KitchenPreferences {
    var staples: [String]
    var soonThresholdDays: Int

    static var current: KitchenPreferences {
        let defaults = UserDefaults.standard
        let staples = defaults.string(forKey: SettingsKey.staples) ?? SettingsDefault.staples
        let soon = defaults.object(forKey: SettingsKey.soonThresholdDays) as? Int ?? SettingsDefault.soonThresholdDays
        return KitchenPreferences(staples: Staples.parse(staples), soonThresholdDays: soon)
    }
}

extension Double {
    /// For numeric text fields that should show "" instead of "0".
    var editableString: String {
        self == 0 ? "" : String(format: "%g", self)
    }
}

extension String {
    var doubleValue: Double {
        Double(replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)) ?? 0
    }
}
