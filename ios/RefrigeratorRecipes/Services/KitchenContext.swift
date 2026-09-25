import Foundation
import FridgeCore

/// Renders the user's kitchen as compact text for Claude's system prompt.
enum KitchenContext {
    static func render(
        pantry: [PantryItem],
        recipes: [Recipe],
        plan: [MealPlanEntry],
        staples: [String],
        soonThresholdDays: Int,
        now: Date = .now
    ) -> String {
        var lines: [String] = []
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        lines.append("Today is \(dateFormatter.string(from: now)).")

        lines.append("\n## Kitchen inventory")
        if pantry.isEmpty {
            lines.append("(empty)")
        } else {
            let sorted = pantry.sorted {
                $0.expiryStatus(soonThresholdDays: soonThresholdDays).urgency < $1.expiryStatus(soonThresholdDays: soonThresholdDays).urgency
            }
            for item in sorted {
                let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
                let status = item.expiryStatus(soonThresholdDays: soonThresholdDays)
                var line = "- \(item.name)"
                if !qty.isEmpty { line += " (\(qty))" }
                line += " [\(item.location.rawValue)]"
                if status != .unknown { line += " — \(status.label)" }
                lines.append(line)
            }
        }
        lines.append("Always-available staples: \(staples.joined(separator: ", ")).")

        if !recipes.isEmpty {
            lines.append("\n## Saved recipes")
            for recipe in recipes.prefix(80) {
                lines.append("- \(recipe.title)")
            }
        }

        let upcoming = plan.filter { $0.day >= Calendar.current.startOfDay(for: now) }.sorted { $0.day < $1.day }
        if !upcoming.isEmpty {
            lines.append("\n## Meal plan")
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEE MMM d"
            for entry in upcoming.prefix(30) {
                lines.append("- \(dayFormatter.string(from: entry.day)) \(entry.slot.title): \(entry.recipe?.title ?? entry.note)")
            }
        }
        return lines.joined(separator: "\n")
    }
}
