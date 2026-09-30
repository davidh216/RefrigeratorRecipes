import Foundation
import FridgeCore

/// Keys and defaults for values stored with @AppStorage.
enum SettingsKey {
    static let soonThresholdDays = "soonThresholdDays"
    static let reminderLeadDays = "reminderLeadDays"
    static let reminderHour = "reminderHour"
    static let remindersEnabled = "remindersEnabled"
    static let staples = "staples"
    static let claudeModel = "claudeModel"
    static let lastCheckInAt = "lastCheckInAt"
    static let checkInReminderEnabled = "checkInReminderEnabled"
    static let checkInWeekday = "checkInWeekday"
    static let superIngredientReminder = "superIngredientReminder"
    static let tonightMaxMinutes = "tonightMaxMinutes"
    static let tonightSkipped = "tonightSkipped"
    static let planAllMeals = "planAllMeals"
    static let dinnerShare = "dinnerShare"
    static let planStyle = "planStyle"
    static let planForShopping = "planForShopping"
}

enum SettingsDefault {
    static let soonThresholdDays = 3
    static let reminderLeadDays = 1
    static let reminderHour = 9
    static let remindersEnabled = true
    static let staples = RecipeMatcher.defaultStaples.joined(separator: ", ")
    static let claudeModel = "claude-opus-5-5"
    /// Seconds since 1970; 0 means never.
    static let lastCheckInAt: Double = 0
    static let checkInReminderEnabled = true
    /// 1 = Sunday … 7 = Saturday (Calendar weekday numbering).
    static let checkInWeekday = 1
    static let superIngredientReminder = true
    /// Off: the plan is dinners only and never asks which meal.
    static let planAllMeals = false
    /// Dinner's share of each person's daily nutrition target.
    static let dinnerShare = MealSplit.defaultDinnerShare
    static let planStyle = PlanStyle.balanced.rawValue
    /// Off: Plan my week sticks to recipes you mostly have the ingredients for.
    static let planForShopping = false
}

enum Staples {
    static func parse(_ raw: String) -> [String] {
        raw.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
}
