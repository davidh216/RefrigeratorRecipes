import SwiftUI
import SwiftData
import FridgeCore

/// The weekly two-minute check-in: confirm what's still in the kitchen, one card at a time.
/// Each item is a crate-colored card with a kitchen-timer dial. An answer stamps the card
/// and sends it off in its own direction (DESIGN.md §8.8).
struct CheckInView: View {
    enum Answer { case kept, used, tossed }

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Query private var pantry: [PantryItem]
    @Query(filter: #Predicate<ShoppingItem> { !$0.isChecked }) private var shopping: [ShoppingItem]
    @Query private var events: [FoodEvent]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.lastCheckInAt) private var lastCheckInAt = SettingsDefault.lastCheckInAt
    /// Matches `CategoryTile`'s own scaling, so row separators line up with the text.
    @ScaledMetric(relativeTo: .body) private var tileScale: CGFloat = 1

    /// Captured once when the check-in starts so the order doesn't shift while answering.
    @State private var queue: [PantryItem] = []
    @State private var started = false
    @State private var position = 0
    @State private var answers: [PersistentIdentifier: Answer] = [:]
    @State private var showSummary = false
    /// Gone items the user wants on the shopping list.
    @State private var restock: Set<PersistentIdentifier> = []

    /// True for the 150 ms between an answer and the next card; blocks double taps.
    @State private var isAnswering = false
    /// The stamp on the card that was just answered, and which card it belongs to.
    @State private var stamp: Answer? = nil
    @State private var stampedID: PersistentIdentifier? = nil
    @State private var showCloseConfirm = false
    /// Drives the summary numbers counting up.
    @State private var statsShown = false

    /// Optional swipe: live translation (resets on its own, even if the gesture is cancelled)
    /// plus the offset a card was flung to when a swipe answered it.
    @GestureState(resetTransaction: Transaction(animation: Theme.Motion.snappy))
    private var dragTranslation: CGSize = .zero
    @State private var flungOffset: CGFloat = 0
    @State private var swipeArmed = false

    // Haptic triggers.
    @State private var keptTick = 0
    @State private var usedTick = 0
    @State private var tossedTick = 0
    @State private var swipeTick = 0
    @State private var savedTick = 0

    private static let swipeThreshold: CGFloat = 120

    private var current: PantryItem? { position < queue.count ? queue[position] : nil }

