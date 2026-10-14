import AppIntents
import CoreSpotlight
import FridgeCore
import Foundation
import SwiftData

// Siri, Shortcuts and Spotlight (DESIGN.md §8.19). The intents run in the app's process against the
// app's own container (`AppSchema.shared`), so what Siri says is what the app shows.

// MARK: - Recipes

/// A saved recipe, for "Start cooking …", Shortcuts' recipe picker and Spotlight.
struct RecipeEntity: AppEntity, IndexedEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Recipe"
    static var defaultQuery = RecipeQuery()

    let id: UUID
    /// In the app's language, as the Recipes tab shows it.
    let title: String
    let minutes: Int

    var displayRepresentation: DisplayRepresentation {
        let subtitle: LocalizedStringResource? = minutes > 0 ? "\(minutes) min" : nil
        return DisplayRepresentation(title: "\(title)",
                                     subtitle: subtitle,
                              image: DisplayRepresentation.Image(systemName: "fork.knife"))
    }

    @MainActor
    init(_ recipe: Recipe) {
        id = recipe.uuid
        title = recipe.displayTitle
        minutes = recipe.totalMinutes
    }
}

struct RecipeQuery: EntityStringQuery {
    func entities(for identifiers: [UUID]) async throws -> [RecipeEntity] {
        try await MainActor.run {
            let wanted = Set(identifiers)
            return try FridgeData.recipes().filter { wanted.contains($0.uuid) }.map(RecipeEntity.init)
        }
    }

    func entities(matching string: String) async throws -> [RecipeEntity] {
        try await MainActor.run {
            try FridgeData.recipes()
                .filter { $0.displayTitle.localizedStandardContains(string) || $0.title.localizedStandardContains(string) }
                .map(RecipeEntity.init)
        }
    }

    /// Favorites and recently cooked recipes first, then the rest by title.
    func suggestedEntities() async throws -> [RecipeEntity] {
        try await MainActor.run {
            try FridgeData.recipes()
                .sorted { a, b in
                    if a.isFavorite != b.isFavorite { return a.isFavorite }
                    let x = a.lastCookedAt ?? .distantPast, y = b.lastCookedAt ?? .distantPast
                    if x != y { return x > y }
                    return a.displayTitle.localizedStandardCompare(b.displayTitle) == .orderedAscending
                }
                .map(RecipeEntity.init)
        }
    }
}

// MARK: - Intents

struct WhatsForDinnerIntent: AppIntent {
    static var title: LocalizedStringResource = "What's for Dinner?"
    static var description = IntentDescription("Suggests a dinner from what's in your fridge, starting with food that needs using up.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        if let planned = try FridgeData.plannedDinnerTonight() {
            return .result(dialog: "Tonight's dinner is \(planned.displayTitle).")
        }
        guard let best = try FridgeData.tonightPick() else {
            if try FridgeData.recipes().isEmpty {
                return .result(dialog: "You don't have any recipes yet. Open Fridge to add some.")
            }
            return .result(dialog: "Nothing fits what you have tonight. Open Fridge and ask the chef for ideas.")
        }
        return .result(dialog: "How about \(best.recipe.displayTitle)? \(best.pick.localizedReason).")
    }
}

struct ExpiringSoonIntent: AppIntent {
    static var title: LocalizedStringResource = "What's Expiring Soon"
    static var description = IntentDescription("Lists the food in your fridge to use up first.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let pantry = try FridgeData.pantry()
        if pantry.isEmpty {
            return .result(dialog: "Your fridge is empty in Fridge. Scan a receipt to fill it.")
        }
        let days = FridgeData.soonThresholdDays
        // Like Tonight's "Use soon": what can still be saved first, soonest first; then what's past its
        // date, most recent first, so long-forgotten food doesn't crowd out today's.
        let statuses = pantry.map { (item: $0, status: $0.expiryStatus(soonThresholdDays: days)) }
        let soon = statuses.filter { $0.status.isUrgent && !$0.status.isExpired }
            .sorted { $0.status.urgency < $1.status.urgency }
        let past = statuses.filter { $0.status.isExpired }
            .sorted { $0.status.urgency > $1.status.urgency }
        let urgent = soon + past
        if urgent.isEmpty {
            if days <= 1 {
                return .result(dialog: "Nothing needs using up by tomorrow.")
            }
            return .result(dialog: "Nothing needs using up in the next \(days) days.")
        }
        let names = urgent.map { String(localized: "\($0.item.name) (\($0.status.localizedShort.localizedLowercase))") }
        let list = LocalizedList.and(names)
        if urgent.count == 1 {
            return .result(dialog: "Use this soon: \(list).")
        }
        return .result(dialog: "Use these soon: \(list).")
    }
}

