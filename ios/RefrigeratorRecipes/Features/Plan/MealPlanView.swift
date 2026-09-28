import SwiftUI
import SwiftData
import FridgeCore

/// The week's meals (DESIGN.md §8.14): a week strip whose dots show where expiring food gets used,
/// a "Shop for this week" card, then one section per day.
struct MealPlanView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Query(sort: \MealPlanEntry.day) private var entries: [MealPlanEntry]
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]
    @Query(sort: \Recipe.title) private var recipes: [Recipe]

    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.planAllMeals) private var planAllMeals = SettingsDefault.planAllMeals

    @State private var weekStart = Calendar.current.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
    @State private var addingDay: PlanTarget?
    @State private var cooking: MealPlanEntry?
    /// Bumped on every week-strip tap, for the selection haptic.
    @State private var stripTaps = 0
    /// Bumped when the toolbar basket adds the week to the list, for the success haptic.
    @State private var toolbarShopTick = 0
    /// The toolbar basket shows a checkmark for 2 s after it runs.
    @State private var toolbarConfirmed = false
    /// Meals the last "Plan my week" added, for Undo.
    @State private var lastFill: [MealPlanEntry] = []
    /// "Planned 5 dinners", shown in place of the Plan my week button for a few seconds.
    @State private var fillMessage: String?
    /// Bumped by Plan my week, for the success haptic and to time out the message.
    @State private var fillTick = 0
    /// Bumped when a meal moves or swaps, for the selection haptic.
    @State private var editTick = 0

    @ScaledMetric(relativeTo: .body) private var shopTileSide: CGFloat = 44

    struct PlanTarget: Identifiable {
        let day: Date
        var id: Date { day }
    }

    /// Guarded: a missing symbol renders blank with no build error (§5.1).
    private static let basketSymbol = Theme.symbol("basket", fallback: "cart")
    private static let basketFillSymbol = Theme.symbol("basket.fill", fallback: "cart.fill")
    /// Where a tapped day lands: near the top, leaving room for its header above the first row.
    private static let dayAnchor = UnitPoint(x: 0.5, y: 0.1)

    private var calendar: Calendar { .current }

    private static func startOfWeek(containing date: Date) -> Date {
        Calendar.current.dateInterval(of: .weekOfYear, for: date)?.start ?? date
    }

    private var isCurrentWeek: Bool {
        weekStart == Self.startOfWeek(containing: .now)
    }

    private var days: [Date] {
        (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekStart) }
    }

    private var weekEntries: [MealPlanEntry] {
        guard let end = calendar.date(byAdding: .day, value: 7, to: weekStart) else { return [] }
        return entries.filter { $0.day >= weekStart && $0.day < end }
    }

    /// Days from today on (every day, for a future week) with no dinner planned.
    private var openNights: [Date] {
        days.filter { day in
            !isPast(day) && !meals(on: day).contains { $0.slot == .dinner }
        }
    }

    /// Indexes into `recipes` of the recipes already planned this week.
    private var plannedRecipeIndexes: Set<Int> {
        let planned = Set(weekEntries.compactMap { $0.recipe?.uuid })
        return Set(recipes.indices.filter { planned.contains(recipes[$0].uuid) })
    }

    private static func slotOrder(_ slot: MealSlot) -> Int {
        MealSlot.allCases.firstIndex(of: slot) ?? 0
    }

    private func meals(on day: Date) -> [MealPlanEntry] {
        weekEntries
            .filter { calendar.isDate($0.day, inSameDayAs: day) }
            .sorted { Self.slotOrder($0.slot) < Self.slotOrder($1.slot) }
    }

    /// "Sep 21 – 27", or "Sep 28 – Oct 4" across a month boundary.
    private var weekTitle: String {
        let end = calendar.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        let start = weekStart.formatted(.dateTime.month(.abbreviated).day())
        if calendar.isDate(weekStart, equalTo: end, toGranularity: .month) {
            return "\(start) – \(calendar.component(.day, from: end))"
        }
        return "\(start) – \(end.formatted(.dateTime.month(.abbreviated).day()))"
    }

    /// "5 meals planned", "1 meal planned", "Nothing planned".
    private var plannedSummary: String {
        let count = weekEntries.count
        if count == 0 { return "Nothing planned" }
        return count == 1 ? "1 meal planned" : "\(count) meals planned"
    }

    private func weekdayName(_ day: Date) -> String {
        day.formatted(.dateTime.weekday(.wide))
    }

    private func isPast(_ day: Date) -> Bool {
        day < calendar.startOfDay(for: .now)
    }

    /// For each planned meal this week, the tone of the most urgent food it rescues (§8.14, week-strip dots).
    private func rescueTones(stock: [StockItem]) -> [PersistentIdentifier: FreshTone] {
        var tones: [PersistentIdentifier: FreshTone] = [:]
        for entry in weekEntries {
            guard let recipe = entry.recipe else { continue }
            let rescues = Rescue.items(requirements: recipe.requirements, stock: stock, soonThresholdDays: soonDays)
            if let first = rescues.first {
                tones[entry.persistentModelID] = first.status.tone()
            }
        }
        return tones
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                planList(proxy)
            }
            .navigationTitle("Meal plan")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !isCurrentWeek {
                        Button("Today") {
                            weekStart = Self.startOfWeek(containing: .now)
                        }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { shopWeekFromToolbar() } label: {
                        Image(systemName: toolbarConfirmed ? "checkmark" : Self.basketSymbol)
                            .contentTransition(.symbolEffect(.replace))
                    }
                    .disabled(weekEntries.isEmpty)
                    .accessibilityLabel("Shop for week")
                }
            }
            .sheet(item: $addingDay) { target in
                RecipePickerSheet(day: target.day, week: days)
            }
            .sheet(item: $cooking) { entry in
                if let recipe = entry.recipe {
                    CookedSheet(recipe: recipe, servings: entry.servings)
                }
            }
            .hapticSelection(trigger: stripTaps)
            .hapticSelection(trigger: weekStart)
            .hapticSuccess(trigger: toolbarShopTick)
            .hapticSuccess(trigger: fillTick)
            .hapticSelection(trigger: editTick)
            .task(id: fillTick) {
                guard fillMessage != nil else { return }
                try? await Task.sleep(for: .seconds(8))
                guard !Task.isCancelled else { return }
                withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
                    fillMessage = nil
                    lastFill = []
                }
            }
            .task(id: toolbarConfirmed) {
                guard toolbarConfirmed else { return }
                try? await Task.sleep(for: .seconds(2))
                guard !Task.isCancelled else { return }
                withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                    toolbarConfirmed = false
                }
            }
        }
    }

    private func planList(_ proxy: ScrollViewProxy) -> some View {
        let staples = Staples.parse(staplesRaw)
        let tones = rescueTones(stock: pantry.map(\.stockItem))
        return List {
            Section {
                weekHeader
                    .planClearRow()
                weekStrip(proxy, tones: tones)
                    .planClearRow()
                if fillMessage != nil || !openNights.isEmpty {
                    planWeekCard
                        .planClearRow()
                }
                if !weekEntries.isEmpty {
                    shopCard
                        .planClearRow()
                }
            }

            ForEach(days, id: \.self) { day in
                daySection(day, staples: staples)
            }
        }
        .listStyle(.insetGrouped)
        .listChrome()
    }

    // MARK: - Week header

    private var weekHeader: some View {
        HStack(spacing: Theme.Space.xs) {
            Button { shiftWeek(-1) } label: {
                Image(systemName: "chevron.left")
            }
            .buttonStyle(IconCircleButtonStyle(.neutral))
            .accessibilityLabel("Previous week")

            VStack(spacing: 2) {
                // `number` is tileTitle's headline/heavy with rounded, tabular digits.
                Text(weekTitle)
                    .font(Theme.Fonts.number)
                    .foregroundStyle(Theme.Colors.ink)
                Text(plannedSummary)
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text2)
            }
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isHeader)

            Button { shiftWeek(1) } label: {
                Image(systemName: "chevron.right")
            }
            .buttonStyle(IconCircleButtonStyle(.neutral))
            .accessibilityLabel("Next week")
        }
    }

    // MARK: - Week strip

    @ViewBuilder
    private func weekStrip(_ proxy: ScrollViewProxy, tones: [PersistentIdentifier: FreshTone]) -> some View {
        if dynamicTypeSize >= .accessibility3 {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(days, id: \.self) { day in
                        weekColumn(day, proxy: proxy, tones: tones, scrolls: true)
                    }
                }
            }
            .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Week")
        } else {
            HStack(spacing: 6) {
                ForEach(days, id: \.self) { day in
                    weekColumn(day, proxy: proxy, tones: tones, scrolls: false)
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Week")
        }
    }

    private func weekColumn(_ day: Date, proxy: ScrollViewProxy, tones: [PersistentIdentifier: FreshTone],
                            scrolls: Bool) -> some View {
        let dayMeals = meals(on: day)
        let dots: [FreshTone?] = dayMeals.prefix(3).map { entry in tones[entry.persistentModelID] }
        let rescuesFood = dayMeals.contains { entry in tones[entry.persistentModelID] != nil }
        let isToday = calendar.isDateInToday(day)
        let width: CGFloat? = scrolls ? 56 : nil
        return Button {
            scroll(to: day, proxy: proxy)
        } label: {
            PlanWeekColumn(initial: day.formatted(.dateTime.weekday(.narrow)),
                           dayNumber: calendar.component(.day, from: day),
                           dots: dots,
                           isToday: isToday,
                           isPast: isPast(day),
                           fixedWidth: width)
        }
        .buttonStyle(PlanPressButtonStyle())
        .accessibilityLabel(columnLabel(day, mealCount: dayMeals.count, rescuesFood: rescuesFood, isToday: isToday))
        .accessibilityHint("Shows this day")
    }

    /// "Saturday 26, 1 meal, uses expiring food"
    private func columnLabel(_ day: Date, mealCount: Int, rescuesFood: Bool, isToday: Bool) -> String {
        var parts = ["\(weekdayName(day)) \(calendar.component(.day, from: day))"]
        if isToday { parts.append("today") }
        if mealCount == 0 {
            parts.append("no meals")
        } else {
            parts.append(mealCount == 1 ? "1 meal" : "\(mealCount) meals")
        }
        if rescuesFood { parts.append("uses expiring food") }
        return parts.joined(separator: ", ")
    }

    private func scroll(to day: Date, proxy: ScrollViewProxy) {
        stripTaps += 1
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            proxy.scrollTo(day, anchor: Self.dayAnchor)
        }
    }

    // MARK: - Plan my week

    @ViewBuilder
    private var planWeekCard: some View {
        if let fillMessage {
            HStack(spacing: Theme.Space.s) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Theme.Colors.beetText)
                    .accessibilityHidden(true)
                Text(fillMessage)
                    .font(Theme.Fonts.detailStrong)
                    .foregroundStyle(Theme.Colors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                if !lastFill.isEmpty {
                    Button("Undo") { undoFill() }
                        .buttonStyle(QuietButtonStyle(color: Theme.Colors.beetText))
                        .accessibilityHint("Removes the dinners Plan my week just added")
                }
            }
            .surfaceCard()
        } else {
            let open = openNights.count
            Button { fillWeek() } label: {
                Label(open == 1 ? "Plan my week · 1 open night" : "Plan my week · \(open) open nights",
                      systemImage: "wand.and.stars")
            }
            .buttonStyle(CapsuleButtonStyle(.primary, fullWidth: true))
            .accessibilityHint("Fills each open night with a dinner that uses what you have")
        }
    }

    // MARK: - Shop for this week

    private var shopCard: some View {
        let count = weekEntries.count
        let subtitle: String = count == 1
            ? "Adds what 1 meal needs, minus what you have"
            : "Adds what \(count) meals need, minus what you have"
        let side = min(shopTileSide, 64)
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        return VStack(alignment: .leading, spacing: Theme.Space.s) {
            HStack(spacing: Theme.Space.s) {
                Image(systemName: Self.basketFillSymbol)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Theme.Colors.onBeet)
                    .frame(width: side, height: side)
                    .background(Theme.Colors.beet,
                                in: RoundedRectangle(cornerRadius: Theme.Radius.tile, style: .continuous))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Shop for this week")
                        .font(Theme.Fonts.tileTitle)
                        .foregroundStyle(Theme.Colors.beetStrong)
                        .accessibilityAddTraits(.isHeader)
                    Text(subtitle)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            InlineConfirmButton("Add to list", systemImage: Self.basketSymbol, kind: .primary, size: .compact) {
                let added = addWeekToShopping()
                return added == 0 ? "Nothing new" : "Added \(added)"
            }
            .accessibilityHint("Adds what this week's meals need to your shopping list")
        }
        .multilineTextAlignment(.leading)
        .padding(Theme.Space.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Colors.beetSoft, in: shape)
        .overlay {
            if colorSchemeContrast == .increased {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
    }

    // MARK: - Days

    @ViewBuilder
    private func daySection(_ day: Date, staples: [String]) -> some View {
        let dayMeals = meals(on: day)
        let firstID = dayMeals.first?.persistentModelID
        Section {
            if dayMeals.isEmpty {
                // `.id(day)` sits on each day's first row so the week strip can scroll to it.
                emptyDayRow(day)
                    .id(day)
                    .dropDestination(for: String.self) { items, _ in dropMeals(items, on: day) }
            } else {
                ForEach(dayMeals) { entry in
                    if entry.persistentModelID == firstID {
                        mealRow(entry, staples: staples)
                            .id(day)
                    } else {
                        mealRow(entry, staples: staples)
                    }
                }
                addAnotherRow(day)
                    .dropDestination(for: String.self) { items, _ in dropMeals(items, on: day) }
            }
        } header: {
            dayHeader(day)
                .dropDestination(for: String.self) { items, _ in dropMeals(items, on: day) }
        }
    }

    private func dayHeader(_ day: Date) -> some View {
        let isToday = calendar.isDateInToday(day)
        let past = !isToday && isPast(day)
        let number = calendar.component(.day, from: day)
        let spoken: String = isToday ? "\(weekdayName(day)) \(number), today" : "\(weekdayName(day)) \(number)"
        return HStack(alignment: .firstTextBaseline, spacing: Theme.Space.xs) {
            Text("\(number)")
                .font(Theme.Fonts.numberLarge)
            Text(weekdayName(day))
                .font(Theme.Fonts.section)
            if isToday {
                Text("Today")
                    .font(Theme.Fonts.tag)
                    .foregroundStyle(Theme.Colors.onBeet)
                    .padding(.horizontal, Theme.Space.xs)
                    .padding(.vertical, Theme.Space.xxs)
                    .background(Theme.Colors.beet, in: Capsule())
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(past ? Theme.Colors.text3 : Theme.Colors.ink)
        .textCase(nil)
        .padding(.top, Theme.Space.xs)
        .padding(.bottom, Theme.Space.xxs)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken)
        .accessibilityAddTraits(.isHeader)
    }

    private func mealTitle(_ entry: MealPlanEntry) -> String {
        entry.recipe?.title ?? (entry.note.isEmpty ? "Meal" : entry.note)
    }

    @ViewBuilder
    private func mealRow(_ entry: MealPlanEntry, staples: [String]) -> some View {
        let content = PlanMealRow(slot: entry.slot,
                                  showsSlot: planAllMeals || entry.slot != .dinner,
                                  title: mealTitle(entry),
                                  servings: entry.servings,
                                  category: entry.recipe?.leadCategory(staples: staples) ?? .other)
        Group {
            if let recipe = entry.recipe {
                NavigationLink(value: recipe.persistentModelID) { content }
            } else {
                content
            }
        }
        .listRowBackground(Theme.Colors.surface)
        .listRowSeparatorTint(Theme.Colors.separator)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { context.delete(entry) } label: {
                Label("Remove", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading) {
            if entry.recipe != nil {
                Button { cooking = entry } label: {
                    Label("Cooked", systemImage: "frying.pan.fill")
                }
                .tint(Theme.Colors.beet)
            }
        }
        .contextMenu {
            if entry.recipe != nil {
                Button { cooking = entry } label: {
                    Label("Cooked", systemImage: "frying.pan.fill")
                }
                Button { swap(entry) } label: {
                    Label("Swap for another", systemImage: "arrow.triangle.2.circlepath")
                }
            }
            Menu {
                ForEach(days.filter { !calendar.isDate($0, inSameDayAs: entry.day) }, id: \.self) { day in
                    Button(weekdayName(day)) { move(entry, to: day) }
                }
            } label: {
                Label("Move to", systemImage: "calendar")
            }
            if planAllMeals {
                Picker(selection: Binding(get: { entry.slot }, set: { entry.slot = $0; editTick += 1 })) {
                    ForEach(MealSlot.allCases) { slot in
                        Text(slot.title).tag(slot)
                    }
                } label: {
                    Label("Meal", systemImage: "fork.knife")
                }
                .pickerStyle(.menu)
            }
            Button(role: .destructive) { context.delete(entry) } label: {
                Label("Remove", systemImage: "trash")
            }
        }
        // Long-press and drag onto another day to move it.
        .draggable(Self.dragToken(entry))
    }

    /// A dashed placeholder: the day is open.
    private func emptyDayRow(_ day: Date) -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous)
        return Button {
            addingDay = PlanTarget(day: day)
        } label: {
            Label("Add meal", systemImage: "plus")
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.text2)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background {
                    shape.strokeBorder(Theme.Colors.fillStrong, style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                }
                .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Add meal on \(weekdayName(day))")
        .planClearRow()
    }

    /// Days with meals end with a quiet "+ Add".
    private func addAnotherRow(_ day: Date) -> some View {
        Button {
            addingDay = PlanTarget(day: day)
        } label: {
            Label("Add", systemImage: "plus")
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(QuietButtonStyle(color: Theme.Colors.beetText))
        .accessibilityLabel("Add another meal on \(weekdayName(day))")
        .listRowBackground(Theme.Colors.surface)
        .listRowSeparatorTint(Theme.Colors.separator)
    }

    // MARK: - Actions

    private func shiftWeek(_ weeks: Int) {
        weekStart = calendar.date(byAdding: .weekOfYear, value: weeks, to: weekStart) ?? weekStart
        fillMessage = nil
        lastFill = []
    }

    /// Fills every open night with the best dinner for that day (see `WeekPlanner`).
    private func fillWeek() {
        let nights = openNights
        guard !nights.isEmpty else { return }
        let picks = WeekPlanner.fill(
            days: nights,
            recipes: recipes.map(\.tonightRecipe),
            stock: pantry.map(\.stockItem),
            staples: Staples.parse(staplesRaw),
            alreadyPlanned: plannedRecipeIndexes,
            soonThresholdDays: soonDays
        )
        var added: [MealPlanEntry] = []
        for pick in picks {
            let recipe = recipes[pick.recipeIndex]
            let entry = MealPlanEntry(day: nights[pick.dayIndex], slot: .dinner, recipe: recipe, servings: recipe.servings)
            context.insert(entry)
            added.append(entry)
        }
        let message: String
        if added.isEmpty {
            message = recipes.isEmpty
                ? "Add a few recipes first, then Plan my week can fill the nights."
                : "Nothing fits yet. Add recipes or stock up, then try again."
        } else if added.count == nights.count {
            message = added.count == 1 ? "Planned 1 dinner" : "Planned \(added.count) dinners"
        } else {
            message = "Planned \(added.count) of \(nights.count) nights"
        }
        AccessibilityNotification.Announcement(message).post()
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            lastFill = added
            fillMessage = message
        }
        fillTick += 1
    }

    private func undoFill() {
        for entry in lastFill where !entry.isDeleted {
            context.delete(entry)
        }
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            lastFill = []
            fillMessage = nil
        }
    }

    private func move(_ entry: MealPlanEntry, to day: Date) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            entry.day = calendar.startOfDay(for: day)
        }
        editTick += 1
    }

    /// Replaces the recipe with the next-best one for that day that isn't already planned this week.
    private func swap(_ entry: MealPlanEntry) {
        guard let index = WeekPlanner.alternative(
            on: entry.day,
            recipes: recipes.map(\.tonightRecipe),
            stock: pantry.map(\.stockItem),
            staples: Staples.parse(staplesRaw),
            excluding: plannedRecipeIndexes,
            soonThresholdDays: soonDays
        ) else {
            AccessibilityNotification.Announcement("No other recipe fits that day").post()
            return
        }
        let recipe = recipes[index]
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            entry.recipe = recipe
            entry.servings = recipe.servings
        }
        editTick += 1
        AccessibilityNotification.Announcement("Swapped for \(recipe.title)").post()
    }

    // MARK: - Drag and drop

    private static let dragPrefix = "fridge-meal:"

    /// A meal's drag payload: its encoded model ID.
    private static func dragToken(_ entry: MealPlanEntry) -> String {
        let data = (try? JSONEncoder().encode(entry.persistentModelID)) ?? Data()
        return dragPrefix + data.base64EncodedString()
    }

    private func dropMeals(_ tokens: [String], on day: Date) -> Bool {
        var moved = false
        for token in tokens where token.hasPrefix(Self.dragPrefix) {
            guard let data = Data(base64Encoded: String(token.dropFirst(Self.dragPrefix.count))),
                  let id = try? JSONDecoder().decode(PersistentIdentifier.self, from: data),
                  let entry = entries.first(where: { $0.persistentModelID == id }) else { continue }
            move(entry, to: day)
            moved = true
        }
        return moved
    }

    /// The toolbar basket: same action as the card, confirmed in place with a checkmark.
    private func shopWeekFromToolbar() {
        let added = addWeekToShopping()
        let message = added == 0
            ? "You already have everything for this week."
            : "Added \(added) item\(added == 1 ? "" : "s") to your shopping list."
        AccessibilityNotification.Announcement(message).post()
        toolbarShopTick += 1
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            toolbarConfirmed = true
        }
    }

    /// - Returns: the number of items added to the shopping list.
    @discardableResult
    private func addWeekToShopping() -> Int {
        let planned = weekEntries.compactMap { entry -> PlannedRecipe? in
            guard let recipe = entry.recipe else { return nil }
            let scale = Double(entry.servings) / Double(max(recipe.servings, 1))
            return PlannedRecipe(title: recipe.title, requirements: recipe.requirements, scale: scale)
        }
        return ShoppingAdder.addMissing(
            for: planned,
            pantry: pantry,
            existing: shopping,
            preferences: KitchenPreferences(staples: Staples.parse(staplesRaw), soonThresholdDays: soonDays),
            context: context
        )
    }
}

