import Foundation
import SwiftData

// CloudKit-backed SwiftData has rules: every property needs a default (or is
// optional), relationships must be optional, and there are no unique
// constraints. Enums are stored as raw strings so the schema stays simple.

enum StorageLocation: String, CaseIterable, Identifiable, Codable {
    case fridge, freezer, pantry
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var symbol: String {
        switch self {
        case .fridge: return "refrigerator"
        case .freezer: return "snowflake"
        case .pantry: return "cabinet"
        }
    }
}

enum MealSlot: String, CaseIterable, Identifiable, Codable {
    case breakfast, lunch, dinner, snack
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

@Model
final class PantryItem {
    var uuid: UUID = UUID()
    var name: String = ""
    var quantity: Double = 1
    var unit: String = ""
    var locationRaw: String = StorageLocation.fridge.rawValue
    var category: String = ""
    var addedAt: Date = Date.now
    var expiresAt: Date?
    var barcode: String?
    var notes: String = ""
    /// What it cost, when known (from a receipt). Used later for waste tracking.
    var price: Double?
    /// Last time someone confirmed in a check-in that it's still there.
    var lastConfirmedAt: Date?

    var location: StorageLocation {
        get { StorageLocation(rawValue: locationRaw) ?? .fridge }
        set { locationRaw = newValue.rawValue }
    }

    init(
        name: String,
        quantity: Double = 1,
        unit: String = "",
        location: StorageLocation = .fridge,
        category: String = "",
        expiresAt: Date? = nil,
        barcode: String? = nil
    ) {
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.locationRaw = location.rawValue
        self.category = category
        self.expiresAt = expiresAt
        self.barcode = barcode
    }
}

@Model
final class Recipe {
    var uuid: UUID = UUID()
    /// The bundled library's id for this recipe ("red-lentil-dal-with-spinach"); "" for the user's own.
    /// Survives title changes and translations.
    var libraryID: String = ""
    var title: String = ""
    var summary: String = ""
    /// A `Cuisine` id from FridgeCore (kept as a string so the CloudKit schema stays simple).
    var cuisine: String = ""
    var servings: Int = 2
    var prepMinutes: Int = 0
    var cookMinutes: Int = 0
    var tags: [String] = []
    var instructions: [String] = []
    var isFavorite: Bool = false
    var createdAt: Date = Date.now
    var lastCookedAt: Date?
    var cookCount: Int = 0
    var sourceURL: String?
    /// Who made it: a creator's handle or a site's author, credited on the recipe page.
    var sourceCreator: String = ""
    /// Rebuilt from a video's title and caption rather than read from a written recipe.
    var isReconstructed: Bool = false

    @Relationship(deleteRule: .cascade, inverse: \RecipeIngredient.recipe)
    var ingredients: [RecipeIngredient]? = []

    @Relationship(deleteRule: .cascade, inverse: \MealPlanEntry.recipe)
    var mealPlanEntries: [MealPlanEntry]? = []

    var totalMinutes: Int { prepMinutes + cookMinutes }

    var sortedIngredients: [RecipeIngredient] {
        (ingredients ?? []).sorted { $0.order < $1.order }
    }

    init(title: String, summary: String = "", servings: Int = 2) {
        self.title = title
        self.summary = summary
        self.servings = servings
    }
}

@Model
final class RecipeIngredient {
    var name: String = ""
    var quantity: Double = 0
    var unit: String = ""
    var note: String = ""
    var isOptional: Bool = false
    var order: Int = 0
    /// The plain English name when `name` is in another language ("shrimp" for "camarones"), so matching,
    /// allergy checks and nutrition use the canonical name (HANDOFF §4.2). Empty when `name` is English.
    var canonicalName: String = ""
    var recipe: Recipe?

    init(name: String, quantity: Double = 0, unit: String = "", note: String = "", isOptional: Bool = false, order: Int = 0,
         canonicalName: String = "") {
        self.name = name
        self.canonicalName = canonicalName
        self.quantity = quantity
        self.unit = unit
        self.note = note
        self.isOptional = isOptional
        self.order = order
    }
}

@Model
final class MealPlanEntry {
    /// Start of the planned day.
    var day: Date = Date.now
    var slotRaw: String = MealSlot.dinner.rawValue
    var servings: Int = 2
    var note: String = ""
    var recipe: Recipe?

