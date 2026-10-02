import SwiftUI
import SwiftData
import FridgeCore

// Explore (HANDOFF-cuisines-languages-moods.md §2): browse the whole catalog, the bundled
// library plus the server's recipe packs plus the user's own recipes, by mood and by cuisine.

/// A page Explore can open.
enum ExploreRoute: Hashable {
    case cuisine(String)
    case mood(String)
    /// A server menu, by id.
    case menu(String)
}

/// One recipe in the catalog: a library or pack recipe (maybe not saved yet), or the user's own.
struct CatalogEntry: Identifiable {
    /// Library id, or the saved recipe's uuid for the user's own recipes.
    let id: String
    let title: String
    let summary: String
    let cuisine: String
    let tags: [String]
    let totalMinutes: Int
    let saved: Recipe?
    let sample: SampleData.SampleRecipe?

    /// Worked out on demand: Explore's home only needs cuisines and tags, not every saved recipe's ingredients.
    var requirements: [IngredientRequirement] {
        if let saved { return saved.requirements }
        return (sample?.ingredients ?? []).map {
            IngredientRequirement(name: $0.name, quantity: $0.quantity, unit: $0.unit, isOptional: $0.isOptional)
        }
    }

    var tagIDs: [String] { RecipeTag.ids(for: tags) }

    /// The title in the app's language: the saved recipe's (translated while unedited), or the library's.
    @MainActor
    var displayTitle: String {
        if let saved { return saved.displayTitle }
        return RecipeTranslations.title(id: id, english: title)
    }

    var tonightRecipe: TonightRecipe {
        TonightRecipe(title: title, requirements: requirements, totalMinutes: totalMinutes, tags: tags,
                      isFavorite: saved?.isFavorite ?? false, lastCookedAt: saved?.lastCookedAt)
    }

    /// Library and pack recipes, using the saved copy where there is one, then the user's own recipes.
    /// A saved copy is found by library id, or by title for a recipe saved before ids (or under the same
    /// title as a library recipe), so nothing is listed twice.
    @MainActor
    static func catalog(saved: [Recipe], packs: [SampleData.SampleRecipe]) -> [CatalogEntry] {
        var byID: [String: Recipe] = [:]
        var byTitle: [String: Recipe] = [:]
        for recipe in saved {
            if !recipe.libraryID.isEmpty {
                if byID[recipe.libraryID] == nil { byID[recipe.libraryID] = recipe }
            } else if byTitle[recipe.title.lowercased()] == nil {
                byTitle[recipe.title.lowercased()] = recipe
            }
        }
        var entries: [CatalogEntry] = []
        var listed: Set<String> = []
        var used: Set<UUID> = []
        for sample in SampleData.samples + packs {
            guard let id = sample.id, listed.insert(id).inserted else { continue }
            if let recipe = byID[id] ?? byTitle[sample.title.lowercased()], used.insert(recipe.uuid).inserted {
                entries.append(CatalogEntry(recipe: recipe, id: id, sample: sample))
            } else {
                entries.append(CatalogEntry(
                    id: id, title: sample.title, summary: sample.summary, cuisine: sample.cuisine, tags: sample.tags,
                    totalMinutes: sample.prepMinutes + sample.cookMinutes, saved: nil, sample: sample))
            }
        }
        for recipe in saved where !used.contains(recipe.uuid) && !listed.contains(recipe.libraryID) {
            entries.append(CatalogEntry(recipe: recipe, id: recipe.uuid.uuidString, sample: nil))
        }
        return entries
    }

    private init(id: String, title: String, summary: String, cuisine: String, tags: [String], totalMinutes: Int,
                 saved: Recipe?, sample: SampleData.SampleRecipe?) {
        self.id = id
        self.title = title
        self.summary = summary
        self.cuisine = cuisine
        self.tags = tags
        self.totalMinutes = totalMinutes
        self.saved = saved
        self.sample = sample
    }

    @MainActor
    private init(recipe: Recipe, id: String, sample: SampleData.SampleRecipe?) {
        self.init(id: id, title: recipe.title, summary: recipe.summary, cuisine: recipe.cuisine, tags: recipe.tags,
                  totalMinutes: recipe.totalMinutes, saved: recipe, sample: sample)
    }

    func matches(_ route: ExploreRoute) -> Bool {
        switch route {
        case .cuisine(let id): return Cuisine.id(for: cuisine) == id
        case .mood(let id): return tagIDs.contains(id)
        case .menu: return false
        }
    }
}

// MARK: - Explore home