// MARK: - Week column

/// One day in the week strip: weekday initial, day number, and a dot per meal (up to 3).
/// A meal's dot takes the tone of the most urgent food it rescues; otherwise it is quiet.
private struct PlanWeekColumn: View {
    let initial: String
    let dayNumber: Int
    let dots: [FreshTone?]
    let isToday: Bool
    let isPast: Bool
    /// Set at AX3+, where the strip scrolls; nil stretches to an equal share of the row.
    let fixedWidth: CGFloat?

    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @ScaledMetric(relativeTo: .caption) private var dotSide: CGFloat = 6

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous)
        let side = min(dotSide, 10)
        let maxWidth: CGFloat? = fixedWidth == nil ? CGFloat.infinity : nil
        VStack(spacing: Theme.Space.xxs) {
            Text(initial)
                .eyebrowStyle()
                .foregroundStyle(isToday ? Theme.Colors.onBeet2 : Theme.Colors.text2)
            Text("\(dayNumber)")
                .font(Theme.Fonts.weekNumber)
                .foregroundStyle(numberColor)
                .minimumScaleFactor(0.7)
            HStack(spacing: 3) {
                ForEach(dots.indices, id: \.self) { index in
                    dot(dots[index], side: side)
                }
            }
            .frame(height: side)
        }
        .lineLimit(1)
        .padding(.vertical, Theme.Space.xs)
        .padding(.horizontal, fixedWidth == nil ? 0 : Theme.Space.xs)
        .frame(minWidth: fixedWidth, maxWidth: maxWidth, minHeight: 64)
        .background(isToday ? Theme.Colors.beet : Theme.Colors.surface, in: shape)
        .overlay {
            if colorSchemeContrast == .increased && !isToday {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .contentShape(shape)
    }

    private var numberColor: Color {
        if isToday { return Theme.Colors.onBeet }
        return isPast ? Theme.Colors.text3 : Theme.Colors.ink
    }

    @ViewBuilder
    private func dot(_ tone: FreshTone?, side: CGFloat) -> some View {
        if let tone {
            ToneDot(tone, size: side)
                .overlay {
                    // A white rim keeps tomato and citrus readable on the beet "today" column.
                    if isToday {
                        Circle().strokeBorder(Theme.Colors.onBeet, lineWidth: 1)
                    }
                }
        } else {
            Circle()
                .fill(isToday ? Theme.Colors.onBeet2 : Theme.Colors.text3)
                .frame(width: side, height: side)
                .accessibilityHidden(true)
        }
    }
}

