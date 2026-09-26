import SwiftUI
import SwiftData
import FridgeCore

/// The home screen: three dinner options ranked by what's about to go bad.
struct TonightView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @Query(filter: #Predicate<ShoppingItem> { !$0.isChecked }) private var shopping: [ShoppingItem]
    @Query(sort: \MealPlanEntry.day) private var plan: [MealPlanEntry]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.tonightMaxMinutes) private var maxMinutes = 0
    /// "yyyy-MM-dd|uuid,uuid": recipes dismissed with "Not tonight", reset daily.
    @AppStorage(SettingsKey.tonightSkipped) private var skippedRaw = ""

    @State private var path = NavigationPath()
    @State private var cooking: MealPlanEntry?
    @State private var chefPrompt: ChefPrompt?
    @State private var showReceiptScan = false
    @State private var toast: String?

    private struct ChefPrompt: Identifiable {
        let id = UUID()
        let text: String?
    }

    private static let dayKey: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    // MARK: - Derived state

    private var tonightEntry: MealPlanEntry? {
        plan.first { Calendar.current.isDateInToday($0.day) && $0.slot == .dinner && $0.recipe != nil }
    }

    private var skipped: Set<UUID> {
        let parts = skippedRaw.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2, parts[0] == Self.dayKey.string(from: .now) else { return [] }
        return Set(parts[1].split(separator: ",").compactMap { UUID(uuidString: String($0)) })
    }

    private var picks: [TonightPick] {
        let skip = skipped
        return TonightPlanner.picks(
            recipes: recipes.map {
                TonightRecipe(title: $0.title, requirements: $0.requirements, totalMinutes: $0.totalMinutes,
                              tags: $0.tags, isFavorite: $0.isFavorite, lastCookedAt: $0.lastCookedAt)
            },
            stock: pantry.map(\.stockItem),
            staples: Staples.parse(staplesRaw),
            soonThresholdDays: soonDays,
            maxMinutes: maxMinutes == 0 ? nil : maxMinutes,
            excluding: Set(recipes.indices.filter { skip.contains(recipes[$0].uuid) })
        )
    }

    private var expiring: [PantryItem] {
        pantry
            .filter { $0.expiryStatus(soonThresholdDays: soonDays).isUrgent }
            .sorted { $0.expiryStatus(soonThresholdDays: soonDays).urgency < $1.expiryStatus(soonThresholdDays: soonDays).urgency }
    }

    // MARK: - Body

    var body: some View {
        let currentPicks = picks
        NavigationStack(path: $path) {
            List {
                if let entry = tonightEntry, let recipe = entry.recipe {
                    tonightCard(entry: entry, recipe: recipe)
                }

                let soon = expiring
                if !soon.isEmpty {
                    Section("Use soon") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(soon) { item in
                                    HStack(spacing: 6) {
                                        Text(item.name).font(.subheadline)
                                        ExpiryBadge(status: item.expiryStatus(soonThresholdDays: soonDays))
                                    }
                                    .padding(.leading, 10)
                                    .padding(.trailing, 4)
                                    .padding(.vertical, 4)
                                    .background(Color(.tertiarySystemFill), in: Capsule())
                                }
                            }
                            .padding(.vertical, 2)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    }
                }

                Section {
                    Picker("Time", selection: $maxMinutes) {
                        Text("Any time").tag(0)
                        Text("≤ 30 min").tag(30)
                        Text("≤ 45 min").tag(45)
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }

                if currentPicks.isEmpty {
                    emptyState
                } else {
                    ForEach(currentPicks, id: \.recipeIndex) { pick in
                        pickCard(pick, recipe: recipes[pick.recipeIndex])
                    }
                }

                Section {
                    Button {
                        chefPrompt = ChefPrompt(text: "What should I make for dinner tonight? Use what's expiring first, and keep it realistic for a weeknight.")
                    } label: {
                        Label("Ask the chef for something new", systemImage: "sparkles")
                    }
                } footer: {
                    Text("Picks favor food that's about to go bad, recipes you can make without shopping, and things you haven't had lately.")
                }
            }
            .navigationTitle("Tonight")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { chefPrompt = ChefPrompt(text: nil) } label: { Image(systemName: "sparkles") }
                        .accessibilityLabel("Chef")
                }
            }
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                }
            }
            .sheet(item: $cooking) { entry in
                if let recipe = entry.recipe {
                    CookedSheet(recipe: recipe, servings: entry.servings)
                }
            }
            .sheet(item: $chefPrompt) { prompt in
                ChefView(initialPrompt: prompt.text, showsDone: true)
            }
            .sheet(isPresented: $showReceiptScan) { ReceiptScanView() }
            .alert(toast ?? "", isPresented: Binding(get: { toast != nil }, set: { if !$0 { toast = nil } })) {
                Button("OK") {}
            }
        }
    }

    // MARK: - Cards

    private func tonightCard(entry: MealPlanEntry, recipe: Recipe) -> some View {
        Section("Tonight's dinner") {
            VStack(alignment: .leading, spacing: 10) {
                Text(recipe.title).font(.title3.bold())
                Text([recipe.totalMinutes > 0 ? "\(recipe.totalMinutes) min" : "", "serves \(entry.servings)"]
                    .filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                HStack {
                    Button { cooking = entry } label: {
                        Label("I cooked it", systemImage: "frying.pan")
                    }
                    .buttonStyle(.borderedProminent)
                    Button("Recipe") { path.append(recipe.persistentModelID) }
                        .buttonStyle(.bordered)
                    Spacer()
                    Button("Change", role: .destructive) { context.delete(entry) }
                        .buttonStyle(.borderless)
                        .font(.subheadline)
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func pickCard(_ pick: TonightPick, recipe: Recipe) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 10) {
                Button { path.append(recipe.persistentModelID) } label: {
                    HStack(alignment: .firstTextBaseline) {
                        Text(recipe.title).font(.title3.bold()).foregroundStyle(.primary)
                        if recipe.isFavorite {
                            Image(systemName: "heart.fill").font(.caption).foregroundStyle(.pink)
                        }
                        Spacer()
                        CoverageBadge(match: pick.match)
                    }
                }
                .buttonStyle(.plain)

                Label(pick.reason, systemImage: pick.rescues.isEmpty ? "checkmark.circle" : "leaf")
                    .font(.subheadline)
                    .foregroundStyle(pick.rescues.isEmpty ? Color.secondary : Color.accentColor)

                if recipe.totalMinutes > 0 || !pick.match.missing.isEmpty {
                    HStack(spacing: 12) {
                        if recipe.totalMinutes > 0 {
                            Label("\(recipe.totalMinutes) min", systemImage: "clock")
                        }
                        if !pick.match.missing.isEmpty {
                            Label("Need \(pick.match.missing.joined(separator: ", ").lowercased())", systemImage: "cart")
                                .lineLimit(1)
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                HStack {
                    Button { cookTonight(recipe) } label: {
                        Label("Cook this", systemImage: "fork.knife")
                    }
                    .buttonStyle(.borderedProminent)
                    if !pick.match.missing.isEmpty {
                        Button("Add to list") { addMissing(recipe) }
                            .buttonStyle(.bordered)
                    }
                    Spacer()
                    Button("Not tonight") { skip(recipe) }
                        .buttonStyle(.borderless)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        Section {
            if recipes.isEmpty {
                ContentUnavailableView {
                    Label("No recipes yet", systemImage: "book")
                } description: {
                    Text("Add a few recipes and Tonight will suggest what to cook from what you have.")
                } actions: {
                    Button("Add sample recipes") { _ = try? SampleData.importRecipes(into: context) }
                        .buttonStyle(.borderedProminent)
                }
            } else if pantry.isEmpty {
                ContentUnavailableView {
                    Label("Your fridge is empty", systemImage: "refrigerator")
                } description: {
                    Text("Scan your last grocery receipt so Tonight knows what you have.")
                } actions: {
                    Button("Scan a receipt") { showReceiptScan = true }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                ContentUnavailableView {
                    Label("Nothing fits tonight", systemImage: "fork.knife")
                } description: {
                    let message: String = maxMinutes > 0
                        ? "No recipe under \(maxMinutes) minutes works with what you have. Try Any time, or ask the chef."
                        : "Every recipe needs more than \(TonightPlanner.maxMissing) things you don't have. Ask the chef for ideas from what's in your fridge."
                    Text(message)
                } actions: {
                    if !skipped.isEmpty {
                        Button("Show skipped recipes") { skippedRaw = "" }
                    }
                }
            }
        }
    }

    // MARK: - Actions

    private func cookTonight(_ recipe: Recipe) {
        if let entry = tonightEntry {
            entry.recipe = recipe
            entry.servings = recipe.servings
        } else {
            context.insert(MealPlanEntry(day: .now, slot: .dinner, recipe: recipe, servings: recipe.servings))
        }
    }

    private func skip(_ recipe: Recipe) {
        var ids = skipped
        ids.insert(recipe.uuid)
        skippedRaw = Self.dayKey.string(from: .now) + "|" + ids.map(\.uuidString).joined(separator: ",")
    }

    private func addMissing(_ recipe: Recipe) {
        let added = ShoppingAdder.addMissing(
            for: [PlannedRecipe(title: recipe.title, requirements: recipe.requirements)],
            pantry: pantry,
            existing: shopping,
            preferences: KitchenPreferences(staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays),
            context: context
        )
        toast = added == 0 ? "Everything is already on your list." : "Added \(added) item\(added == 1 ? "" : "s") to Shopping."
    }
}