/// The Recipes tab's Explore mode: this week's menu, big mood tiles, cuisines grouped by region,
/// then the other menus.
struct ExploreHome: View {
    let entries: [CatalogEntry]
    /// The rotation's menu for this week, if the server has menus.
    var weekly: RecipeMenu? = nil
    /// Menus to list: in-season occasions and every weekly and mood menu.
    var menus: [RecipeMenu] = []
    let open: (ExploreRoute) -> Void

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var columns: [GridItem] {
        dynamicTypeSize.isAccessibilitySize
            ? [GridItem(.flexible())]
            : [GridItem(.flexible(), spacing: Theme.Space.stack), GridItem(.flexible())]
    }

    private var moodCounts: [String: Int] {
        var counts: [String: Int] = [:]
        for entry in entries {
            for id in entry.tagIDs where RecipeTag.tag(id)?.kind == .mood { counts[id, default: 0] += 1 }
        }
        return counts
    }

    private var cuisineCounts: [String: Int] {
        var counts: [String: Int] = [:]
        for entry in entries {
            if let id = Cuisine.id(for: entry.cuisine) { counts[id, default: 0] += 1 }
        }
        return counts
    }

    var body: some View {
        let moods = moodCounts
        VStack(alignment: .leading, spacing: Theme.Space.stack) {
            if let weekly {
                MenuCard(menu: weekly, eyebrow: "THIS WEEK'S MENU") { open(.menu(weekly.id)) }
                    .padding(.top, Theme.Space.xxs)
            }
            SectionHeader("What are you in the mood for?")
                .padding(.top, Theme.Space.xxs)
            LazyVGrid(columns: columns, alignment: .leading, spacing: Theme.Space.stack) {
                ForEach(RecipeTag.moods.filter { (moods[$0.id] ?? 0) > 0 }) { mood in
                    tile(title: mood.name, symbol: mood.safeSymbol, count: moods[mood.id] ?? 0) { open(.mood(mood.id)) }
                }
            }
            ForEach(Cuisine.explore(counts: cuisineCounts), id: \.region) { group in
                SectionHeader(group.region.title)
                    .padding(.top, Theme.Space.s)
                LazyVGrid(columns: columns, alignment: .leading, spacing: Theme.Space.stack) {
                    ForEach(group.cuisines) { item in
                        tile(title: item.cuisine.name, symbol: nil, count: item.count) { open(.cuisine(item.cuisine.id)) }
                    }
                }
            }
            let others = menus.filter { $0.id != weekly?.id }
            if !others.isEmpty {
                SectionHeader("Menus")
                    .padding(.top, Theme.Space.s)
                ForEach(others) { menu in
                    MenuCard(menu: menu, eyebrow: menu.isOccasion ? "IN SEASON" : "MENU") { open(.menu(menu.id)) }
                }
            }
            Text("A cuisine appears here once it has \(Cuisine.minimumToShow) recipes. New ones arrive from time to time without an app update.")
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text3)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, Theme.Space.xs)
        }
    }

    private func tile(title: String, symbol: String?, count: Int, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                if let symbol {
                    Image(systemName: symbol)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Theme.Colors.plumText)
                        .accessibilityHidden(true)
                }
                Text(title)
                    .font(Theme.Fonts.tileTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Text(count == 1 ? "1 recipe" : "\(count) recipes")
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
            }
            .frame(maxWidth: .infinity, minHeight: symbol == nil ? 64 : 92, alignment: .topLeading)
            .surfaceCard()
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(count == 1 ? "\(title), 1 recipe" : "\(title), \(count) recipes")
    }
}

// MARK: - Cuisine or mood page

/// A cuisine's or a mood's recipes, ones you can make first, with "Plan 3 of these" and the chef.
struct CollectionPage: View {
    let route: ExploreRoute
    /// Opens a saved recipe in the Recipes stack.
    let openRecipe: (Recipe) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @Query(sort: \MealPlanEntry.day) private var plan: [MealPlanEntry]
    @Query private var household: [HouseholdMember]
    @ObservedObject private var packs = RecipePacks.shared
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var planned: String?
    @State private var planTick = 0
    @State private var chef: ChefRequest?

    private struct ChefRequest: Identifiable {
        let id = UUID()
        let prompt: String
    }

    private struct Row: Identifiable {
        let entry: CatalogEntry
        let match: RecipeMatch
        var id: String { entry.id }
    }

    private var cuisine: Cuisine? {
        if case .cuisine(let id) = route { return Cuisine.cuisine(id) }
        return nil
    }

    private var mood: RecipeTag? {
        if case .mood(let id) = route { return RecipeTag.tag(id) }
        return nil
    }