struct AddToShoppingListIntent: AppIntent {
    static var title: LocalizedStringResource = "Add to Shopping List"
    static var description = IntentDescription("Adds one or more items to Fridge's shopping list. Separate items with commas.")

    @Parameter(title: "Item", requestValueDialog: "What should I add?")
    var item: String

    static var parameterSummary: some ParameterSummary {
        Summary("Add \(\.$item) to the shopping list")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let names = Self.items(in: item)
        guard !names.isEmpty else { throw $item.needsValueError("What should I add?") }
        let context = AppSchema.shared.mainContext
        var onList = Set(try FridgeData.shoppingList().map { IngredientName.normalize($0.name) })
        var added: [String] = []
        var already: [String] = []
        for name in names {
            // Inserting also counts it, so "eggs, egg" adds one.
            if onList.insert(IngredientName.normalize(name)).inserted {
                context.insert(ShoppingItem(name: name))
                added.append(name)
            } else if !added.contains(name) {
                already.append(name)
            }
        }
        try context.save()
        if added.isEmpty {
            let list = LocalizedList.and(already.map { $0.localizedLowercase })
            if already.count == 1 {
                return .result(dialog: "\(list) is already on your shopping list.")
            }
            return .result(dialog: "\(list) are already on your shopping list.")
        }
        let list = LocalizedList.and(added.map { $0.localizedLowercase })
        return .result(dialog: "Added \(list) to your shopping list.")
    }

    /// "milk, eggs and bread" → ["Milk", "Eggs", "Bread"]. Commas separate items; "and" only joins the
    /// last two of a list, so "mac and cheese" and "half and half" stay one item.
    static func items(in text: String) -> [String] {
        var text = text
        for separator in ["，", "、", ";", "；", "\n"] {
            text = text.replacingOccurrences(of: separator, with: ",")
        }
        var parts = text.split(separator: ",").map(String.init)
        if parts.count > 1, let last = parts.popLast() {
            parts += splitFinalJoin(last)
        }
        return parts
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters)) }
            .filter { !$0.isEmpty }
            .map { $0.prefix(1).localizedUppercase + $0.dropFirst() }
    }

    /// "eggs and bread" → ["eggs", "bread"], at the first "and" / "y" / "e" only.
    private static func splitFinalJoin(_ part: String) -> [String] {
        for joiner in [" and ", " y ", " e "] {
            if let range = part.range(of: joiner, options: .caseInsensitive) {
                return [String(part[..<range.lowerBound]), String(part[range.upperBound...])]
            }
        }
        return [part]
    }
}

struct StartCookingIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Cooking"
    static var description = IntentDescription("Opens a recipe in cooking mode: the ingredients to get out, then one step at a time.")
    static var openAppWhenRun = true

    @Parameter(title: "Recipe", requestValueDialog: "Which recipe?")
    var recipe: RecipeEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Start cooking \(\.$recipe)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        AppRouter.shared.cookRecipe = recipe.id
        return .result()
    }
}

/// Opens a recipe's page; also what tapping a recipe in Spotlight runs.
struct OpenRecipeIntent: OpenIntent {
    static var title: LocalizedStringResource = "Open Recipe"
    static var openAppWhenRun = true

    @Parameter(title: "Recipe")
    var target: RecipeEntity

    @MainActor
    func perform() async throws -> some IntentResult {
        AppRouter.shared.tab = .recipes
        AppRouter.shared.openRecipe = target.id
        return .result()
    }
}

// MARK: - Siri phrases

/// Ready to use without any setup: "What's for dinner in Fridge", "Start cooking Pad Thai in Fridge".
/// Phrases in other languages are in AppShortcuts.xcstrings.
struct FridgeShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: WhatsForDinnerIntent(), phrases: [
            "What's for dinner in \(.applicationName)",
            "What should I cook in \(.applicationName)",
            "Ask \(.applicationName) what's for dinner",
        ], shortTitle: "What's for Dinner?", systemImageName: "fork.knife")
        AppShortcut(intent: ExpiringSoonIntent(), phrases: [
            "What's expiring in \(.applicationName)",
            "What should I use up in \(.applicationName)",
            "What's going bad in \(.applicationName)",
        ], shortTitle: "Expiring Soon", systemImageName: "clock.badge.exclamationmark")
        AppShortcut(intent: AddToShoppingListIntent(), phrases: [
            "Add to my \(.applicationName) shopping list",
            "Add something to the \(.applicationName) shopping list",
            "Add to the shopping list in \(.applicationName)",
        ], shortTitle: "Add to Shopping List", systemImageName: "cart.badge.plus")
        AppShortcut(intent: StartCookingIntent(), phrases: [
            "Start cooking \(\.$recipe) in \(.applicationName)",
            "Cook \(\.$recipe) with \(.applicationName)",
            "Start cooking in \(.applicationName)",
        ], shortTitle: "Start Cooking", systemImageName: "frying.pan")
    }
}

