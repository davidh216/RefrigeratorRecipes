import SwiftUI
import SwiftData
import PhotosUI
import FridgeCore

/// The recipe library: what you can cook now as crate tiles, everything else as
/// rows with a have-meter (DESIGN.md §8.9).
struct RecipesView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case cookable = "Can make", all = "All", trending = "Trending", favorites = "Favorites"
        var id: String { rawValue }
    }

    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]
    @Query(sort: \MealPlanEntry.day) private var plan: [MealPlanEntry]
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var mode: Mode = .cookable
    @State private var search = ""
    @State private var showEditor = false
    @State private var showImport = false
    /// A link handed over by fridge://import, imported right away.
    @State private var sharedLink: SharedLink?
    @ObservedObject private var router = AppRouter.shared

    struct SharedLink: Identifiable {
        let url: URL
        var id: String { url.absoluteString }
    }
    @State private var path = NavigationPath()
    @State private var planning: Recipe?
    @State private var confirmation: RowConfirmation?
    @State private var successTick = 0
    @State private var favoriteTick = 0
    @Namespace private var zoom

    /// A short-lived "Added 2" on the recipe that a context-menu action touched.
    struct RowConfirmation: Equatable {
        let id: PersistentIdentifier
        let text: String
        /// Makes a repeat of the same confirmation restart the 2-second timer.
        let token = UUID()
    }

    private struct Row: Identifiable {
        let recipe: Recipe
        let match: RecipeMatch
        /// Crate color of the tile: the first non-staple ingredient's category.
        let lead: FoodCategory
        /// Expiring food this recipe would use up, most urgent first.
        let rescues: [RescueItem]
        var id: PersistentIdentifier { recipe.persistentModelID }
    }

    private static let modeOptions: [ChipOption<Mode>] = [
        ChipOption(Mode.cookable, Mode.cookable.rawValue),
        ChipOption(Mode.all, Mode.all.rawValue),
        ChipOption(Mode.favorites, Mode.favorites.rawValue, systemImage: "heart.fill"),
    ]

    private var basketSymbol: String { Theme.symbol("basket", fallback: "cart") }

    private var rows: [Row] {
        let stock = pantry.map(\.stockItem)
        let staples = Staples.parse(staplesRaw)
        var result = recipes
            .filter { search.isEmpty || $0.title.localizedCaseInsensitiveContains(search) || $0.tags.contains { $0.localizedCaseInsensitiveContains(search) } }
            .map { recipe in
                Row(
                    recipe: recipe,
                    match: recipe.match(stock: stock, staples: staples, soonThresholdDays: soonDays),
                    lead: recipe.leadCategory(staples: staples),
                    rescues: Rescue.items(requirements: recipe.requirements, stock: stock, soonThresholdDays: soonDays)
                )
            }
        switch mode {
        case .all: break
        case .favorites: result = result.filter { $0.recipe.isFavorite }
        case .trending: result = result.filter { $0.recipe.tags.contains { $0.lowercased() == "viral" } }
        case .cookable: result.sort { RecipeMatcher.isBetter($0.match, than: $1.match) }
        }
        return result
    }

    private var tonightEntry: MealPlanEntry? {
        plan.first { Calendar.current.isDateInToday($0.day) && $0.slot == .dinner && $0.recipe != nil }
    }

    var body: some View {
        let all = rows
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Theme.Space.stack) {
                    if recipes.isEmpty {
                        libraryEmptyState
                    } else {
                        ChipPicker("Show", selection: $mode, options: Self.modeOptions)
                            .padding(.horizontal, -Theme.Space.gutter)
                        Group {
                            modeContent(all)
                        }
                        .motionAnimation(Theme.Motion.smooth, value: mode)
                    }
                }
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.bottom, Theme.Space.xl)
            }
            .background(Theme.Colors.canvas)
            .overlay {
                if !recipes.isEmpty && all.isEmpty && !search.isEmpty {
                    ContentUnavailableView.search(text: search)
                }
            }
            .searchable(text: $search, prompt: "Search recipes or tags")
            .navigationTitle("Recipes")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                        .navigationTransition(.zoom(sourceID: id, in: zoom))
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button { showEditor = true } label: { Label("New recipe", systemImage: "square.and.pencil") }
                        Button { showImport = true } label: { Label("Import from a link or video", systemImage: "link") }
                        Button { _ = try? SampleData.importRecipes(into: context) } label: {
                            Label("Add sample recipes", systemImage: "tray.and.arrow.down")
                        }
                    } label: {
                        addMenuLabel
                    }
                    .accessibilityLabel("Add recipe")
                }
            }
            .sheet(isPresented: $showEditor) { RecipeEditor(recipe: nil) }
            .sheet(isPresented: $showImport) {
                RecipeImportView { recipe in path.append(recipe.persistentModelID) }
            }
            .sheet(item: $sharedLink) { link in
                RecipeImportView(initialLink: link.url) { recipe in path.append(recipe.persistentModelID) }
            }
            .onReceive(router.$importLink) { url in
                guard let url else { return }
                router.importLink = nil
                sharedLink = SharedLink(url: url)
            }
            .sheet(item: $planning) { recipe in
                AddToPlanSheet(recipe: recipe)
            }
            .hapticSuccess(trigger: successTick)
            .hapticImpact(.light, trigger: favoriteTick)
            .task(id: confirmation) {
                guard confirmation != nil else { return }
                try? await Task.sleep(for: .seconds(2))
                guard !Task.isCancelled else { return }
                withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                    confirmation = nil
                }
            }
        }
    }

    /// A plum circle with a white plus, inside a 44pt target (same as the Fridge's Add menu).
    private var addMenuLabel: some View {
        Image(systemName: "plus")
            .font(.body.weight(.bold))
            .foregroundStyle(Theme.Colors.onPlum)
            .frame(width: 32, height: 32)
            .background(Theme.Colors.plum, in: Circle())
            .frame(minWidth: Theme.Metrics.minTap, minHeight: Theme.Metrics.minTap)
            .contentShape(Rectangle())
    }

    // MARK: - Content by mode

    @ViewBuilder
    private func modeContent(_ all: [Row]) -> some View {
        if mode == .cookable {
            cookableContent(all)
        } else if all.isEmpty {
            if mode == .favorites && search.isEmpty {
                favoritesEmptyState
            }
        } else {
            SectionHeader(mode == .favorites ? "Favorites" : mode == .trending ? "Trending online" : "All recipes",
                          count: all.count,
                          systemImage: mode == .favorites ? "heart.fill" : mode == .trending ? "flame.fill" : nil,
                          symbolColor: mode == .favorites ? Theme.Colors.plumText : Theme.Colors.text2)
                .padding(.top, Theme.Space.xxs)
            rowCard(all)
        }
    }

    private func cookableContent(_ all: [Row]) -> some View {
        let ready = all.filter { $0.match.canMake }
        let almost = all.filter { !$0.match.canMake && $0.match.missing.count <= 2 }
        let rest = all.filter { $0.match.missing.count > 2 }
        return VStack(alignment: .leading, spacing: Theme.Space.stack) {
            if !ready.isEmpty {
                SectionHeader("Ready to cook", count: ready.count,
                              systemImage: "checkmark.circle.fill", symbolColor: Theme.Colors.fresh)
                    .padding(.top, Theme.Space.xxs)
                readyGrid(ready)
            }
            if !almost.isEmpty {
                SectionHeader("Missing 1–2 items", count: almost.count, systemImage: basketSymbol)
                    .padding(.top, Theme.Space.xxs)
                rowCard(almost)
            }
            if !rest.isEmpty {
                SectionHeader("Needs shopping", count: rest.count, systemImage: basketSymbol)
                    .padding(.top, Theme.Space.xxs)
                rowCard(rest)
            }
        }
    }

    // MARK: - Empty states

    private var libraryEmptyState: some View {
        EmptyStateView(
            tiles: [.bakery, .meat, .produce],
            title: "No recipes yet",
            message: "Add your own, import one with AI, or start with 20 sample recipes.",
            actions: [
                EmptyAction(title: "Load sample recipes", systemImage: "tray.and.arrow.down") {
                    _ = try? SampleData.importRecipes(into: context)
                },
                EmptyAction(title: "New recipe", systemImage: "square.and.pencil") {
                    showEditor = true
                },
            ]
        )
        // EmptyStateView pads itself by 24; this lines its text up with the gutter.
        .padding(.horizontal, -Theme.Space.xl)
    }

    private var favoritesEmptyState: some View {
        EmptyStateView(
            tiles: [.beverages, .bakery, .produce],
            title: "No favorites yet",
            message: "Tap the heart on a recipe to keep it here."
        )
        .padding(.horizontal, -Theme.Space.xl)
    }

    // MARK: - Ready to cook: crate tiles

    private func readyGrid(_ items: [Row]) -> some View {
        let columns: [GridItem] = dynamicTypeSize.isAccessibilitySize
            ? [GridItem(.flexible())]
            : [GridItem(.flexible(), spacing: Theme.Space.stack), GridItem(.flexible())]
        return LazyVGrid(columns: columns, alignment: .leading, spacing: Theme.Space.stack) {
            ForEach(items) { row in
                NavigationLink(value: row.recipe.persistentModelID) {
                    recipeTile(row)
                }
                .buttonStyle(.plain)
                .matchedTransitionSource(id: row.id, in: zoom)
                .contentShape(.contextMenuPreview, RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
                .contextMenu { recipeMenu(row) }
                .accessibilityLabel(tileSpokenLabel(row))
                .accessibilityActions { recipeAccessibilityActions(row) }
            }
        }
    }

    /// Full crate block: glyph and heart on top, title, minutes and the "uses N soon" sticker at the bottom.
    private func recipeTile(_ row: Row) -> some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            // Invisible copy that reserves room for the glyph row drawn in the overlay,
            // so the text can sit at the bottom of the tile.
            tileTopRow(row)
                .hidden()
            Spacer(minLength: Theme.Space.s)
            Text(row.recipe.title)
                .font(Theme.Fonts.tileTitle)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
            if row.recipe.totalMinutes > 0 {
                Theme.numberText("\(row.recipe.totalMinutes)", unit: "min")
            }
            tileSticker(row)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .bottomLeading)
        .overlay(alignment: .topLeading) {
            tileTopRow(row)
                .padding(14)
        }
        .crateBlock(row.lead, radius: Theme.Radius.card)
        .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
    }

    private func tileTopRow(_ row: Row) -> some View {
        HStack(alignment: .top, spacing: Theme.Space.xs) {
            Image(systemName: row.lead.symbol)
                .font(.title3.weight(.bold))
            Spacer(minLength: Theme.Space.xs)
            if row.recipe.isFavorite {
                Image(systemName: "heart.fill")
                    .font(.body.weight(.semibold))
            }
        }
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private func tileSticker(_ row: Row) -> some View {
        if let confirmation, confirmation.id == row.id {
            Sticker(confirmation.text, systemImage: "checkmark", symbolColor: Theme.Colors.plumText)
                .padding(.top, 2)
                .transition(.opacity)
        } else if row.match.usesExpiringCount > 0 {
            Sticker("Uses \(row.match.usesExpiringCount) soon", systemImage: "alarm.fill",
                    symbolColor: Theme.Colors.todayText)
                .padding(.top, 2)
                .transition(.opacity)
        }
    }

    // MARK: - Rows

    /// Rows on one surface card, separated by hairlines that start at the text.
    private func rowCard(_ items: [Row]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { pair in
                let row = pair.element
                NavigationLink(value: row.recipe.persistentModelID) {
                    recipeRow(row, showsSeparator: pair.offset < items.count - 1)
                }
                .buttonStyle(.plain)
                .matchedTransitionSource(id: row.id, in: zoom)
                .contentShape(.contextMenuPreview, RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous))
                .contextMenu { recipeMenu(row) }
                .accessibilityLabel(rowSpokenLabel(row))
                .accessibilityActions { recipeAccessibilityActions(row) }
            }
        }
        .surfaceCard(padding: 0)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
    }

    private func recipeRow(_ row: Row, showsSeparator: Bool) -> some View {
        HStack(alignment: .center, spacing: Theme.Space.s) {
            CategoryTile(row.lead, size: .row, style: .soft)
            VStack(alignment: .leading, spacing: 0) {
                rowContent(row)
                    .padding(.vertical, Theme.Space.s)
                    .padding(.trailing, Theme.Space.m)
                    .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
                if showsSeparator {
                    Rectangle()
                        .fill(Theme.Colors.separator)
                        .frame(height: 0.5)
                }
            }
        }
        .padding(.leading, Theme.Space.m)
        .background(Theme.Colors.surface)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private func rowContent(_ row: Row) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 6) {
                rowText(row)
                rowTrailing(row)
            }
        } else {
            HStack(alignment: .center, spacing: Theme.Space.s) {
                rowText(row)
                Spacer(minLength: 0)
                rowTrailing(row)
            }
        }
    }

    private func rowText(_ row: Row) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(row.recipe.title)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .lineLimit(2)
                if row.recipe.isFavorite {
                    Image(systemName: "heart.fill")
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.plumText)
                        .accessibilityLabel("Favorite")
                }
            }
            if let subtitle = subtitleText(row) {
                subtitle
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? 3 : 1)
            }
        }
        .multilineTextAlignment(.leading)
    }

    @ViewBuilder
    private func rowTrailing(_ row: Row) -> some View {
        if let confirmation, confirmation.id == row.id {
            RecipeRowConfirmationTag(text: confirmation.text)
                .transition(.opacity)
        } else {
            CoverageBadge(match: row.match)
                .transition(.opacity)
        }
    }

    /// "⏰ uses spinach, milk · 30 min · need bay leaves, thyme"
    private func subtitleText(_ row: Row) -> Text? {
        var parts: [String] = []
        if row.recipe.totalMinutes > 0 { parts.append("\(row.recipe.totalMinutes) min") }
        if !row.match.missing.isEmpty { parts.append("need " + row.match.missing.prefix(3).joined(separator: ", ")) }
        if let uses = usesPhrase(row) {
            let line = ([uses] + parts).joined(separator: " · ")
            return Text(Image(systemName: "alarm.fill")).foregroundColor(usesColor(row)) + Text(" " + line)
        }
        if parts.isEmpty { return nil }
        return Text(parts.joined(separator: " · "))
    }

    /// "uses spinach, milk" from the rescued food, else "uses 2 expiring".
    private func usesPhrase(_ row: Row) -> String? {
        let names = row.rescues.prefix(2).map { $0.name.lowercased() }
        if !names.isEmpty { return "uses " + names.joined(separator: ", ") }
        if row.match.usesExpiringCount > 0 { return "uses \(row.match.usesExpiringCount) expiring" }
        return nil
    }

    /// Tomato when the most urgent rescue is due by tomorrow, citrus when it can wait a few days.
    private func usesColor(_ row: Row) -> Color {
        if let first = row.rescues.first, first.status.tone() == .soon {
            return Theme.Colors.soonText
        }
        return Theme.Colors.todayText
    }

    // MARK: - Spoken labels

    private func minutesPhrase(_ minutes: Int) -> String {
        minutes == 1 ? "1 minute" : "\(minutes) minutes"
    }

    /// "Beef stew, 25 minutes, ready to cook, uses 2 expiring"
    private func tileSpokenLabel(_ row: Row) -> String {
        var parts: [String] = [row.recipe.title]
        if row.recipe.totalMinutes > 0 { parts.append(minutesPhrase(row.recipe.totalMinutes)) }
        parts.append("ready to cook")
        if row.match.usesExpiringCount > 0 { parts.append("uses \(row.match.usesExpiringCount) expiring") }
        if row.recipe.isFavorite { parts.append("favorite") }
        return parts.joined(separator: ", ")
    }

    /// "Beef stew, favorite, 30 minutes, uses spinach, need thyme, have 5 of 7 ingredients"
    private func rowSpokenLabel(_ row: Row) -> String {
        var parts: [String] = [row.recipe.title]
        if row.recipe.isFavorite { parts.append("favorite") }
        if row.recipe.totalMinutes > 0 { parts.append(minutesPhrase(row.recipe.totalMinutes)) }
        if let uses = usesPhrase(row) { parts.append(uses) }
        if !row.match.missing.isEmpty { parts.append("need " + row.match.missing.prefix(3).joined(separator: ", ")) }
        if row.match.canMake {
            parts.append("ready to cook")
        } else {
            parts.append("have \(row.match.have.count) of \(row.match.requiredCount) ingredients")
        }
        return parts.joined(separator: ", ")
    }

    // MARK: - Context menu and actions

    @ViewBuilder
    private func recipeMenu(_ row: Row) -> some View {
        Button { cookTonight(row) } label: {
            Label("Cook tonight", systemImage: "fork.knife")
        }
        Button { planning = row.recipe } label: {
            Label("Add to meal plan", systemImage: "calendar.badge.plus")
        }
        if !row.match.missing.isEmpty {
            Button { addMissing(row) } label: {
                Label("Add missing to list", systemImage: basketSymbol)
            }
        }
        Button { toggleFavorite(row.recipe) } label: {
            Label(favoriteTitle(row.recipe), systemImage: row.recipe.isFavorite ? "heart.slash" : "heart")
        }
    }

    /// The context menu again, for VoiceOver's actions rotor.
    @ViewBuilder
    private func recipeAccessibilityActions(_ row: Row) -> some View {
        Button("Cook tonight") { cookTonight(row) }
        Button("Add to meal plan") { planning = row.recipe }
        if !row.match.missing.isEmpty {
            Button("Add missing to list") { addMissing(row) }
        }
        Button(favoriteTitle(row.recipe)) { toggleFavorite(row.recipe) }
    }

    private func favoriteTitle(_ recipe: Recipe) -> String {
        recipe.isFavorite ? "Unfavorite" : "Favorite"
    }

    /// Same as Tonight's "Cook this": make it tonight's dinner.
    private func cookTonight(_ row: Row) {
        let recipe = row.recipe
        if let entry = tonightEntry {
            entry.recipe = recipe
            entry.servings = recipe.servings
        } else {
            context.insert(MealPlanEntry(day: .now, slot: .dinner, recipe: recipe, servings: recipe.servings))
        }
        confirm("On for tonight", for: row.id)
    }

    private func addMissing(_ row: Row) {
        let added = ShoppingAdder.addMissing(
            for: [PlannedRecipe(title: row.recipe.title, requirements: row.recipe.requirements)],
            pantry: pantry,
            existing: shopping,
            preferences: KitchenPreferences(staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays),
            context: context
        )
        confirm(added == 0 ? "On your list" : "Added \(added)", for: row.id)
    }

    private func toggleFavorite(_ recipe: Recipe) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            recipe.isFavorite.toggle()
        }
        favoriteTick += 1
    }

    /// Shows "Added 2 ✓" on the row or tile that did it for 2 seconds, instead of an alert.
    private func confirm(_ text: String, for id: PersistentIdentifier) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            confirmation = RowConfirmation(id: id, text: text)
        }
        successTick += 1
        AccessibilityNotification.Announcement(text).post()
    }
}