    private var title: String { cuisine?.name ?? mood?.name ?? "Recipes" }

    private var intro: String {
        if let cuisine { return cuisine.intro }
        return mood?.intro ?? ""
    }

    private var rows: [Row] {
        let stock = pantry.map(\.stockItem)
        let staples = Staples.parse(staplesRaw)
        return CatalogEntry.catalog(saved: recipes, packs: packs.recipes)
            .filter { $0.matches(route) }
            .map { entry in
                Row(entry: entry, match: RecipeMatcher.match(requirements: entry.requirements, stock: stock, staples: staples,
                                                             soonThresholdDays: soonDays))
            }
            .sorted { a, b in
                if RecipeMatcher.isBetter(a.match, than: b.match) { return true }
                if RecipeMatcher.isBetter(b.match, than: a.match) { return false }
                return a.entry.title.localizedCaseInsensitiveCompare(b.entry.title) == .orderedAscending
            }
    }

    var body: some View {
        let all = rows
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.stack) {
                header(count: all.count)
                actions(all)
                if let planned {
                    PlannedNote(text: planned)
                        .transition(.opacity)
                }
                if mood?.isGentleMood == true {
                    GentleMoodFooter()
                }
                CatalogList(count: all.count) { index in
                    row(all[index], showsSeparator: index < all.count - 1)
                }
            }
            .padding(.horizontal, Theme.Space.gutter)
            .padding(.bottom, Theme.Space.xl)
            .containerRelativeFrame(.horizontal)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .background(Theme.Colors.canvas)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(.success, trigger: planTick)
        .sheet(item: $chef) { request in
            ChefView(initialPrompt: request.prompt, initialMood: mood?.id, initialCuisine: cuisine?.id, showsDone: true)
        }
    }

    // MARK: Header and actions

    private func header(count: Int) -> some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            Text(cuisine?.region.title ?? "Mood")
                .eyebrowStyle()
                .foregroundStyle(Theme.Colors.text2)
            Text(title)
                .font(Theme.Fonts.display)
                .foregroundStyle(Theme.Colors.ink)
                .accessibilityAddTraits(.isHeader)
            if !intro.isEmpty {
                Text(intro)
                    .font(Theme.Fonts.headnote)
                    .foregroundStyle(Theme.Colors.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text(count == 1 ? "1 recipe, ones you can make first" : "\(count) recipes, ones you can make first")
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text3)
        }
        .padding(.top, Theme.Space.s)
    }

    private func actions(_ all: [Row]) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Theme.Space.s) {
                planButton(all)
                chefButton
                Spacer(minLength: 0)
            }
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                planButton(all)
                chefButton
            }
        }
    }

    private func planButton(_ all: [Row]) -> some View {
        Button { planThree(all) } label: {
            Label("Plan 3 of these", systemImage: "calendar.badge.plus")
        }
        .buttonStyle(PrimaryButtonStyle(size: .compact))
        .disabled(all.isEmpty)
        .accessibilityHint("Adds three of these as dinners on your next open nights")
    }

    private var chefButton: some View {
        Button { askChef() } label: {
            Label("Ask the chef", systemImage: "sparkles")
        }
        .buttonStyle(SecondaryButtonStyle(size: .compact))
    }

    // MARK: Rows

    private func row(_ row: Row, showsSeparator: Bool) -> some View {
        CatalogRow(entry: row.entry, match: row.match, showsSeparator: showsSeparator) { open(row.entry) }
    }

    /// Saved recipes open directly; library and pack recipes are saved first, like super ingredients.
    private func open(_ entry: CatalogEntry) {
        if let saved = entry.saved {
            openRecipe(saved)
        } else if let recipe = SampleData.recipe(entry.id, in: context, extra: packs.recipes) {
            openRecipe(recipe)
        }
    }

    // MARK: Plan 3 and the chef

    /// Three of these as dinners on the next open nights of the coming week, chosen with the same
    /// ranking as Plan my week (shopping mode: what you have breaks ties), skipping anything that
    /// breaks the household's allergies or diets or is already planned this week.
    private func planThree(_ all: [Row]) {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let week = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: today) }
        let open = week.filter { day in
            // Any dinner entry takes the night, a note like "Eating out" included (same as Plan my week).
            !plan.contains { calendar.isDate($0.day, inSameDayAs: day) && $0.slot == .dinner }
        }
        guard !open.isEmpty else {
            show("Your next 7 dinners are already planned.")
            return
        }
        let plannedIDs = Set(plan.filter { $0.day >= today }.compactMap { $0.recipe?.uuid })
        let plannedLibraryIDs = Set(plan.filter { $0.day >= today }.compactMap { $0.recipe?.libraryID }.filter { !$0.isEmpty })
        let restrictions = Household.restrictions(household)
        let candidates = all.map(\.entry).filter { entry in
            if let saved = entry.saved, plannedIDs.contains(saved.uuid) { return false }
            if plannedLibraryIDs.contains(entry.id) { return false }
            return restrictions.isEmpty || DietRules.fits(ingredients: entry.requirements.map(\.name), restrictions: restrictions)
        }
        let picks = WeekPlanner.fill(
            days: open, recipes: candidates.map(\.tonightRecipe), stock: pantry.map(\.stockItem),
            staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays, shopping: true
        ).prefix(3)
        var days: [Date] = []
        for pick in picks {
            let entry = candidates[pick.recipeIndex]
            guard let recipe = entry.saved ?? SampleData.recipe(entry.id, in: context, extra: packs.recipes) else { continue }
            let day = open[pick.dayIndex]
            context.insert(MealPlanEntry(day: day, slot: .dinner, recipe: recipe, servings: recipe.servings))
            days.append(day)
        }
        if days.isEmpty {
            show(restrictions.isEmpty ? "Nothing here could be planned." : "Nothing here fits everyone's allergies and diets.")
            return
        }
        let names = days.sorted().map { $0.formatted(.dateTime.weekday(.abbreviated)) }
        show("Planned \(days.count == 1 ? "1 dinner" : "\(days.count) dinners"): \(names.formatted(.list(type: .and)))")
        planTick += 1
    }

    private func show(_ text: String) {
        AccessibilityNotification.Announcement(text).post()
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            planned = text
        }
    }

    private func askChef() {
        if let cuisine {
            chef = ChefRequest(prompt: "I'd like to cook something \(cuisine.name) this week. What would you suggest, using what I have where you can?")
        } else if let mood {
            chef = ChefRequest(prompt: "I'm in the mood for \(mood.name.lowercased()). What could I make, using what I have where you can?")
        }
    }
}