/// Week columns shrink slightly while pressed (opacity only under Reduce Motion).
private struct PlanPressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        PlanPressBody(configuration: configuration)
    }
}

private struct PlanPressBody: View {
    let configuration: ButtonStyleConfiguration
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.96 : 1)
            .opacity(configuration.isPressed && reduceMotion ? 0.7 : 1)
            .animation(Theme.Motion.snappy, value: configuration.isPressed)
    }
}

// MARK: - Meal row

/// Soft category tile, slot eyebrow over the title, and the servings count.
private struct PlanMealRow: View {
    let slot: MealSlot
    /// Hidden in dinners-only planning, where every meal is dinner.
    let showsSlot: Bool
    let title: String
    let servings: Int
    let category: FoodCategory

    var body: some View {
        HStack(spacing: Theme.Space.s) {
            CategoryTile(category, size: .row, style: .soft)
            VStack(alignment: .leading, spacing: 2) {
                if showsSlot {
                    Text(slot.title)
                        .eyebrowStyle()
                        .foregroundStyle(Theme.Colors.text2)
                }
                Text(title)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .alignmentGuide(.listRowSeparatorLeading) { d in d[.leading] }
            Spacer(minLength: Theme.Space.xs)
            Text("×\(servings)")
                .font(Theme.Fonts.tag)
                .foregroundStyle(Theme.Colors.text2)
        }
        .padding(.vertical, 6)
        .frame(minHeight: Theme.Metrics.foodRowMin)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spokenLabel)
    }

