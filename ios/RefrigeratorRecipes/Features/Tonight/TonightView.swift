import SwiftUI
import SwiftData
import FridgeCore

/// The home screen: three dinner options ranked by what's about to go bad.
/// Layout and behavior follow DESIGN.md §8.2 ("Fresh Market").
struct TonightView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @Query(filter: #Predicate<ShoppingItem> { !$0.isChecked }) private var shopping: [ShoppingItem]
    @Query(sort: \MealPlanEntry.day) private var plan: [MealPlanEntry]
    @Query private var household: [HouseholdMember]
    /// Re-renders when the server sends new super-ingredient editions.
    @ObservedObject private var spotlight = SuperIngredients.shared
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.tonightMaxMinutes) private var maxMinutes = 0
    /// "yyyy-MM-dd|uuid,uuid": recipes dismissed with "Not tonight", reset daily.
    @AppStorage(SettingsKey.tonightSkipped) private var skippedRaw = ""

    @State private var path = NavigationPath()
    @State private var cooking: MealPlanEntry?
    @State private var chefPrompt: ChefPrompt?
    @State private var showReceiptScan = false
    @State private var showSuperIngredient = false
    @State private var editingItem: PantryItem?
    /// Bumped by "Cook this": scrolls up to the ticket and plays the success haptic.
    @State private var cookedTick = 0
    @Namespace private var zoom

    @ScaledMetric(relativeTo: .body) private var avatarSide: CGFloat = 44

    private struct ChefPrompt: Identifiable {
        let id = UUID()
        let text: String?
    }

    /// A pantry item with its status computed once per render.
    private struct Stocked: Identifiable {
        let item: PantryItem
        let status: ExpiryStatus
        var id: PersistentIdentifier { item.persistentModelID }
    }

    private static let dayKey: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let tonightPrompt = "What should I make for dinner tonight? Use what's expiring first, and keep it realistic for a weeknight."
    /// Guarded: a missing symbol renders blank with no build error (DESIGN.md §5.1).
    private static let basketSymbol = Theme.symbol("basket", fallback: "cart")
    private static let cookedSymbol = Theme.symbol("frying.pan.fill", fallback: "frying.pan")

    private static var timeOptions: [ChipOption<Int>] {
        [
            ChipOption(0, "Any time", systemImage: "timer"),
            ChipOption(30, "≤ 30 min", accessibilityLabel: "Up to 30 minutes"),
            ChipOption(45, "≤ 45 min", accessibilityLabel: "Up to 45 minutes"),
        ]
    }

    // MARK: - Derived state

    private var tonightEntry: MealPlanEntry? {
        plan.first { Calendar.current.isDateInToday($0.day) && $0.slot == .dinner && $0.recipe != nil }
    }

    private var skipped: Set<UUID> {
        let parts = skippedRaw.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2, parts[0] == Self.dayKey.string(from: .now) else { return [] }
        return Set(parts[1].split(separator: ",").compactMap { UUID(uuidString: String($0)) })
    }

    /// Tonight's committed recipe is left out, so "Other ideas" are three genuinely other recipes.
    private var picks: [TonightPick] {
        let skip = skipped
        let tonightUUID: UUID? = tonightEntry?.recipe?.uuid
        let unsafe = Household.unsafeIndexes(recipes, members: household)
        return TonightPlanner.picks(
            recipes: recipes.map {
                TonightRecipe(title: $0.title, requirements: $0.requirements, totalMinutes: $0.totalMinutes,
                              tags: $0.tags, isFavorite: $0.isFavorite, lastCookedAt: $0.lastCookedAt)
            },
            stock: pantry.map(\.stockItem),
            staples: Staples.parse(staplesRaw),
            soonThresholdDays: soonDays,
            maxMinutes: maxMinutes == 0 ? nil : maxMinutes,
            excluding: unsafe.union(recipes.indices.filter { index in
                skip.contains(recipes[index].uuid) || recipes[index].uuid == tonightUUID
            })
        )
    }

    private var stocked: [Stocked] {
        pantry.map { Stocked(item: $0, status: $0.expiryStatus(soonThresholdDays: soonDays)) }
    }

    private func freshnessCounts(_ all: [Stocked]) -> FreshnessCounts {
        var counts = FreshnessCounts()
        for entry in all {
            counts.add(entry.status, inFreezer: entry.item.inFreezer)
        }
        return counts
    }

    /// Use-soon order: expiring food by days left (fewest first), then past-date food last.
    private func urgentItems(_ all: [Stocked]) -> [Stocked] {
        let soon = all
            .filter { entry in
                if case .expiringSoon = entry.status { return true } else { return false }
            }
            .sorted { a, b in
                if a.status.urgency != b.status.urgency { return a.status.urgency < b.status.urgency }
                return a.item.name.localizedCaseInsensitiveCompare(b.item.name) == .orderedAscending
            }
        let past = all
            .filter { entry in
                if case .expired = entry.status { return true } else { return false }
            }
            .sorted { a, b in a.status.urgency > b.status.urgency }   // most recently expired first
        return soon + past
    }

    /// The calm state's "Next up": the soonest dated item, preferring food that isn't frozen.
    private func nextUp(_ all: [Stocked]) -> Stocked? {
        let dated = all.filter { entry in
            if case .fresh = entry.status { return true } else { return false }
        }
        let thawed = dated.filter { !$0.item.inFreezer }
        let pool = thawed.isEmpty ? dated : thawed
        return pool.min { a, b in a.status.urgency < b.status.urgency }
    }

    /// Expiring stock this recipe would use up, most urgent first.
    private func rescueItems(for recipe: Recipe) -> [RescueItem] {
        Rescue.items(requirements: recipe.requirements, stock: pantry.map(\.stockItem), soonThresholdDays: soonDays)
    }

    /// The crate color for a pick: the food it rescues first, else the recipe's lead ingredient.
    private func heroCategory(_ pick: TonightPick, recipe: Recipe) -> FoodCategory {
        if let name = pick.rescues.first, let item = pantry.first(where: { $0.name == name }) {
            return item.foodCategory
        }
        return recipe.leadCategory(staples: Staples.parse(staplesRaw))
    }

    private func missingText(_ pick: TonightPick) -> String? {
        pick.match.missing.isEmpty ? nil : pick.match.missing.joined(separator: ", ").lowercased()
    }

    private var ticketTransition: AnyTransition {
        AnyTransition.reducible(
            AnyTransition.scale(scale: 0.96, anchor: .top).combined(with: AnyTransition.opacity),
            reduceMotion: reduceMotion
        )
    }

    private var pickTransition: AnyTransition {
        AnyTransition.reducible(
            AnyTransition.asymmetric(
                insertion: AnyTransition.opacity,
                removal: AnyTransition.move(edge: .leading).combined(with: AnyTransition.opacity)
            ),
            reduceMotion: reduceMotion
        )
    }

    // MARK: - Body

    var body: some View {
        let all = stocked
        let currentPicks = picks
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: Theme.Space.stack) {
                        dateLine(freshnessCounts(all))
                            .id("top")

                        if let entry = tonightEntry, let recipe = entry.recipe {
                            ticket(entry: entry, recipe: recipe)
                                .transition(ticketTransition)
                        }

                        if let edition = superIngredient {
                            SuperIngredientCard(edition: edition,
                                                inKitchen: pantry.first { edition.matches($0.name) }) {
                                showSuperIngredient = true
                            }
                        }

                        useSoonSection(all)

                        picksSection(currentPicks)

                        chefCard
                        footer
                    }
                    .padding(.horizontal, Theme.Space.gutter)
                    .padding(.bottom, Theme.Space.xl)
                    // Exactly screen-wide, so nothing inside can make the page slide sideways.
                    .containerRelativeFrame(.horizontal)
                    .motionAnimation(Theme.Motion.smooth, value: tonightEntry?.persistentModelID)
                }
                .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
                .background(Theme.Colors.canvas)
                .onChange(of: cookedTick) { _, _ in
                    withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
                        proxy.scrollTo("top", anchor: .top)
                    }
                }
            }
            .sensoryFeedback(.success, trigger: cookedTick)
            .hapticImpact(.light, trigger: skippedRaw)
            .navigationTitle("Tonight")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    chefToolbarButton
                }
            }
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                        .navigationTransition(.zoom(sourceID: id, in: zoom))
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
            .sheet(isPresented: $showSuperIngredient) {
                if let edition = superIngredient { SuperIngredientView(edition: edition) }
            }
            .sheet(item: $editingItem) { item in
                PantryItemEditor(draft: .init(item: item), item: item)
            }
        }
    }

    // MARK: - Toolbar

    private var chefToolbarButton: some View {
        Button { chefPrompt = ChefPrompt(text: nil) } label: {
            Label("Chef", systemImage: "sparkles")
                .labelStyle(.titleAndIcon)
                .font(Theme.Fonts.buttonCompact)
                .foregroundStyle(Theme.Colors.plumStrong)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Theme.Colors.plumSoft, in: Capsule())
                .frame(minWidth: Theme.Metrics.minTap, minHeight: Theme.Metrics.minTap)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Ask the chef")
    }

    // MARK: - Date line

    /// "Saturday, September 26 · 2 to use today". The headline part is heat-colored.
    private func dateLine(_ counts: FreshnessCounts) -> some View {
        let format: Date.FormatStyle = .dateTime.weekday(.wide).month(.wide).day()
        let date: Text = Text(Date.now, format: format).foregroundStyle(Theme.Colors.text2)
        let hasUrgent = counts.byTomorrow + counts.soon > 0
        let heat: Color = counts.byTomorrow > 0 ? Theme.Colors.todayText : Theme.Colors.soonText
        let suffix: String = " · " + counts.headline
        let headline: Text = Text(suffix).foregroundStyle(heat)
        let line: Text = hasUrgent ? date + headline : date
        return line
            .font(Theme.Fonts.detailStrong)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Ticket (tonight's committed dinner)

    private func ticket(entry: MealPlanEntry, recipe: Recipe) -> some View {
        let rescued = rescueItems(for: recipe).prefix(2).map { $0.name.lowercased() }
        var metaParts: [String] = []
        if recipe.totalMinutes > 0 { metaParts.append("\(recipe.totalMinutes) min") }
        if !rescued.isEmpty { metaParts.append("uses " + rescued.joined(separator: ", ")) }
        let meta = metaParts.joined(separator: " · ")

        return TicketCard {
            VStack(alignment: .leading, spacing: 6) {
                Text("On for tonight · Serves \(entry.servings)")
                    .eyebrowStyle()
                    .foregroundStyle(Theme.Colors.onPlum2)
                Text(recipe.title)
                    .font(Theme.Fonts.heroTitle)
                    .foregroundStyle(Theme.Colors.onPlum)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                if !meta.isEmpty {
                    Text(meta)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.onPlum2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        } bottom: {
            ticketActions(entry: entry, recipe: recipe)
        }
        // Tonight's recipe is not among the picks, so the ticket is the zoom source for its "Recipe" push.
        .matchedTransitionSource(id: recipe.persistentModelID, in: zoom)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Tonight's dinner")
    }

    @ViewBuilder
    private func ticketActions(entry: MealPlanEntry, recipe: Recipe) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            ticketActionsStacked(entry: entry, recipe: recipe)
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    cookedButton(entry, fullWidth: false)
                    recipeButton(recipe)
                    Spacer(minLength: 0)
                    changeButton(entry)
                }
                ticketActionsStacked(entry: entry, recipe: recipe)
            }
        }
    }

    private func ticketActionsStacked(entry: MealPlanEntry, recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            cookedButton(entry, fullWidth: true)
            HStack(spacing: 10) {
                recipeButton(recipe)
                Spacer(minLength: 0)
                changeButton(entry)
            }
        }
    }

    private func cookedButton(_ entry: MealPlanEntry, fullWidth: Bool) -> some View {
        Button { cooking = entry } label: {
            Label("I cooked it", systemImage: Self.cookedSymbol)
        }
        .buttonStyle(InvertedButtonStyle(fullWidth: fullWidth))
    }

    private func recipeButton(_ recipe: Recipe) -> some View {
        Button("Recipe") { path.append(recipe.persistentModelID) }
            .buttonStyle(QuietButtonStyle(color: Theme.Colors.onPlum))
            .accessibilityHint("Opens the recipe")
    }

    private func changeButton(_ entry: MealPlanEntry) -> some View {
        Button {
            withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
                context.delete(entry)
            }
        } label: {
            Label("Change", systemImage: "arrow.triangle.2.circlepath")
        }
        .buttonStyle(QuietButtonStyle(color: Theme.Colors.onPlum2))
        .accessibilityLabel("Change tonight's dinner")
    }

    // MARK: - Use soon

    @ViewBuilder
    private func useSoonSection(_ all: [Stocked]) -> some View {
        let urgent = urgentItems(all)
        if !urgent.isEmpty {
            SectionHeader("Use soon", count: urgent.count, systemImage: "timer",
                          symbolColor: Theme.Colors.todayText, actionTitle: "Fridge") {
                AppRouter.shared.tab = .fridge
            }
            .padding(.top, Theme.Space.xxs)
            useSoonStrip(urgent)
        } else if let next = nextUp(all) {
            SectionHeader("Use soon", systemImage: "timer")
                .padding(.top, Theme.Space.xxs)
            calmRow(next)
        }
    }

    private func useSoonStrip(_ urgent: [Stocked]) -> some View {
        let shown = Array(urgent.prefix(10))
        let more = urgent.count - shown.count
        return ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: Theme.Space.xs) {
                ForEach(shown) { entry in
                    useSoonChip(entry)
                }
                if more > 0 {
                    Chip("+\(more) more", isSelected: false, accessibilityLabel: "\(more) more in the Fridge") {
                        AppRouter.shared.tab = .fridge
                    }
                    .modifier(UseSoonEdgeEffect())
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        // Only scrolls when the chips don't fit; otherwise it stays put.
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .contentMargins(.horizontal, Theme.Space.gutter, for: .scrollContent)
        .scrollClipDisabled()
        .padding(.horizontal, -Theme.Space.gutter)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Use soon")
    }

    private func useSoonChip(_ entry: Stocked) -> some View {
        let item = entry.item
        return Button { editingItem = item } label: {
            FoodChip(name: item.name, category: item.foodCategory, status: entry.status, location: item.location)
        }
        .buttonStyle(.plain)
        .contentShape(.contextMenuPreview, Capsule())
        .contextMenu {
            Button { useUp(item) } label: {
                Label("Used up", systemImage: Self.basketSymbol)
            }
            Button { askChef(about: item) } label: {
                Label("Ask the chef about this", systemImage: "sparkles")
            }
            Button { editingItem = item } label: {
                Label("Edit", systemImage: "pencil")
            }
        }
        .accessibilityHint("Edit")
        .accessibilityAction(named: "Used up") { useUp(item) }
        .accessibilityAction(named: "Ask the chef about this") { askChef(about: item) }
        .modifier(UseSoonEdgeEffect())
    }

    /// Calm state: nothing urgent, but something has a date.
    private func calmRow(_ next: Stocked) -> some View {
        Label {
            Text("Nothing on the clock. Next up: \(next.item.name) in \(next.status.shortLabel.lowercased()).")
                .fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: FreshTone.fresh.symbol)
                .foregroundStyle(Theme.Colors.fresh)
        }
        .font(Theme.Fonts.detail)
        .foregroundStyle(Theme.Colors.text2)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Picks

    @ViewBuilder
    private func picksSection(_ currentPicks: [TonightPick]) -> some View {
        // With dinner chosen, tonight's recipe is not a pick. If it is the only recipe,
        // there are no other ideas to offer, so the section stays hidden.
        // With a ticket, an empty result usually just means tonight's recipe was the only fit;
        // "Nothing fits tonight" would contradict the ticket, so hide the section unless the user can act on it
        // (show skipped recipes, or widen the time filter).
        let onlyTicketFits = tonightEntry != nil && currentPicks.isEmpty && !pantry.isEmpty
            && skipped.isEmpty && maxMinutes == 0
        let hasOtherRecipes = (tonightEntry == nil || recipes.count > 1) && !onlyTicketFits
        if hasOtherRecipes {
            if !recipes.isEmpty && (!pantry.isEmpty || !currentPicks.isEmpty) {
                SectionHeader(tonightEntry == nil ? "Tonight's picks" : "Other ideas")
                    .padding(.top, Theme.Space.xxs)
                ChipPicker("Time", selection: $maxMinutes, options: Self.timeOptions)
                    .padding(.horizontal, -Theme.Space.gutter)
            }
            if currentPicks.isEmpty {
                emptyState
                    // EmptyStateView pads itself by 24; this puts its text on the 16pt gutter with the headers.
                    .padding(.horizontal, -Theme.Space.xl)
            } else {
                pickCards(currentPicks)
            }
        }
    }

    private func pickCards(_ currentPicks: [TonightPick]) -> some View {
        let hasTicket = tonightEntry != nil
        let total = currentPicks.count
        return VStack(alignment: .leading, spacing: Theme.Space.stack) {
            ForEach(Array(currentPicks.enumerated()), id: \.element.recipeIndex) { pair in
                let pick = pair.element
                let recipe = recipes[pick.recipeIndex]
                // The transition sits on a container with the pick's stable identity, so only a real
                // insertion or removal slides. A promotion (compact → hero) or demotion crossfades in place.
                VStack(alignment: .leading, spacing: 0) {
                    if pair.offset == 0 && !hasTicket {
                        heroCard(pick, recipe: recipe)
                    } else {
                        compactCard(pick, recipe: recipe, rank: pair.offset + 1, of: total)
                    }
                }
                .transition(pickTransition)
            }
        }
        .motionAnimation(Theme.Motion.smooth, value: currentPicks.map(\.recipeIndex))
    }

    // MARK: Hero pick

    private func heroCard(_ pick: TonightPick, recipe: Recipe) -> some View {
        let category = heroCategory(pick, recipe: recipe)
        let rescues = rescueItems(for: recipe)
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.hero, style: .continuous)
        return VStack(alignment: .leading, spacing: 0) {
            Button { path.append(recipe.persistentModelID) } label: {
                heroBlock(recipe: recipe, rescues: rescues, category: category)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text(heroSpokenLabel(recipe: recipe, rescues: rescues)))
            .accessibilityAddTraits(.isHeader)
            .accessibilityHint("Opens the recipe")

            VStack(alignment: .leading, spacing: Theme.Space.s) {
                reasonLabel(pick, rescueIconOnly: false)
                heroCoverageLine(pick, recipe: recipe)
                pickActions(pick, recipe: recipe, size: .regular)
            }
            .padding(Theme.Space.heroPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Theme.Colors.surface)
        .clipShape(shape)
        .overlay {
            if colorSchemeContrast == .increased {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .accessibilityElement(children: .contain)
    }

    private func heroBlock(recipe: Recipe, rescues: [RescueItem], category: FoodCategory) -> some View {
        let isAX = dynamicTypeSize.isAccessibilitySize
        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 0) {
                VStack(alignment: .leading, spacing: Theme.Space.xs) {
                    Text("Top pick")
                        .eyebrowStyle()
                    Text(recipe.title)
                        .font(Theme.Fonts.heroTitle)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    if isAX && recipe.totalMinutes > 0 {
                        Theme.numberText("\(recipe.totalMinutes)", unit: "min")
                    }
                }
                Spacer(minLength: Theme.Space.s)
                if !isAX {
                    TimeSticker(minutes: recipe.totalMinutes)
                }
            }
            if !rescues.isEmpty {
                HeroStickers(rescues: rescues)
            }
        }
        .padding(Theme.Space.heroPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .crateBlock(category, radius: 0)
        .contentShape(Rectangle())
        .matchedTransitionSource(id: recipe.persistentModelID, in: zoom)
    }

    /// "Top pick: Beef and Broccoli Stir Fry, 35 minutes. Uses broccoli, expires today."
    private func heroSpokenLabel(recipe: Recipe, rescues: [RescueItem]) -> String {
        var head = "Top pick: " + recipe.title
        if recipe.totalMinutes > 0 {
            head += recipe.totalMinutes == 1 ? ", 1 minute" : ", \(recipe.totalMinutes) minutes"
        }
        var sentences: [String] = [head]
        for item in rescues.prefix(3) {
            let spoken: String = item.status.spokenLabel().lowercased()
            sentences.append("Uses \(item.name.lowercased()), \(spoken)")
        }
        return sentences.joined(separator: ". ")
    }

    @ViewBuilder
    private func heroCoverageLine(_ pick: TonightPick, recipe: Recipe) -> some View {
        let missing = missingText(pick)
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: Theme.Space.xs) {
                    CoverageBadge(match: pick.match)
                    Spacer(minLength: 0)
                    favoriteMark(recipe)
                }
                if let missing {
                    Text("Need " + missing)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        } else {
            HStack(alignment: .center, spacing: Theme.Space.xs) {
                CoverageBadge(match: pick.match)
                if let missing {
                    Text("· need " + missing)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .lineLimit(2)
                }
                Spacer(minLength: 0)
                favoriteMark(recipe)
            }
        }
    }

    // MARK: Compact pick

    private func compactCard(_ pick: TonightPick, recipe: Recipe, rank: Int, of total: Int) -> some View {
        let category = heroCategory(pick, recipe: recipe)
        let missing = missingText(pick)
        let metaLayout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 10))
        return VStack(alignment: .leading, spacing: Theme.Space.s) {
            Button { path.append(recipe.persistentModelID) } label: {
                HStack(alignment: .top, spacing: Theme.Space.s) {
                    CategoryTile(category, size: .large, style: .crate)
                        .matchedTransitionSource(id: recipe.persistentModelID, in: zoom)
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(recipe.title)
                                .font(Theme.Fonts.cardTitle)
                                .foregroundStyle(Theme.Colors.ink)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            favoriteMark(recipe)
                        }
                        reasonLabel(pick, rescueIconOnly: true)
                        metaLayout {
                            if recipe.totalMinutes > 0 {
                                Theme.numberText("\(recipe.totalMinutes)", unit: "min")
                                    .foregroundStyle(Theme.Colors.ink)
                            }
                            CoverageBadge(match: pick.match)
                        }
                        if let missing {
                            Text("Need " + missing)
                                .font(Theme.Fonts.footnote)
                                .foregroundStyle(Theme.Colors.text2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the recipe")

            pickActions(pick, recipe: recipe, size: .compact)
        }
        .surfaceCard()
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text("Option \(rank) of \(total)"))
    }

    // MARK: Pick pieces

    /// The pick's reason. The hero always shows a glyph; compact cards only show the leaf when it rescues food.
    @ViewBuilder
    private func reasonLabel(_ pick: TonightPick, rescueIconOnly: Bool) -> some View {
        if rescueIconOnly && pick.rescues.isEmpty {
            Text(pick.reason)
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
        } else {
            Label {
                Text(pick.reason)
                    .lineLimit(rescueIconOnly ? 2 : nil)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            } icon: {
                reasonIcon(pick)
            }
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
        }
    }

    @ViewBuilder
    private func reasonIcon(_ pick: TonightPick) -> some View {
        if !pick.rescues.isEmpty {
            Image(systemName: FreshTone.fresh.symbol)
                .foregroundStyle(Theme.Colors.fresh)
        } else if pick.match.canMake {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Theme.Colors.fresh)
        } else {
            Image(systemName: Self.basketSymbol)
                .foregroundStyle(Theme.Colors.text3)
        }
    }

    @ViewBuilder
    private func favoriteMark(_ recipe: Recipe) -> some View {
        if recipe.isFavorite {
            Image(systemName: "heart.fill")
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.plumText)
                .accessibilityLabel("Favorite")
        }
    }

    /// Three-step fallback: one row, then two rows, then everything stacked full width.
    @ViewBuilder
    private func pickActions(_ pick: TonightPick, recipe: Recipe, size: ButtonSize) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            pickActionsStacked(pick, recipe: recipe, size: size)
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    cookButton(recipe, size: size, fullWidth: false)
                    addMissingButton(pick, recipe: recipe, size: size, fullWidth: false)
                    Spacer(minLength: 0)
                    notTonightButton(recipe, fullWidth: false)
                }
                VStack(alignment: .leading, spacing: Theme.Space.xs) {
                    HStack(spacing: 10) {
                        cookButton(recipe, size: size, fullWidth: true)
                        addMissingButton(pick, recipe: recipe, size: size, fullWidth: false)
                    }
                    notTonightButton(recipe, fullWidth: false)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                pickActionsStacked(pick, recipe: recipe, size: size)
            }
        }
    }

    private func pickActionsStacked(_ pick: TonightPick, recipe: Recipe, size: ButtonSize) -> some View {
        VStack(spacing: Theme.Space.xs) {
            cookButton(recipe, size: size, fullWidth: true)
            addMissingButton(pick, recipe: recipe, size: size, fullWidth: true)
            notTonightButton(recipe, fullWidth: true)
        }
    }

    private func cookButton(_ recipe: Recipe, size: ButtonSize, fullWidth: Bool) -> some View {
        Button { cookTonight(recipe) } label: {
            Label("Cook this", systemImage: "fork.knife")
        }
        .buttonStyle(PrimaryButtonStyle(size: size, fullWidth: fullWidth))
        .accessibilityLabel(Text("Cook \(recipe.title) tonight"))
    }

    @ViewBuilder
    private func addMissingButton(_ pick: TonightPick, recipe: Recipe, size: ButtonSize, fullWidth: Bool) -> some View {
        let count = pick.match.missing.count
        if count > 0 {
            let spoken: String = count == 1
                ? "Add 1 missing ingredient to shopping list"
                : "Add \(count) missing ingredients to shopping list"
            InlineConfirmButton("Add \(count) to list", systemImage: Self.basketSymbol,
                                kind: .secondary, size: size, fullWidth: fullWidth) {
                addMissing(recipe)
            }
            .accessibilityLabel(Text(spoken))
        }
    }

    private func notTonightButton(_ recipe: Recipe, fullWidth: Bool) -> some View {
        Button { skip(recipe) } label: {
            Text("Not tonight")
                .frame(maxWidth: fullWidth ? .infinity : nil)
        }
        .buttonStyle(QuietButtonStyle())
        .accessibilityLabel(Text("Not tonight, hide \(recipe.title) for today"))
    }

    // MARK: - Empty states

    @ViewBuilder
    private var emptyState: some View {
        if recipes.isEmpty {
            EmptyStateView(
                tiles: [.grains, .dairy, .produce],
                title: "No recipes yet",
                message: "Add a few recipes and Tonight will suggest what to cook from what you have.",
                actions: [
                    EmptyAction(title: "Add sample recipes") { _ = try? SampleData.importRecipes(into: context) },
                ]
            )
        } else if pantry.isEmpty {
            EmptyStateView(
                tiles: [.produce, .dairy, .seafood],
                title: "Your fridge is empty",
                message: "Scan your last grocery receipt so Tonight knows what you have.",
                actions: [
                    EmptyAction(title: "Scan a receipt", systemImage: "doc.text.viewfinder") { showReceiptScan = true },
                ]
            )
        } else {
            EmptyStateView(
                tiles: [.produce, .meat, .other],
                title: "Nothing fits tonight",
                message: nothingFitsMessage,
                actions: nothingFitsActions
            )
        }
    }

    private var nothingFitsMessage: String {
        maxMinutes > 0
            ? "No recipe under \(maxMinutes) minutes works with what you have. Try Any time, or ask the chef."
            : "Every recipe needs more than \(TonightPlanner.maxMissing) things you don't have. Ask the chef for ideas from what's in your fridge."
    }

    private var nothingFitsActions: [EmptyAction] {
        var actions: [EmptyAction] = []
        if !skipped.isEmpty {
            actions.append(EmptyAction(title: "Show skipped recipes") { skippedRaw = "" })
        }
        actions.append(EmptyAction(title: "Ask the chef", systemImage: "sparkles") {
            chefPrompt = ChefPrompt(text: Self.tonightPrompt)
        })
        return actions
    }

    // MARK: - Ask the chef

    /// This week's featured ingredient; changes on Mondays.
    private var superIngredient: SuperIngredient? { spotlight.edition() }

    private var chefCard: some View {
        let side = min(avatarSide, 64)
        return Button { chefPrompt = ChefPrompt(text: Self.tonightPrompt) } label: {
            HStack(spacing: Theme.Space.s) {
                Image(systemName: "sparkles")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Theme.Colors.plumText)
                    .frame(width: side, height: side)
                    .background(Theme.Colors.plumSoft, in: Circle())
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Nothing grabbing you?")
                        .font(Theme.Fonts.tileTitle)
                        .foregroundStyle(Theme.Colors.ink)
                    Text("Ask the chef for something new with what's expiring.")
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .multilineTextAlignment(.leading)
                Spacer(minLength: Theme.Space.xs)
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.Colors.text3)
                    .accessibilityHidden(true)
            }
            .surfaceCard()
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.top, Theme.Space.s)
    }

    private var footer: some View {
        Text("Picks favor food that's about to go bad, recipes you can make without shopping, and things you haven't had lately.")
            .font(Theme.Fonts.footnote)
            .foregroundStyle(Theme.Colors.text3)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Actions

    private func cookTonight(_ recipe: Recipe) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            if let entry = tonightEntry {
                entry.recipe = recipe
                entry.servings = recipe.servings
            } else {
                context.insert(MealPlanEntry(day: .now, slot: .dinner, recipe: recipe, servings: recipe.servings))
            }
        }
        cookedTick += 1
    }

    private func skip(_ recipe: Recipe) {
        var ids = skipped
        ids.insert(recipe.uuid)
        let raw = Self.dayKey.string(from: .now) + "|" + ids.map(\.uuidString).joined(separator: ",")
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            skippedRaw = raw
        }
    }

    /// Adds what the recipe is missing to Shopping. Returns the inline confirmation.
    private func addMissing(_ recipe: Recipe) -> String {
        let added = ShoppingAdder.addMissing(
            for: [PlannedRecipe(title: recipe.title, requirements: recipe.requirements)],
            pantry: pantry,
            existing: shopping,
            preferences: KitchenPreferences(staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays),
            context: context
        )
        return added == 0 ? "On your list" : "Added \(added)"
    }

    /// Same as the Fridge's "Used up" swipe: put it on the shopping list and take it out of the fridge.
    private func useUp(_ item: PantryItem) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            context.insert(ShoppingItem(name: item.name, quantity: item.quantity, unit: item.unit, reason: "Used up"))
            context.delete(item)
        }
    }

    private func askChef(about item: PantryItem) {
        chefPrompt = ChefPrompt(text: "What can I make tonight with the \(item.name.lowercased()) before it goes bad?")
    }
}

