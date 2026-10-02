import SwiftUI
import SwiftData
import FridgeCore

// Menus (HANDOFF-cuisines-languages-moods.md §3): named sets of recipes from the server, with
// "Add all to plan" and "Shop for this menu".

/// A menu as a card: Explore's "This week's menu", its menu list, and Tonight's in-season occasions.
struct MenuCard: View {
    let menu: RecipeMenu
    /// "THIS WEEK'S MENU", "IN SEASON" or "MENU".
    let eyebrow: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: Theme.Space.s) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(eyebrow)
                        .font(Theme.Fonts.eyebrow)
                        .tracking(0.6)
                        .foregroundStyle(Theme.Colors.plumText)
                    Text(menu.title)
                        .font(Theme.Fonts.cardTitle)
                        .foregroundStyle(Theme.Colors.ink)
                    Text(menu.intro)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(menu.recipes.count == 1 ? "1 recipe" : "\(menu.recipes.count) recipes")
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text3)
                }
                .multilineTextAlignment(.leading)
                Spacer(minLength: Theme.Space.xs)
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.Colors.text3)
                    .accessibilityHidden(true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .surfaceCard()
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens the menu: its recipes, add them all to your plan, or shop for them.")
    }
}

/// A menu's page: intro, its recipes (ones you can make first), "Add all to plan" and "Shop for this menu".
struct MenuPage: View {
    let menu: RecipeMenu
    /// Opens a saved recipe in the surrounding stack.
    let openRecipe: (Recipe) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]
    @Query(sort: \MealPlanEntry.day) private var plan: [MealPlanEntry]
    @Query private var household: [HouseholdMember]
    @ObservedObject private var packs = RecipePacks.shared
    @ObservedObject private var menus = Menus.shared
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var note: Note?
    @State private var doneTick = 0

    private struct Note: Equatable {
        let text: String
        let showsPlanLink: Bool
    }

    private struct Row: Identifiable {
        let entry: CatalogEntry
        let match: RecipeMatch
        var id: String { entry.id }
    }

    /// Recipes the app can save from: the packs and those included with menus.
    private var extra: [SampleData.SampleRecipe] { packs.recipes + menus.recipes }

    private var slotName: String { menu.mealSlot == .lunch ? "lunch" : "dinner" }

    /// The menu's recipes in the menu's order, using saved copies where there are some.
    /// A recipe this build can't find (say, from a newer pack it hasn't downloaded) is left out.
    private var rows: [Row] {
        let byID = Dictionary(CatalogEntry.catalog(saved: recipes, packs: extra).map { ($0.id, $0) },
                              uniquingKeysWith: { first, _ in first })
        let stock = pantry.map(\.stockItem)
        let staples = Staples.parse(staplesRaw)
        return menu.recipes.compactMap { byID[$0] }.map { entry in
            Row(entry: entry, match: RecipeMatcher.match(requirements: entry.requirements, stock: stock, staples: staples,
                                                         soonThresholdDays: soonDays))
        }
    }

    var body: some View {
        let all = rows
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.stack) {
                header(count: all.count)
                actions(all)
                if let note {
                    PlannedNote(text: note.text, showsPlanLink: note.showsPlanLink)
                        .transition(.opacity)
                }
                if let mood = menu.mood.flatMap(RecipeTag.tag), mood.isGentleMood {
                    GentleMoodFooter()
                }
                CatalogList(count: all.count) { index in
                    CatalogRow(entry: all[index].entry, match: all[index].match,
                               showsSeparator: index < all.count - 1) { open(all[index].entry) }
                }
            }
            .padding(.horizontal, Theme.Space.gutter)
            .padding(.bottom, Theme.Space.xl)
            .containerRelativeFrame(.horizontal)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .background(Theme.Colors.canvas)
        .navigationTitle(menu.title)
        .navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(.success, trigger: doneTick)
    }

    // MARK: Header and actions

    private var eyebrow: String {
        switch menu.kind {
        case "occasion": return "Occasion"
        case "mood": return menu.mood.flatMap(RecipeTag.tag)?.name ?? "Mood"
        default: return "Menu"
        }
    }

    private func header(count: Int) -> some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            Text(eyebrow)
                .eyebrowStyle()
                .foregroundStyle(Theme.Colors.text2)
            Text(menu.title)
                .font(Theme.Fonts.display)
                .foregroundStyle(Theme.Colors.ink)
                .accessibilityAddTraits(.isHeader)
            Text(menu.intro)
                .font(Theme.Fonts.headnote)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
            Text(count == 1 ? "1 recipe" : "\(count) recipes")
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text3)
        }
        .padding(.top, Theme.Space.s)
    }

    private func actions(_ all: [Row]) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Theme.Space.s) {
                planButton(all)
                shopButton(all)
                Spacer(minLength: 0)
            }
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                planButton(all)
                shopButton(all)
            }
        }
    }

    private func planButton(_ all: [Row]) -> some View {
        Button { addAllToPlan(all) } label: {
            Label("Add all to plan", systemImage: "calendar.badge.plus")
        }
        .buttonStyle(PrimaryButtonStyle(size: .compact))
        .disabled(all.isEmpty)
        .accessibilityHint("Spreads these recipes over your next open \(slotName)s this week")
    }

    private func shopButton(_ all: [Row]) -> some View {
        Button { shop(all) } label: {
            Label("Shop for this menu", systemImage: "cart.badge.plus")
        }
        .buttonStyle(SecondaryButtonStyle(size: .compact))
        .disabled(all.isEmpty)
        .accessibilityHint("Adds what you're missing for these recipes to your shopping list")
    }

    // MARK: Actions

    /// Saved recipes open directly; library, pack and menu recipes are saved first.
    private func open(_ entry: CatalogEntry) {
        if let saved = entry.saved {
            openRecipe(saved)
        } else if let recipe = SampleData.recipe(entry.id, in: context, extra: extra) {
            openRecipe(recipe)
        }
    }

    /// Recipes that suit everyone at home, and how many were left out for allergies or diets.
    private func safe(_ all: [Row]) -> (entries: [CatalogEntry], leftOut: Int) {
        let restrictions = Household.restrictions(household)
        guard !restrictions.isEmpty else { return (all.map(\.entry), 0) }
        let entries = all.map(\.entry).filter {
            DietRules.fits(ingredients: $0.requirements.map(\.name), restrictions: restrictions)
        }
        return (entries, all.count - entries.count)
    }

    /// The menu's recipes on the open days of the coming week (the menu's meal, dinner unless it's a
    /// lunch menu), placed with the same ranking as Plan my week, in shopping mode. Recipes already
    /// planned this week, or that break the household's allergies or diets, are skipped.
    private func addAllToPlan(_ all: [Row]) {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let slot = menu.mealSlot
        let week = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: today) }
        // Any entry in the slot takes the day, a note like "Eating out" included (same as Plan my week).
        let open = week.filter { day in !plan.contains { calendar.isDate($0.day, inSameDayAs: day) && $0.slot == slot } }
        guard !open.isEmpty else {
            show("Your next 7 \(slotName)s are already planned.", planLink: true)
            return
        }
        let upcoming = plan.filter { $0.day >= today }
        let plannedIDs = Set(upcoming.compactMap { $0.recipe?.uuid })
        let plannedLibraryIDs = Set(upcoming.compactMap { $0.recipe?.libraryID }.filter { !$0.isEmpty })
        let (fitting, leftOut) = safe(all)
        let candidates = fitting.filter { entry in
            if let saved = entry.saved, plannedIDs.contains(saved.uuid) { return false }
            return !plannedLibraryIDs.contains(entry.id)
        }
        let alreadyOn = fitting.count - candidates.count
        let picks = WeekPlanner.fill(
            days: open, recipes: candidates.map(\.tonightRecipe), stock: pantry.map(\.stockItem),
            staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays, shopping: true)
        var days: [Date] = []
        for pick in picks {
            let entry = candidates[pick.recipeIndex]
            guard let recipe = entry.saved ?? SampleData.recipe(entry.id, in: context, extra: extra) else { continue }
            let day = open[pick.dayIndex]
            context.insert(MealPlanEntry(day: day, slot: slot, recipe: recipe, servings: recipe.servings))
            days.append(day)
        }
        var notes: [String] = []
        if alreadyOn > 0 { notes.append("\(alreadyOn) already planned") }
        if leftOut > 0 { notes.append("\(leftOut) left out for allergies or diets") }
        let unplaced = candidates.count - days.count
        if unplaced > 0 && !candidates.isEmpty { notes.append("no open day for \(unplaced)") }
        guard !days.isEmpty else {
            let reason = notes.isEmpty ? "Nothing here could be planned." : "Nothing new to plan: " + notes.joined(separator: ", ") + "."
            show(reason, planLink: alreadyOn > 0)
            return
        }
        let names = days.sorted().map { $0.formatted(.dateTime.weekday(.abbreviated)) }
        let count = days.count == 1 ? "1 \(slotName)" : "\(days.count) \(slotName)s"
        var text = "Planned \(count): \(names.formatted(.list(type: .and)))"
        if !notes.isEmpty { text += " (" + notes.joined(separator: ", ") + ")" }
        show(text, planLink: true)
        doneTick += 1
    }

    /// Adds what's missing for the menu's recipes (those that suit everyone at home) to the shopping list.
    private func shop(_ all: [Row]) {
        let (entries, leftOut) = safe(all)
        guard !entries.isEmpty else {
            show("None of these fit everyone's allergies and diets.", planLink: false)
            return
        }
        let added = ShoppingAdder.addMissing(
            for: entries.map { PlannedRecipe(title: $0.title, requirements: $0.requirements) },
            pantry: pantry,
            existing: shopping,
            preferences: KitchenPreferences(staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays),
            context: context)
        var text = added == 0 ? "You have everything, or it's on your list already" : "Added \(added) to your shopping list"
        if leftOut > 0 { text += " (\(leftOut) left out for allergies or diets)" }
        show(text, planLink: false)
        doneTick += 1
    }

    private func show(_ text: String, planLink: Bool) {
        AccessibilityNotification.Announcement(text).post()
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            note = Note(text: text, showsPlanLink: planLink)
        }
    }
}

/// A menu in a sheet with its own navigation, for Tonight.
struct MenuSheet: View {
    let menu: RecipeMenu

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var path: [PersistentIdentifier] = []

    var body: some View {
        NavigationStack(path: $path) {
            MenuPage(menu: menu) { recipe in path.append(recipe.persistentModelID) }
                .navigationDestination(for: PersistentIdentifier.self) { id in
                    if let recipe = context.model(for: id) as? Recipe {
                        RecipeDetailView(recipe: recipe)
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}