    /// "Dinner, Beef stir fry, 4 servings"
    private var spokenLabel: String {
        let servingsText = servings == 1 ? "1 serving" : "\(servings) servings"
        return showsSlot ? "\(slot.title), \(title), \(servingsText)" : "\(title), \(servingsText)"
    }
}

// MARK: - Recipe picker

/// Stays open so a whole week can be planned in one go: pick a day, tap recipes.
/// In dinners-only planning the day moves on to the next open night after each pick.
struct RecipePickerSheet: View {
    let week: [Date]

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @Query(sort: \MealPlanEntry.day) private var entries: [MealPlanEntry]
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.planAllMeals) private var planAllMeals = SettingsDefault.planAllMeals
    @State private var day: Date
    /// nil = each recipe goes to the meal it fits.
    @State private var slotChoice: MealSlot?
    @State private var search = ""
    @State private var addedTick = 0
    @State private var lastAdded: MealPlanEntry?
    @State private var lastAddedFrom: Date?
    @State private var addedMessage: String?

    init(day: Date, week: [Date]) {
        self.week = week
        _day = State(initialValue: Calendar.current.startOfDay(for: day))
    }

    private var calendar: Calendar { .current }

    private var filtered: [Recipe] {
        search.isEmpty ? recipes : recipes.filter { $0.title.localizedCaseInsensitiveContains(search) }
    }

    private func mealCount(on date: Date) -> Int {
        entries.filter { calendar.isDate($0.day, inSameDayAs: date) }.count
    }

    var body: some View {
        NavigationStack {
            content
                .searchable(text: $search)
                .navigationTitle(Text(day, format: .dateTime.weekday(.wide).month().day()))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
                }
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    if let addedMessage {
                        addedBar(addedMessage)
                            .transition(AnyTransition.reducible(.move(edge: .bottom).combined(with: .opacity),
                                                                reduceMotion: reduceMotion))
                    }
                }
                .motionAnimation(Theme.Motion.smooth, value: addedMessage)
        }
        .sheetChrome()
        .hapticSuccess(trigger: addedTick)
    }

    @ViewBuilder
    private var content: some View {
        if recipes.isEmpty {
            ScrollView {
                EmptyStateView(
                    tiles: [.grains, .dairy, .produce],
                    title: "No recipes",
                    message: "Add recipes in the Recipes tab first.",
                    actions: [
                        EmptyAction(title: "Open Recipes", systemImage: "book.closed", action: { openRecipes() }),
                    ]
                )
            }
            .background(Theme.Colors.canvas)
        } else {
            recipeList
        }
    }

    private var recipeList: some View {
        let stock = pantry.map(\.stockItem)
        let staples = Staples.parse(staplesRaw)
        let shown = filtered
        return List {
            ChipPicker("Day", selection: $day,
                       options: week.map { (date: Date) -> ChipOption<Date> in
                           let count = mealCount(on: date)
                           return ChipOption(date, date.formatted(.dateTime.weekday(.abbreviated)),
                                             count: count == 0 ? nil : count,
                                             accessibilityLabel: dayLabel(date, count: count))
                       },
                       contentInset: 0)
                .planClearRow()

            if planAllMeals {
                ChipPicker("Meal", selection: $slotChoice,
                           options: [ChipOption<MealSlot?>(nil, "Auto")]
                               + MealSlot.allCases.map { ChipOption<MealSlot?>($0, $0.title) },
                           contentInset: 0)
                    .planClearRow()
            }

            if shown.isEmpty {
                ContentUnavailableView.search(text: search)
                    .planClearRow()
            } else {
                Section {
                    ForEach(shown) { recipe in
                        pickerRow(recipe, stock: stock, staples: staples)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .listChrome()
    }

    /// "Tuesday, 2 meals"
    private func dayLabel(_ date: Date, count: Int) -> String {
        let name = date.formatted(.dateTime.weekday(.wide))
        switch count {
        case 0: return "\(name), nothing planned"
        case 1: return "\(name), 1 meal"
        default: return "\(name), \(count) meals"
        }
    }

    private func pickerRow(_ recipe: Recipe, stock: [StockItem], staples: [String]) -> some View {
        let match = recipe.match(stock: stock, staples: staples, soonThresholdDays: soonDays)
        let rescues = Rescue.items(requirements: recipe.requirements, stock: stock, soonThresholdDays: soonDays)
        return Button {
            add(recipe)
        } label: {
            PlanPickerRow(title: recipe.title,
                          minutes: recipe.totalMinutes,
                          category: recipe.leadCategory(staples: staples),
                          match: match,
                          rescueNames: rescues.map { $0.name })
        }
        .accessibilityHint("Adds it to \(day.formatted(.dateTime.weekday(.wide)))")
        .listRowBackground(Theme.Colors.surface)
        .listRowSeparatorTint(Theme.Colors.separator)
    }

    /// "Added Chili to Tuesday · Undo"
    private func addedBar(_ message: String) -> some View {
        HStack(spacing: Theme.Space.s) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Theme.Colors.beetText)
                .accessibilityHidden(true)
            Text(message)
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.ink)
                .lineLimit(2)
            Spacer(minLength: 0)
            if lastAdded != nil {
                Button("Undo") { undo() }
                    .buttonStyle(QuietButtonStyle(color: Theme.Colors.beetText))
            }
        }
        .padding(.horizontal, Theme.Space.gutter)
        .padding(.vertical, Theme.Space.s)
        .frame(maxWidth: .infinity)
        .background(.regularMaterial)
    }

    private func add(_ recipe: Recipe) {
        let slot: MealSlot = planAllMeals ? (slotChoice ?? recipe.guessedSlot) : .dinner
        let entry = MealPlanEntry(day: day, slot: slot, recipe: recipe, servings: recipe.servings)
        context.insert(entry)
        let dayName = day.formatted(.dateTime.weekday(.wide))
        let message = planAllMeals
            ? "Added \(recipe.title) to \(dayName) \(slot.title.lowercased())"
            : "Added \(recipe.title) to \(dayName)"
        lastAdded = entry
        lastAddedFrom = day
        addedMessage = message
        addedTick += 1
        AccessibilityNotification.Announcement(message).post()
        if !planAllMeals, let next = nextOpenNight(after: day) {
            day = next
        }
    }

    /// The next day of the week (wrapping to earlier ones, but never the past) with no dinner.
    private func nextOpenNight(after current: Date) -> Date? {
        let today = calendar.startOfDay(for: .now)
        let candidates = week.filter { $0 > current } + week.filter { $0 < current }
        return candidates.first { date in
            date >= today && !entries.contains { calendar.isDate($0.day, inSameDayAs: date) && $0.slot == .dinner }
        }
    }

    private func undo() {
        if let lastAdded, !lastAdded.isDeleted {
            context.delete(lastAdded)
        }
        if let lastAddedFrom { day = lastAddedFrom }
        lastAdded = nil
        lastAddedFrom = nil
        addedMessage = "Removed"
    }

    private func openRecipes() {
        dismiss()
        AppRouter.shared.tab = .recipes
    }
}