// MARK: - Data

/// What the intents read, from the app's container and settings.
@MainActor
enum FridgeData {
    static var context: ModelContext { AppSchema.shared.mainContext }

    static var soonThresholdDays: Int {
        UserDefaults.standard.object(forKey: SettingsKey.soonThresholdDays) as? Int ?? SettingsDefault.soonThresholdDays
    }

    static func recipes() throws -> [Recipe] {
        try context.fetch(FetchDescriptor<Recipe>(sortBy: [SortDescriptor(\.title)]))
    }

    static func pantry() throws -> [PantryItem] {
        try context.fetch(FetchDescriptor<PantryItem>())
    }

    static func shoppingList() throws -> [ShoppingItem] {
        try context.fetch(FetchDescriptor<ShoppingItem>(predicate: #Predicate { !$0.isChecked }))
    }

    static func plannedDinnerTonight() throws -> Recipe? {
        try context.fetch(FetchDescriptor<MealPlanEntry>())
            .first { Calendar.current.isDateInToday($0.day) && $0.slot == .dinner && $0.recipe != nil }?
            .recipe
    }

    /// Tonight's top pick, as the Tonight tab ranks it (without its time and mood filters).
    static func tonightPick() throws -> (recipe: Recipe, pick: TonightPick)? {
        let recipes = try self.recipes()
        let household = try context.fetch(FetchDescriptor<HouseholdMember>())
        let skipped = TonightView.skippedRecipes(from: UserDefaults.standard.string(forKey: SettingsKey.tonightSkipped) ?? "")
        let staples = UserDefaults.standard.string(forKey: SettingsKey.staples) ?? SettingsDefault.staples
        let unsafe = Household.unsafeIndexes(recipes, members: household)
        let picks = TonightPlanner.picks(
            recipes: recipes.map {
                TonightRecipe(title: $0.title, requirements: $0.requirements, totalMinutes: $0.totalMinutes,
                              tags: $0.tags, isFavorite: $0.isFavorite, lastCookedAt: $0.lastCookedAt)
            },
            stock: try pantry().map(\.stockItem),
            staples: Staples.parse(staples),
            soonThresholdDays: soonThresholdDays,
            maxMinutes: nil,
            mood: nil,
            excluding: unsafe.union(recipes.indices.filter { skipped.contains(recipes[$0].uuid) })
        )
        guard let pick = picks.first else { return nil }
        return (recipe: recipes[pick.recipeIndex], pick: pick)
    }
}

// MARK: - Spotlight

@MainActor
enum RecipeSpotlight {
    private static let signatureKey = "spotlightRecipeSignature"

    /// Puts every saved recipe in Spotlight (replacing the last set) and refreshes the recipe names Siri
    /// listens for in "Start cooking …". Skipped when the shown names haven't changed since last time.
    static func update(_ recipes: [Recipe]) async {
        let entities = recipes.map(RecipeEntity.init)
        // The shown names (translations included) and language, so a new translation re-indexes too.
        let signature = Self.signature(entities)
        guard UserDefaults.standard.string(forKey: signatureKey) != signature else { return }
        let index = CSSearchableIndex.default()
        try? await index.deleteAppEntities(ofType: RecipeEntity.self)
        do {
            try await index.indexAppEntities(entities)
            UserDefaults.standard.set(signature, forKey: signatureKey)
        } catch {
            // Left unset, so the next change or launch tries again.
        }
        FridgeShortcuts.updateAppShortcutParameters()
    }

    /// A stable fingerprint (FNV-1a) of what's indexed; `hashValue` changes every launch.
    private static func signature(_ entities: [RecipeEntity]) -> String {
        let text = AppLanguage.current + entities
            .map { "\($0.id.uuidString)|\($0.title)|\($0.minutes)" }
            .sorted()
            .joined(separator: "\n")
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in text.utf8 {
            hash ^= UInt64(byte)
            hash = hash &* 0x100000001b3
        }
        return "\(entities.count)-\(String(hash, radix: 16))"
    }
}