    var body: some View {
        NavigationStack {
            screen
                .navigationTitle("Weekly check-in")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { requestClose() }
                    }
                    if started, !queue.isEmpty, !showSummary, current != nil, !answers.isEmpty {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Finish") { finishEarly() }
                        }
                    }
                }
                .confirmationDialog("Stop the check-in?", isPresented: $showCloseConfirm, titleVisibility: .visible) {
                    Button("Save answers so far") { save() }
                    Button("Discard", role: .destructive) { dismiss() }
                    Button("Cancel", role: .cancel) {}
                }
        }
        .sheetChrome()
        .interactiveDismissDisabled(!answers.isEmpty)
        .sensoryFeedback(.selection, trigger: keptTick)
        .hapticImpact(.light, trigger: usedTick)
        .hapticImpact(.medium, trigger: tossedTick)
        .hapticImpact(.light, trigger: swipeTick)
        .hapticSuccess(trigger: savedTick)
        .onAppear(perform: start)
        .onChange(of: position) { _, _ in announceCurrent() }
    }

    @ViewBuilder
    private var screen: some View {
        if !started {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.Colors.canvas)
        } else if queue.isEmpty {
            ScrollView {
                EmptyStateView(
                    tiles: [.produce],
                    title: "All caught up",
                    message: "Nothing in your kitchen needs checking right now.",
                    actions: [EmptyAction(title: "Done", action: { finish() })]
                )
            }
            .scrollBounceBehavior(.basedOnSize)
            .background(Theme.Colors.canvas)
        } else if showSummary || current == nil {
            summary
        } else if let item = current {
            cardScreen(for: item)
        }
    }

    // MARK: - Card screen

    /// At accessibility sizes the answers scroll with the card instead of filling a bottom bar.
    @ViewBuilder
    private func cardScreen(for item: PantryItem) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            cardScroll(for: item, includesAnswers: true)
        } else {
            cardScroll(for: item, includesAnswers: false)
                .actionBar {
                    answerControls(for: item)
                }
        }
    }

    private func cardScroll(for item: PantryItem, includesAnswers: Bool) -> some View {
        VStack(spacing: 0) {
            progressHeader
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.vertical, Theme.Space.xs)
            GeometryReader { geo in
                ScrollView {
                    VStack(spacing: Theme.Space.xl) {
                        deck(for: item)
                        if includesAnswers {
                            answerControls(for: item)
                        }
                    }
                    .padding(.horizontal, Theme.Space.gutter)
                    .padding(.top, Theme.Space.xs)
                    .padding(.bottom, Theme.Space.xl)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height, alignment: includesAnswers ? .top : .center)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
        }
        .background(Theme.Colors.canvas)
    }

    // MARK: Progress

    private var progressHeader: some View {
        let shown = min(position + 1, queue.count)
        return HStack(spacing: 10) {
            progressTrack
            Text("\(shown) of \(queue.count)")
                .font(Theme.Fonts.tag)
                .foregroundStyle(Theme.Colors.text2)
                .contentTransition(.numericText())
                .fixedSize()
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Item \(shown) of \(queue.count)")
    }

    /// One 4pt segment per item, colored by its answer; a plain bar past 20 items.
    @ViewBuilder
    private var progressTrack: some View {
        if queue.count <= 20 {
            HStack(spacing: 3) {
                ForEach(queue.indices, id: \.self) { index in
                    Capsule()
                        .fill(segmentColor(at: index))
                        .frame(height: 4)
                }
            }
        } else {
            ProgressView(value: Double(position), total: Double(queue.count))
                .tint(Theme.Colors.plum)
        }
    }

    private func segmentColor(at index: Int) -> Color {
        if index == position { return Theme.Colors.plum }
        switch answers[queue[index].persistentModelID] {
        case .some(.kept): return Theme.Colors.fresh
        case .some(.used): return Theme.Colors.text2
        case .some(.tossed): return Theme.Colors.today
        case .none: return Theme.Colors.fillStrong
        }
    }

    // MARK: Deck

    /// The current card over peeks of the next two items' crates.
    private func deck(for item: PantryItem) -> some View {
        let isStamped = stampedID == item.persistentModelID
        let offset = liveOffset
        return ZStack {
            checkInCard(for: item)
                .offset(x: offset)
                .rotationEffect(.degrees(reduceMotion ? 0 : Double(offset / 20)), anchor: .bottom)
                .simultaneousGesture(swipeGesture(for: item),
                                     including: dynamicTypeSize.isAccessibilitySize ? .subviews : .all)
                // The answered card stays on top while it leaves.
                .zIndex(isStamped ? 1 : 0)
                .id(item.persistentModelID)
                .transition(cardTransition(for: item))
        }
        .background(alignment: .bottom) {
            deckPeeks
        }
        .padding(.bottom, 20)
    }

    private var deckPeeks: some View {
        let upcoming = Array(queue.dropFirst(position + 1).prefix(2)).map(\.foodCategory)
        return ZStack(alignment: .bottom) {
            if upcoming.count > 1 {
                peek(upcoming[1], scale: 0.90, offset: 20, opacity: 0.75)
            }
            if let next = upcoming.first {
                peek(next, scale: 0.95, offset: 10, opacity: 0.9)
            }
        }
        .accessibilityHidden(true)
    }

    private func peek(_ category: FoodCategory, scale: CGFloat, offset: CGFloat, opacity: Double) -> some View {
        RoundedRectangle(cornerRadius: Theme.Radius.deck, style: .continuous)
            .fill(category.palette.fill)
            .opacity(opacity)
            .scaleEffect(scale, anchor: .bottom)
            .offset(y: offset)
    }

    private func cardTransition(for item: PantryItem) -> AnyTransition {
        let insertion = AnyTransition.scale(scale: 0.95).combined(with: .opacity)
        let removal: AnyTransition
        if let edge = exitEdge(for: item) {
            removal = AnyTransition.move(edge: edge).combined(with: .opacity)
        } else {
            removal = AnyTransition.opacity
        }
        return AnyTransition.reducible(.asymmetric(insertion: insertion, removal: removal), reduceMotion: reduceMotion)
    }

    /// Kept leaves right, used goes up into the pot, tossed goes left. Skip and Undo just fade.
    private func exitEdge(for item: PantryItem) -> Edge? {
        switch stampAnswer(for: item) {
        case .some(.kept): return .trailing
        case .some(.used): return .top
        case .some(.tossed): return .leading
        case .none: return nil
        }
    }

    private func stampAnswer(for item: PantryItem) -> Answer? {
        stampedID == item.persistentModelID ? stamp : nil
    }

    // MARK: Card

    private func checkInCard(for item: PantryItem) -> some View {
        let status = item.expiryStatus(soonThresholdDays: soonDays)
        return VStack(alignment: .leading, spacing: 14) {
            Label(item.location.title, systemImage: item.location.glyph)
                .eyebrowStyle()
            Text(item.name)
                .font(Theme.Fonts.display)
                .fixedSize(horizontal: false, vertical: true)
            quantityLine(for: item)
            dialRow(for: item, status: status)
            Text(confirmedText(for: item))
                .font(Theme.Fonts.footnote)
                .fixedSize(horizontal: false, vertical: true)
        }
        .multilineTextAlignment(.leading)
        .padding(Theme.Space.deckPadding)
        .frame(maxWidth: .infinity, minHeight: 300, alignment: .topLeading)
        .crateBlock(item.foodCategory, radius: Theme.Radius.deck)
        .overlay {
            if colorSchemeContrast == .increased {
                RoundedRectangle(cornerRadius: Theme.Radius.deck, style: .continuous)
                    .strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .overlay(alignment: .topTrailing) {
            stampLayer(for: item)
                .padding(.top, 20)
                .padding(.trailing, 16)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spokenName(for: item, status: status))
        .accessibilityValue(spokenDetails(for: item))
        .accessibilityAction(named: "Still have it") { choose(.kept, for: item) }
        .accessibilityAction(named: "Used it") { choose(.used, for: item) }
        .accessibilityAction(named: "Tossed it") { choose(.tossed, for: item) }
        .accessibilityAction(named: "Undo") { undo() }
    }

    @ViewBuilder
    private func quantityLine(for item: PantryItem) -> some View {
        let value = QuantityFormatter.number(item.quantity)
        let unit = item.unit.trimmingCharacters(in: .whitespaces)
        if !value.isEmpty && !unit.isEmpty {
            Theme.numberText(value, unit: unit)
        } else if !value.isEmpty {
            Text(value)
                .font(Theme.Fonts.number)
        } else if !unit.isEmpty {
            Text(unit)
                .font(Theme.Fonts.detail)
        }
    }

    /// Dial beside the date sticker; the dial moves above once the text gets large.
    @ViewBuilder
    private func dialRow(for item: PantryItem, status: ExpiryStatus) -> some View {
        let dial = FreshnessDial(status: status, location: item.location, size: .large)
        let details = dialDetails(for: item, status: status)
        if dynamicTypeSize >= .xxLarge {
            VStack(alignment: .leading, spacing: 16) {
                dial
                details
            }
        } else {
            HStack(alignment: .center, spacing: 16) {
                dial
                details
            }
        }
    }

    private func dialDetails(for item: PantryItem, status: ExpiryStatus) -> some View {
        let tone = status.tone(inFreezer: item.inFreezer)
        let hasTone = tone != FreshTone.none
        return VStack(alignment: .leading, spacing: 8) {
            Sticker(status.shortLabel,
                    tone: hasTone ? tone : nil,
                    systemImage: hasTone ? nil : FreshTone.none.symbol,
                    rotation: .degrees(-3))
                .minimumScaleFactor(0.75)
            Text(addedText(for: item))
                .font(Theme.Fonts.footnote)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: Stamp

    /// The committed stamp pops in; while swiping, a preview fades in with distance.
    @ViewBuilder
    private func stampLayer(for item: PantryItem) -> some View {
        if let committed = stampAnswer(for: item) {
            CheckInStamp(answer: committed)
                .transition(AnyTransition.reducible(AnyTransition.scale(scale: 1.3).combined(with: .opacity),
                                                    reduceMotion: reduceMotion))
        } else if liveOffset != 0 {
            CheckInStamp(answer: liveOffset > 0 ? .kept : .used)
                .opacity(min(1, Double(abs(liveOffset) / Self.swipeThreshold)))
        }
    }

    // MARK: Answers

    private func answerControls(for item: PantryItem) -> some View {
        VStack(spacing: 10) {
            Button {
                choose(.kept, for: item)
            } label: {
                Label("Still have it", systemImage: "checkmark")
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))

            usedTossedRow(for: item)

            HStack {
                Button {
                    undo()
                } label: {
                    Label("Undo", systemImage: "arrow.uturn.backward")
                }
                .buttonStyle(QuietButtonStyle())
                .disabled(position == 0)

                Spacer(minLength: 8)

                Button {
                    skip()
                } label: {
                    HStack(spacing: 6) {
                        Text("Skip")
                        Image(systemName: "forward.end")
                            .imageScale(.small)
                    }
                }
                .buttonStyle(QuietButtonStyle())
                .accessibilityLabel("Skip")
            }
        }
        // Blocks double taps during the stamp without greying the buttons out.
        .allowsHitTesting(!isAnswering)
    }

    @ViewBuilder
    private func usedTossedRow(for item: PantryItem) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(spacing: 10) {
                usedButton(for: item)
                tossedButton(for: item)
            }
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    usedButton(for: item)
                    tossedButton(for: item)
                }
                VStack(spacing: 10) {
                    usedButton(for: item)
                    tossedButton(for: item)
                }
            }
        }
    }

    private func usedButton(for item: PantryItem) -> some View {
        Button {
            choose(.used, for: item)
        } label: {
            Label("Used it", systemImage: "fork.knife")
        }
        .buttonStyle(NeutralButtonStyle(fullWidth: true))
    }

    private func tossedButton(for item: PantryItem) -> some View {
        Button {
            choose(.tossed, for: item)
        } label: {
            Label("Tossed it", systemImage: "trash")
        }
        .buttonStyle(DestructiveSoftButtonStyle(fullWidth: true))
    }

    // MARK: Swipe (optional; tossing stays button-only so waste is never logged by accident)

    private var liveOffset: CGFloat {
        let t = dragTranslation
        guard !isAnswering, abs(t.width) > abs(t.height) else { return flungOffset }
        return flungOffset + t.width
    }

    private func swipeGesture(for item: PantryItem) -> some Gesture {
        DragGesture(minimumDistance: 20)
            .updating($dragTranslation) { value, state, _ in
                state = value.translation
            }
            .onChanged { value in
                let t = value.translation
                let armed = !isAnswering && abs(t.width) > abs(t.height) && abs(t.width) >= Self.swipeThreshold
                if armed != swipeArmed {
                    swipeArmed = armed
                    if armed { swipeTick += 1 }
                }
            }
            .onEnded { value in
                swipeArmed = false
                let t = value.translation
                guard abs(t.width) > abs(t.height) else { return }
                if t.width >= Self.swipeThreshold {
                    choose(.kept, for: item, flungTo: t.width)
                } else if t.width <= -Self.swipeThreshold {
                    choose(.used, for: item, flungTo: t.width)
                }
            }
    }

    // MARK: Copy

    private func addedText(for item: PantryItem) -> String {
        "Added " + Self.daysAgo(item.addedAt)
    }

    private func confirmedText(for item: PantryItem) -> String {
        guard let confirmed = item.lastConfirmedAt else { return String(localized: "Never confirmed") }
        return String(localized: "Last confirmed \(Self.daysAgo(confirmed))")
    }

    /// "today", "yesterday", "3 days ago", "2 weeks ago", "3 months ago", by calendar day.
    private static func daysAgo(_ date: Date) -> String {
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: .now)).day ?? 0
        if days <= 0 { return "today" }
        if days == 1 { return "yesterday" }
        if days < 14 { return "\(days) days ago" }
        if days < 60 { return "\(days / 7) weeks ago" }
        return "\(days / 30) months ago"
    }

    /// "Chicken breast, Expires today"
    private func spokenName(for item: PantryItem, status: ExpiryStatus) -> String {
        item.name + ", " + status.spokenLabel(inFreezer: item.inFreezer)
    }

    private func spokenDetails(for item: PantryItem) -> String {
        let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
        return [qty, item.location.title, addedText(for: item), confirmedText(for: item)]
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    // MARK: - Summary

    private var goneItems: [PantryItem] {
        queue.filter { answers[$0.persistentModelID] == .used || answers[$0.persistentModelID] == .tossed }
    }

    private var summary: some View {
        let kept = queue.filter { answers[$0.persistentModelID] == .kept }.count
        let used = queue.filter { answers[$0.persistentModelID] == .used }
        let tossed = queue.filter { answers[$0.persistentModelID] == .tossed }
        let tossedValue = tossed.compactMap(\.price).reduce(0, +)
        let monthStart = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
        let usedOutcomes: [FoodOutcome] = used.map { _ in FoodOutcome(kind: .used, date: Date.now) }
        let tossedOutcomes: [FoodOutcome] = tossed.map { item in FoodOutcome(kind: .tossed, date: Date.now, value: item.price) }
        let pending: [FoodOutcome] = usedOutcomes + tossedOutcomes
        let month = WasteSummary.summarize(events.map(\.outcome) + pending, since: monthStart)
        let currency = Locale.current.currency?.identifier ?? "USD"
        let tossedMoney: String? = tossedValue > 0 ? tossedValue.formatted(.currency(code: currency)) : nil
        let gone = goneItems

        return ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                Text("Check-in done")
                    .font(Theme.Fonts.titleHeavy)
                    .foregroundStyle(Theme.Colors.ink)
                    .accessibilityAddTraits(.isHeader)

                statTiles(kept: kept, used: used.count, tossed: tossed.count, tossedMoney: tossedMoney)

                if let rate = month.wasteRate {
                    wasteLine(month: month, rate: rate, currency: currency)
                }

                if !gone.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        SectionHeader("Buy again?", count: gone.count)
                        VStack(spacing: 0) {
                            ForEach(gone) { item in
                                if item.persistentModelID != gone.first?.persistentModelID {
                                    rowSeparator
                                }
                                restockRow(for: item)
                            }
                        }
                        .surfaceCard(padding: 0)
                    }
                }
            }
            .padding(.horizontal, Theme.Space.gutter)
            .padding(.top, Theme.Space.xs)
            .padding(.bottom, Theme.Space.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollBounceBehavior(.basedOnSize)
        .background(Theme.Colors.canvas)
        .onAppear(perform: revealStats)
        .actionBar {
            Button {
                save()
            } label: {
                Label("Save check-in", systemImage: "checkmark")
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
        }
    }

    @ViewBuilder
    private func statTiles(kept: Int, used: Int, tossed: Int, tossedMoney: String?) -> some View {
        let tossedSpoken: String = tossedMoney.map { money in "\(tossed) tossed, \(money)" } ?? "\(tossed) tossed"
        if dynamicTypeSize.isAccessibilitySize {
            VStack(spacing: 8) {
                statTile(kept, label: "Still here", fill: Theme.Colors.freshSoft,
                         numberColor: Theme.Colors.fresh, spoken: "\(kept) still here")
                statTile(used, label: "Used", fill: Theme.Colors.fill,
                         numberColor: Theme.Colors.ink, spoken: "\(used) used")
                statTile(tossed, label: "Tossed", extra: tossedMoney, fill: Theme.Colors.todaySoft,
                         numberColor: Theme.Colors.todayText, spoken: tossedSpoken)
            }
        } else {
            HStack(spacing: 8) {
                statTile(kept, label: "Still here", fill: Theme.Colors.freshSoft,
                         numberColor: Theme.Colors.fresh, spoken: "\(kept) still here")
                statTile(used, label: "Used", fill: Theme.Colors.fill,
                         numberColor: Theme.Colors.ink, spoken: "\(used) used")
                statTile(tossed, label: "Tossed", extra: tossedMoney, fill: Theme.Colors.todaySoft,
                         numberColor: Theme.Colors.todayText, spoken: tossedSpoken)
            }
            // Equal heights: every tile stretches to the tallest.
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func statTile(_ value: Int, label: String, extra: String? = nil, fill: Color,
                          numberColor: Color, spoken: String) -> some View {
        let shown = statsShown ? value : 0
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        return VStack(alignment: .leading, spacing: 6) {
            Text("\(shown)")
                .font(Theme.Fonts.displayNumber)
                .foregroundStyle(numberColor)
                .contentTransition(.numericText(value: Double(shown)))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text(label)
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.ink)
                .fixedSize(horizontal: false, vertical: true)
            if let extra = extra {
                Text(extra)
                    .font(Theme.Fonts.tag)
                    .foregroundStyle(Theme.Colors.todayText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .padding(Theme.Space.cardPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(fill, in: shape)
        .overlay {
            if colorSchemeContrast == .increased {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken)
    }

    /// "Last 30 days: 3 of 21 tossed · 14% · about $9" over a used/tossed split bar.
    private func wasteLine(month: WasteSummary, rate: Double, currency: String) -> some View {
        let total = month.usedCount + month.tossedCount
        var text = "Last 30 days: \(month.tossedCount) of \(total) tossed · \(rate.formatted(.percent.precision(.fractionLength(0))))"
        if month.tossedValue >= 1 {
            text += " · about \(month.tossedValue.formatted(.currency(code: currency).precision(.fractionLength(0))))"
        }
        return VStack(alignment: .leading, spacing: 8) {
            Text(text)
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
            WasteBar(used: month.usedCount, tossed: month.tossedCount)
        }
    }

    private func restockRow(for item: PantryItem) -> some View {
        let id = item.persistentModelID
        let onList = shopping.contains { IngredientName.matches($0.name, item.name) }
        let spoken: String = onList ? item.name + ", already on your list" : "Buy " + item.name + " again"
        return Toggle(isOn: Binding(
            get: { !onList && restock.contains(id) },
            set: { if $0 { restock.insert(id) } else { restock.remove(id) } }
        )) {
            HStack(spacing: 12) {
                CategoryTile(item.foodCategory, size: .row, style: .soft)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(Theme.Fonts.rowTitle)
                        .foregroundStyle(onList ? Theme.Colors.text2 : Theme.Colors.ink)
                        .lineLimit(2)
                    if onList {
                        Text("Already on your list")
                            .font(Theme.Fonts.footnote)
                            .foregroundStyle(Theme.Colors.text2)
                    }
                }
            }
        }
        .tint(Theme.Colors.plum)
        .disabled(onList)
        .padding(.horizontal, Theme.Space.m)
        .padding(.vertical, Theme.Space.xs)
        .frame(minHeight: Theme.Metrics.foodRowMin)
        .accessibilityLabel(spoken)
    }

    /// Hairline aligned with the row text, not the tile.
    private var rowSeparator: some View {
        Rectangle()
            .fill(Theme.Colors.separator)
            .frame(height: 0.5)
            .padding(.leading, Theme.Space.m + 40 * min(tileScale, 1.5) + Theme.Space.s)
    }

    // MARK: - Actions

    private func start() {
        guard !started else { return }
        let candidates = pantry.map(\.checkInCandidate)
        queue = CheckIn.queue(candidates, soonThresholdDays: soonDays).map { pantry[$0] }
        started = true
        announceCurrent()
    }

    /// The answer sequence: stamp and haptic now, then record and advance 150 ms later.
    private func choose(_ answer: Answer, for item: PantryItem, flungTo offset: CGFloat = 0) {
        guard !isAnswering, let now = current, now.persistentModelID == item.persistentModelID else { return }
        isAnswering = true
        flungOffset = offset
        withAnimation(Theme.Motion.adaptive(Theme.Motion.bouncy, reduceMotion: reduceMotion)) {
            stamp = answer
            stampedID = item.persistentModelID
        }
        switch answer {
        case .kept: keptTick += 1
        case .used: usedTick += 1
        case .tossed: tossedTick += 1
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(150))
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                flungOffset = 0
                record(answer, item)
            }
            isAnswering = false
        }
    }

    private func record(_ answer: Answer, _ item: PantryItem) {
        answers[item.persistentModelID] = answer
        if answer == .used { restock.insert(item.persistentModelID) } else { restock.remove(item.persistentModelID) }
        advance()
    }

    private func advance() {
        position += 1
        if position >= queue.count { showSummary = true }
    }

    private func skip() {
        guard !isAnswering, current != nil else { return }
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            flungOffset = 0
            advance()
        }
    }

    private func undo() {
        guard position > 0, !isAnswering else { return }
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            stamp = nil
            stampedID = nil
            flungOffset = 0
            showSummary = false
            position -= 1
            answers[queue[position].persistentModelID] = nil
        }
    }

    private func finishEarly() {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            showSummary = true
        }
    }

    private func requestClose() {
        if answers.isEmpty {
            dismiss()
        } else {
            showCloseConfirm = true
        }
    }

    private func revealStats() {
        guard !statsShown else { return }
        if reduceMotion {
            statsShown = true
        } else {
            withAnimation(Theme.Motion.smooth.delay(0.15)) {
                statsShown = true
            }
        }
    }

    private func announceCurrent() {
        guard !showSummary, let item = current else { return }
        let status = item.expiryStatus(soonThresholdDays: soonDays)
        let message = spokenName(for: item, status: status)
        AccessibilityNotification.Announcement(message).post()
    }

    private func save() {
        savedTick += 1
        finish()
    }

    /// Answers are applied only here, so Discard throws away a half-done check-in.
    private func finish() {
        let now = Date.now
        let listed = shopping.map(\.name)
        for item in queue {
            switch answers[item.persistentModelID] {
            case .kept:
                item.lastConfirmedAt = now
            case .used, .tossed:
                let kind = answers[item.persistentModelID] == .tossed ? "tossed" : "used"
                context.insert(FoodEvent(kind: kind, item: item, date: now))
                if restock.contains(item.persistentModelID), !listed.contains(where: { IngredientName.matches($0, item.name) }) {
                    context.insert(ShoppingItem(name: item.name, reason: kind == "tossed" ? "Tossed" : "Used up"))
                }
                context.delete(item)
            case nil:
                break
            }
        }
        lastCheckInAt = now.timeIntervalSince1970
        dismiss()
    }
}