// MARK: - Shared pieces

/// A card of catalog rows, separated by hairlines.
struct CatalogList<Row: View>: View {
    let count: Int
    @ViewBuilder let row: (Int) -> Row

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<count, id: \.self) { index in
                row(index)
            }
        }
        .surfaceCard(padding: 0)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
    }
}

/// One recipe in a collection or menu: title, "25 min · need cilantro, limes", and how much you have.
struct CatalogRow: View {
    let entry: CatalogEntry
    let match: RecipeMatch
    let showsSeparator: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: Theme.Space.s) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.displayTitle)
                            .font(Theme.Fonts.rowTitle)
                            .foregroundStyle(Theme.Colors.ink)
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)
                        Text(subtitle)
                            .font(Theme.Fonts.detail)
                            .foregroundStyle(Theme.Colors.text2)
                            .lineLimit(2)
                    }
                    Spacer(minLength: 0)
                    CoverageBadge(match: match)
                }
                .padding(.vertical, Theme.Space.s)
                .padding(.horizontal, Theme.Space.m)
                .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
                if showsSeparator {
                    Rectangle()
                        .fill(Theme.Colors.separator)
                        .frame(height: 0.5)
                        .padding(.leading, Theme.Space.m)
                }
            }
            .background(Theme.Colors.surface)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint(entry.saved == nil ? "Adds it to your recipes and opens it" : "Opens the recipe")
    }

    /// "25 min · need cilantro, limes", or "you have everything".
    private var subtitle: String {
        var parts: [String] = []
        if entry.totalMinutes > 0 { parts.append("\(entry.totalMinutes) min") }
        if match.missing.isEmpty {
            parts.append("you have everything")
        } else {
            parts.append("need " + match.missing.prefix(3).map { $0.lowercased() }.joined(separator: ", "))
        }
        return parts.joined(separator: " · ")
    }
}

/// "Planned 3 dinners: Mon, Tue and Thu" with a way to the plan.
struct PlannedNote: View {
    let text: String
    var showsPlanLink = true
    /// Instead of just switching to the Plan tab (say, to close a sheet first).
    var onSeePlan: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: Theme.Space.s) {
            Label(text, systemImage: "checkmark.circle.fill")
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.plumStrong)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            if showsPlanLink {
                Button("See plan") {
                    if let onSeePlan { onSeePlan() } else { AppRouter.shared.tab = .plan }
                }
                    .buttonStyle(QuietButtonStyle(color: Theme.Colors.plumText))
            }
        }
        .padding(Theme.Space.s)
        .background(Theme.Colors.plumSoft, in: RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}
