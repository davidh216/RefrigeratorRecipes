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
    var title: String = ""
    var summary: String = ""
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
    var recipe: Recipe?

    init(name: String, quantity: Double = 0, unit: String = "", note: String = "", isOptional: Bool = false, order: Int = 0) {
        self.name = name
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

enum AppSchema {
    static let models: [any PersistentModel.Type] = [
        PantryItem.self, Recipe.self, RecipeIngredient.self, MealPlanEntry.self, ShoppingItem.self,
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