// MARK: - Private components

/// Produce stickers on the hero block ("Broccoli · Today"). They pop in once, staggered (DESIGN.md §10).
private struct HeroStickers: View {
    let rescues: [RescueItem]

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var placed = false

    private static let rotations: [Double] = [-2, 1.5, -1]

    var body: some View {
        let shown = Array(rescues.prefix(3))
        let extra = rescues.count - shown.count
        if let first = shown.first {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 6) {
                    ForEach(shown.indices, id: \.self) { index in
                        sticker(shown[index], index: index)
                    }
                    if extra > 0 {
                        moreSticker(extra, index: shown.count)
                    }
                }
                HStack(spacing: 6) {
                    sticker(first, index: 0)
                    if rescues.count > 1 {
                        moreSticker(rescues.count - 1, index: 1)
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(shown.indices, id: \.self) { index in
                        sticker(shown[index], index: index)
                    }
                    if extra > 0 {
                        moreSticker(extra, index: shown.count)
                    }
                }
            }
            .onAppear { placed = true }
        }
    }

    private func sticker(_ item: RescueItem, index: Int) -> some View {
        Sticker(item.name + " · " + item.status.shortLabel,
                tone: item.status.tone(),
                rotation: .degrees(Self.rotations[index % Self.rotations.count]))
            .scaleEffect(placed ? 1 : 0.8)
            .animation(reduceMotion ? nil : Theme.Motion.bouncy.delay(0.05 * Double(index)), value: placed)
    }

    private func moreSticker(_ count: Int, index: Int) -> some View {
        Sticker("+\(count)", rotation: .degrees(1))
            .scaleEffect(placed ? 1 : 0.8)
            .animation(reduceMotion ? nil : Theme.Motion.bouncy.delay(0.05 * Double(index)), value: placed)
    }
}

/// The Use-soon strip's edge shrink (DESIGN.md §10). Not applied under Reduce Motion.
private struct UseSoonEdgeEffect: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @ViewBuilder
    func body(content: Content) -> some View {
        if reduceMotion {
            content
        } else {
            content.scrollTransition(.interactive, axis: .horizontal) { effect, phase in
                effect
                    .scaleEffect(phase.isIdentity ? 1 : 0.94)
                    .opacity(phase.isIdentity ? 1 : 0.75)
            }
        }
    }
}
