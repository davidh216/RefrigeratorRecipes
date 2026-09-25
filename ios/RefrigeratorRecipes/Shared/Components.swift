import SwiftUI
import FridgeCore

struct ExpiryBadge: View {
    let status: ExpiryStatus

    var body: some View {
        if status != .unknown {
            Text(status.label)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .foregroundStyle(color)
                .background(color.opacity(0.15), in: Capsule())
        }
    }

    private var color: Color {
        switch status {
        case .expired: return .red
        case .expiringSoon: return .orange
        case .fresh: return .green
        case .unknown: return .secondary
        }
    }
}

struct CoverageBadge: View {
    let match: RecipeMatch

    var body: some View {
        Text(match.canMake ? "Ready" : "\(match.have.count)/\(match.requiredCount)")
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .foregroundStyle(match.canMake ? Color.green : Color.secondary)
            .background((match.canMake ? Color.green : Color.secondary).opacity(0.15), in: Capsule())
    }
}

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