/// Trailing slot of a recipe row while a confirmation shows: "✓ Added 2".
private struct RecipeRowConfirmationTag: View {
    let text: String

    init(text: String) {
        self.text = text
    }

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark")
                .imageScale(.small)
            Text(text)
                .lineLimit(1)
        }
        .font(Theme.Fonts.tag)
        .foregroundStyle(Theme.Colors.plumStrong)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Theme.Colors.plumSoft, in: Capsule())
        .fixedSize()
    }
}

// MARK: - Import with AI

/// Paste any recipe text (or describe a dish) and let Claude structure it.
struct RecipeImportView: View {
    /// A link to import right away (from a fridge://import link or the share flow).
    var initialLink: URL? = nil
    var onImported: (Recipe) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query private var pantry: [PantryItem]
    @Query(sort: \HouseholdMember.createdAt) private var household: [HouseholdMember]
    @State private var text = ""
    @State private var isWorking = false
    @State private var workingLabel = "Reading recipe…"
    @State private var errorMessage: String?
    @State private var exampleTaps = 0
    @State private var errorTick = 0
    @State private var videoItem: PhotosPickerItem?
    @State private var startedInitialLink = false
    @FocusState private var editorFocused: Bool

    private static let examples = [
        "A quick weeknight curry with the chicken I have",
        "Grandma's banana bread",
    ]