/// Soft tile, title, "30 min", coverage, and a trailing alarm when the recipe rescues expiring food.
private struct PlanPickerRow: View {
    let title: String
    let minutes: Int
    let category: FoodCategory
    let match: RecipeMatch
    let rescueNames: [String]

    var body: some View {
        HStack(spacing: Theme.Space.s) {
            CategoryTile(category, size: .row, style: .soft)
            VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                Text(title)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 10) { meta }
                    VStack(alignment: .leading, spacing: Theme.Space.xxs) { meta }
                }
            }
            .alignmentGuide(.listRowSeparatorLeading) { d in d[.leading] }
            Spacer(minLength: Theme.Space.xs)
            if !rescueNames.isEmpty {
                Image(systemName: FreshTone.today.symbol)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Theme.Colors.todayText)
            }
        }
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, minHeight: Theme.Metrics.foodRowMin, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spokenLabel)
    }

    @ViewBuilder
    private var meta: some View {
        if minutes > 0 {
            Theme.numberText("\(minutes)", unit: "min")
                .foregroundStyle(Theme.Colors.text2)
        }
        CoverageBadge(match: match)
    }

    /// "Beef stir fry, 35 minutes, have 5 of 7 ingredients, uses broccoli before it goes bad"
    private var spokenLabel: String {
        var parts = [title]
        if minutes > 0 { parts.append(minutes == 1 ? "1 minute" : "\(minutes) minutes") }
        parts.append(match.canMake
                     ? "ready to cook"
                     : "have \(match.have.count) of \(match.requiredCount) ingredients")
        if !rescueNames.isEmpty {
            let names = rescueNames.prefix(2).joined(separator: ", ").lowercased()
            parts.append("uses \(names) before it goes bad")
        }
        return parts.joined(separator: ", ")
    }
}

// MARK: - List helpers

private extension View {
    /// A row with no card behind it: header, strip, card, chips and dashed placeholders.
    func planClearRow() -> some View {
        self.listRowInsets(EdgeInsets(top: Theme.Space.xxs, leading: 0, bottom: Theme.Space.xxs, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}