// MARK: - Stamp

/// "STILL HERE" / "USED" / "TOSSED", pressed onto the card at an angle. Decorative:
/// VoiceOver hears the answer through the buttons and the next card's announcement.
private struct CheckInStamp: View {
    let answer: CheckInView.Answer

    var body: some View {
        Text(title)
            .font(Theme.Fonts.section)
            .tracking(0.8)
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(Theme.Colors.surface, in: Capsule())
            .overlay {
                Capsule().strokeBorder(color, lineWidth: 3)
            }
            .shadow(color: Theme.Colors.stickerShadow, radius: 1.5, x: 0, y: 1)
            .rotationEffect(.degrees(-8))
            .accessibilityHidden(true)
    }

    private var title: String {
        switch answer {
        case .kept: return String(localized: "STILL HERE")
        case .used: return String(localized: "USED")
        case .tossed: return String(localized: "TOSSED")
        }
    }

    private var color: Color {
        switch answer {
        case .kept: return Theme.Colors.fresh
        case .used: return Theme.Colors.ink
        case .tossed: return Theme.Colors.todayText
        }
    }
}

// MARK: - Waste bar

/// A 6pt capsule split between used (fresh) and tossed (tomato). Decorative; the line above says it.
private struct WasteBar: View {
    let used: Int
    let tossed: Int

    var body: some View {
        GeometryReader { geo in
            let total = CGFloat(max(used + tossed, 1))
            let gap: CGFloat = (used > 0 && tossed > 0) ? 2 : 0
            let width = max(geo.size.width - gap, 0)
            HStack(spacing: gap) {
                if used > 0 {
                    Rectangle()
                        .fill(Theme.Colors.fresh)
                        .frame(width: width * CGFloat(used) / total)
                }
                if tossed > 0 {
                    Rectangle()
                        .fill(Theme.Colors.today)
                        .frame(width: width * CGFloat(tossed) / total)
                }
            }
        }
        .frame(height: 6)
        .clipShape(Capsule())
        .accessibilityHidden(true)
    }
}