    private var trimmedText: String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Set when the text is essentially a link (a shared URL, maybe with a caption around it).
    private var link: URL? {
        guard let url = RecipeLinkImporter.firstLink(in: trimmedText) else { return nil }
        let rest = trimmedText.replacingOccurrences(of: url.absoluteString, with: "")
        return rest.count < 200 ? url : nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.m) {
                    SheetLede(systemImage: "sparkles",
                              text: "Paste a link from TikTok, YouTube, Instagram or any recipe site, paste a recipe, or describe a dish.")
                    editorCard
                    sourceRow
                    examplesRow
                    if let errorMessage {
                        RecipeImportErrorCard(message: errorMessage)
                            .transition(.opacity)
                    }
                }
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.vertical, Theme.Space.m)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.Colors.canvas)
            .navigationTitle("Import recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .actionBar {
                importBar
            }
            .sensoryFeedback(.selection, trigger: exampleTaps)
            .sensoryFeedback(.error, trigger: errorTick)
            .onChange(of: videoItem) { _, item in
                guard let item else { return }
                Task { await runVideoImport(item) }
            }
            .task {
                guard let initialLink, !startedInitialLink else { return }
                startedInitialLink = true
                text = initialLink.absoluteString
                await runImport()
            }
        }
        .sheetChrome()
    }

    private var editorCard: some View {
        TextEditor(text: $text)
            .font(Theme.Fonts.body)
            .foregroundStyle(Theme.Colors.ink)
            .scrollContentBackground(.hidden)
            .focused($editorFocused)
            .frame(minHeight: 160, maxHeight: 360)
            .overlay(alignment: .topLeading) {
                if text.isEmpty {
                    // Lines up with the text view's own insets.
                    Text("Paste a link or a recipe, or describe what you'd like to cook…")
                        .font(Theme.Fonts.body)
                        .foregroundStyle(Theme.Colors.text3)
                        .padding(.top, 8)
                        .padding(.leading, 5)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
            .disabled(isWorking)
            .accessibilityLabel("Recipe text or link")
            .accessibilityHint("Paste a link or a recipe, or describe what you'd like to cook")
            .surfaceCard(padding: Theme.Space.s)
    }

    /// Paste a copied link without the paste prompt, or pick a saved video.
    private var sourceRow: some View {
        HStack(spacing: Theme.Space.s) {
            PasteButton(payloadType: String.self) { strings in
                guard let first = strings.first else { return }
                Task { @MainActor in
                    text = first
                    errorMessage = nil
                }
            }
            .buttonBorderShape(.capsule)
            .labelStyle(.titleAndIcon)
            .tint(Theme.Colors.plum)

            PhotosPicker(selection: $videoItem, matching: .videos) {
                Label("Saved video", systemImage: "video.fill")
                    .font(Theme.Fonts.detailStrong)
            }
            .buttonStyle(SecondaryButtonStyle(size: .compact))
            .accessibilityHint("Pick a cooking video you saved or screen-recorded. It's read on this phone; only the words and a few frames are sent to Claude.")
            Spacer(minLength: 0)
        }
        .disabled(isWorking)
    }

    /// Tapping an example fills the editor.
    private var examplesRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Space.xs) {
                ForEach(Self.examples, id: \.self) { example in
                    Chip(example, isSelected: text == example, accessibilityLabel: "Example: \(example)") {
                        useExample(example)
                    }
                }
            }
        }
        .contentMargins(.horizontal, Theme.Space.gutter, for: .scrollContent)
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .padding(.horizontal, -Theme.Space.gutter)
        .disabled(isWorking)
    }

    @ViewBuilder
    private var importBar: some View {
        if isWorking {
            HStack(spacing: Theme.Space.xs) {
                ProgressView()
                    .tint(Theme.Colors.onPlum)
                    .accessibilityHidden(true)
                if !reduceMotion {
                    Image(systemName: "sparkles")
                        .symbolEffect(.pulse)
                        .accessibilityHidden(true)
                }
                Text(workingLabel)
                    .lineLimit(2)
            }
            .font(Theme.Fonts.button)
            .foregroundStyle(Theme.Colors.onPlum)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: Theme.Metrics.button)
            .background(Theme.Colors.plum, in: Capsule())
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.updatesFrequently)
        } else {
            Button {
                editorFocused = false
                Task { await runImport() }
            } label: {
                Label(link.map { "Import from \(RecipeLinkImporter.source(of: $0).title)" } ?? "Import",
                      systemImage: link == nil ? "sparkles" : "link")
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
            .disabled(trimmedText.isEmpty)
        }
    }

    private func useExample(_ example: String) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            text = example
            errorMessage = nil
        }
        exampleTaps += 1
    }

    private var kitchenContext: String {
        let prefs = KitchenPreferences.current
        return KitchenContext.render(pantry: pantry, recipes: [], plan: [], staples: prefs.staples,
                                     soonThresholdDays: prefs.soonThresholdDays, household: household)
    }

    private func runImport() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            if let link {
                let source = RecipeLinkImporter.source(of: link)
                workingLabel = source == .web ? "Reading the recipe page…" : "Reading the \(source.title) caption…"
                let imported = try await RecipeLinkImporter.importRecipe(from: link, kitchenContext: kitchenContext)
                finish(imported)
            } else {
                workingLabel = "Reading recipe…"
                let generated = try await ClaudeClient.fromSettings().generateRecipe(request: text, kitchenContext: kitchenContext)
                finish(ImportedRecipe(recipe: generated, sourceURL: nil, creator: "", isReconstructed: false))
            }
        } catch {
            fail(error)
        }
    }

    private func runVideoImport(_ item: PhotosPickerItem) async {
        isWorking = true
        errorMessage = nil
        defer {
            isWorking = false
            videoItem = nil
        }
        do {
            workingLabel = "Opening the video…"
            guard let video = try await item.loadTransferable(type: PickedVideo.self) else {
                throw VideoRecipeReader.ReadError.empty
            }
            defer { try? FileManager.default.removeItem(at: video.url) }
            workingLabel = "Watching and listening…"
            let reading = try await VideoRecipeReader.read(video.url)
            workingLabel = "Writing the recipe…"
            var source = "Cooking video the user saved (\(Int(reading.seconds)) seconds). The images are frames from it, in order."
            if !trimmedText.isEmpty { source += "\nThe user's note or the video's caption:\n\(trimmedText)" }
            source += "\n\nWhat's said in the video:\n" + (reading.transcript.isEmpty ? "(no speech)" : reading.transcript)
            let url = RecipeLinkImporter.firstLink(in: trimmedText)
            let imported = try await RecipeLinkImporter.viaClaude(source, frames: reading.frames, url: url, creator: "",
                                                                  kitchenContext: kitchenContext)
            finish(imported)
        } catch {
            fail(error)
        }
    }

    private func finish(_ imported: ImportedRecipe) {
        let recipe = Recipe.insert(from: imported.recipe, into: context)
        recipe.sourceURL = imported.sourceURL
        recipe.sourceCreator = imported.creator
        recipe.isReconstructed = imported.isReconstructed
        dismiss()
        onImported(recipe)
    }

    private func fail(_ error: Error) {
        errorMessage = error.localizedDescription
        errorTick += 1
    }
}

/// Says what went wrong, in tomato on a soft card.
private struct RecipeImportErrorCard: View {
    let message: String

    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    init(message: String) {
        self.message = message
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
                .accessibilityHidden(true)
            Text(message)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .font(Theme.Fonts.detail)
        .foregroundStyle(Theme.Colors.todayText)
        .padding(Theme.Space.cardPadding)
        .background(Theme.Colors.todaySoft, in: shape)
        .overlay {
            if colorSchemeContrast == .increased {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .accessibilityElement(children: .combine)
        .onAppear {
            AccessibilityNotification.Announcement(message).post()
        }
    }
}