    var slot: MealSlot {
        get { MealSlot(rawValue: slotRaw) ?? .dinner }
        set { slotRaw = newValue.rawValue }
    }

    init(day: Date, slot: MealSlot, recipe: Recipe?, servings: Int) {
        self.day = Calendar.current.startOfDay(for: day)
        self.slotRaw = slot.rawValue
        self.recipe = recipe
        self.servings = servings
    }
}

@Model
final class ShoppingItem {
    var name: String = ""
    var quantity: Double = 0
    var unit: String = ""
    var isChecked: Bool = false
    var addedAt: Date = Date.now
    /// Free-text reason, e.g. "Pancakes, French Toast".
    var reason: String = ""

    init(name: String, quantity: Double = 0, unit: String = "", reason: String = "") {
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.reason = reason
    }
}

/// Food leaving the kitchen: used up or thrown away. Powers waste tracking.
@Model
final class FoodEvent {
    /// "used" or "tossed".
    var kind: String = "used"
    var name: String = ""
    var quantity: Double = 0
    var unit: String = ""
    var category: String = ""
    /// What it cost, when known.
    var value: Double?
    var date: Date = Date.now

    init(kind: String, item: PantryItem, date: Date = .now) {
        self.kind = kind
        self.name = item.name
        self.quantity = item.quantity
        self.unit = item.unit
        self.category = item.category
        self.value = item.price
        self.date = date
    }
}

/// Someone who eats from this kitchen. Everyone's allergies and diets are
/// combined, so shared meals are safe for the whole household.
@Model
final class HouseholdMember {
    var uuid: UUID = UUID()
    var name: String = ""
    /// `Allergen` raw values.
    var allergensRaw: [String] = []
    /// `Diet` raw values.
    var dietsRaw: [String] = []
    /// Other foods to leave out, as typed ("cilantro").
    var avoid: [String] = []
    var createdAt: Date = Date.now

    // Nutrition goal (Phase C). Empty goal = no targets.
    /// `NutritionGoal` raw value, or "".
    var goalRaw: String = ""
    /// Daily targets; 0 = not set.
    var targetKcal: Double = 0
    var targetProtein: Double = 0
    var targetCarbs: Double = 0
    var targetFat: Double = 0
    var targetFiber: Double = 0
    /// Optional details for suggesting calories; 0 / "" = not given.
    var age: Int = 0
    var heightCm: Double = 0
    var weightKg: Double = 0
    var sexRaw: String = ""
    var activityRaw: String = ""

    init(name: String) {
        self.name = name
    }
}

/// Nutrition for an ingredient the built-in table doesn't know, estimated once by Claude.
@Model
final class IngredientNutrition {
    var name: String = ""
    var kcal: Double = 0
    var protein: Double = 0
    var carbs: Double = 0
    var fat: Double = 0
    var fiber: Double = 0
    /// 0 = unknown density.
    var gramsPerCup: Double = 0
    /// "bunch=30", "=50" (one item).
    var unitsRaw: [String] = []
    var createdAt: Date = Date.now

    init(name: String) {
        self.name = name
    }
}

enum AppSchema {
    static let models: [any PersistentModel.Type] = [
        PantryItem.self, Recipe.self, RecipeIngredient.self, MealPlanEntry.self, ShoppingItem.self, FoodEvent.self,
        HouseholdMember.self, IngredientNutrition.self,
    ]

    /// Uses iCloud sync when the app is signed with the CloudKit entitlement and
    /// the user is signed in to iCloud; otherwise falls back to local storage.
    @MainActor
    static func makeContainer(inMemory: Bool = false) -> ModelContainer {
        let schema = Schema(models)
        if inMemory {
            let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            return try! ModelContainer(for: schema, configurations: config)
        }
        do {
            let config = ModelConfiguration(schema: schema, cloudKitDatabase: .automatic)
            return try ModelContainer(for: schema, configurations: config)
        } catch {
            print("CloudKit container unavailable (\(error)); using local store.")
            let config = ModelConfiguration(schema: schema, cloudKitDatabase: .none)
            return try! ModelContainer(for: schema, configurations: config)
        }
    }
}
