import Foundation

/// What someone wants from their food. These are personal goals, not medical advice.
public enum NutritionGoal: String, CaseIterable, Codable, Sendable, Identifiable {
    case lose, maintain, gain, moreProtein

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .lose: "Lose weight"
        case .maintain: "Maintain"
        case .gain: "Gain weight"
        case .moreProtein: "Eat more protein"
        }
    }
}

/// Only used to pick the Mifflin-St Jeor constant; "unspecified" uses the midpoint.
public enum BodySex: String, CaseIterable, Codable, Sendable, Identifiable {
    case female, male, unspecified

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .female: "Female"
        case .male: "Male"
        case .unspecified: "Prefer not to say"
        }
    }
}

public enum ActivityLevel: String, CaseIterable, Codable, Sendable, Identifiable {
    case sedentary, light, moderate, active, veryActive

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .sedentary: "Mostly sitting"
        case .light: "Lightly active"
        case .moderate: "Moderately active"
        case .active: "Very active"
        case .veryActive: "Athlete"
        }
    }

    /// Standard multipliers on resting energy.
    public var factor: Double {
        switch self {
        case .sedentary: 1.2
        case .light: 1.375
        case .moderate: 1.55
        case .active: 1.725
        case .veryActive: 1.9
        }
    }
}

/// The optional details that turn a goal into a calorie number.
public struct BodyDetails: Equatable, Sendable {
    public var age: Int
    public var sex: BodySex
    public var heightCm: Double
    public var weightKg: Double
    public var activity: ActivityLevel

    public init(age: Int, sex: BodySex, heightCm: Double, weightKg: Double, activity: ActivityLevel) {
        self.age = age
        self.sex = sex
        self.heightCm = heightCm
        self.weightKg = weightKg
        self.activity = activity
    }

    /// All the numbers are plausible for an adult.
    public var isComplete: Bool {
        (14...110).contains(age) && (120...230).contains(heightCm) && (35...300).contains(weightKg)
    }
}

/// Which part of the day each meal gets.
public struct MealSplit: Equatable, Sendable {
    /// Dinner's share of the day, 0.2…0.6.
    public var dinner: Double

    public static let defaultDinnerShare = 0.35
    public static let dinnerRange = 0.2...0.6

    public init(dinner: Double = MealSplit.defaultDinnerShare) {
        self.dinner = min(max(dinner, Self.dinnerRange.lowerBound), Self.dinnerRange.upperBound)
    }

    /// The rest of the day is split breakfast 25 : lunch 30 : snacks 10.
    public func share(of meal: MealKind) -> Double {
        let rest = 1 - dinner
        switch meal {
        case .dinner: return dinner
        case .breakfast: return rest * 25 / 65
        case .lunch: return rest * 30 / 65
        case .snack: return rest * 10 / 65
        }
    }
}

public enum NutritionTargets {
    /// Used for suggestions when there are no body details.
    public static let referenceCalories = 2000.0
    /// Suggestions never go below this.
    public static let minimumCalories = 1200.0

    /// Mifflin-St Jeor resting energy, kcal/day.
    public static func restingEnergy(_ body: BodyDetails) -> Double {
        let constant: Double
        switch body.sex {
        case .male: constant = 5
        case .female: constant = -161
        case .unspecified: constant = -78
        }
        return 10 * body.weightKg + 6.25 * body.heightCm - 5 * Double(body.age) + constant
    }

    /// Calories to stay the same weight.
    public static func maintenanceCalories(_ body: BodyDetails) -> Double {
        restingEnergy(body) * body.activity.factor
    }

    /// Daily calories for a goal, rounded to 50.
    public static func suggestedCalories(goal: NutritionGoal, body: BodyDetails?) -> Double {
        let base = body.flatMap { $0.isComplete ? maintenanceCalories($0) : nil } ?? referenceCalories
        let adjusted: Double
        switch goal {
        case .lose: adjusted = max(base - 500, minimumCalories)
        case .gain: adjusted = base + 300
        case .maintain, .moreProtein: adjusted = base
        }
        return (adjusted / 50).rounded() * 50
    }

    /// Suggested daily targets: calories from the goal, protein by body weight when
    /// known, 30% of calories from fat, the rest carbs, and 14 g fiber per 1,000 kcal.
    public static func suggested(goal: NutritionGoal, body: BodyDetails?) -> NutritionFacts {
        let kcal = suggestedCalories(goal: goal, body: body)
        let protein: Double
        if let body, body.isComplete {
            let perKg: Double
            switch goal {
            case .maintain: perKg = 1.0
            case .lose, .gain: perKg = 1.6
            case .moreProtein: perKg = 1.8
            }
            protein = body.weightKg * perKg
        } else {
            protein = kcal * (goal == .moreProtein || goal == .lose ? 0.3 : 0.2) / 4
        }
        let roundedProtein = (protein / 5).rounded() * 5
        let fat = (kcal * 0.3 / 9).rounded()
        let carbs = max(((kcal - roundedProtein * 4 - fat * 9) / 4).rounded(), 0)
        let fiber = (kcal / 1000 * 14).rounded()
        return NutritionFacts(kcal: kcal, protein: roundedProtein, carbs: carbs, fat: fat, fiber: fiber)
    }

    /// One meal's slice of a daily target.
    public static func perMeal(_ daily: NutritionFacts, meal: MealKind, split: MealSplit = MealSplit()) -> NutritionFacts {
        daily.scaled(by: split.share(of: meal))
    }
}

/// How close planned food lands to a target.
public enum TargetStatus: Equatable, Sendable {
    case under, onTarget, over

    /// Within ±10% of the calorie target counts as on target.
    public static let tolerance = 0.10

    public static func of(kcal: Double, target: Double) -> TargetStatus {
        guard target > 0 else { return .onTarget }
        let ratio = kcal / target
        if ratio < 1 - tolerance { return .under }
        if ratio > 1 + tolerance { return .over }
        return .onTarget
    }

    public var label: String {
        switch self {
        case .under: "under target"
        case .onTarget: "on target"
        case .over: "over target"
        }
    }
}
