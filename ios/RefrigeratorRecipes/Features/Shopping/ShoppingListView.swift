import SwiftUI
import SwiftData
import FridgeCore

/// The shopping list, grouped by aisle (DESIGN.md §8.15). Checked items wait a beat,
/// then move to "In the basket", and the action bar puts them away in the Fridge.
struct ShoppingListView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \ShoppingItem.addedAt) private var items: [ShoppingItem]
    @State private var newItem = ""
    @FocusState private var addFieldFocused: Bool
    @ObservedObject private var router = AppRouter.shared
    @State private var showReceiptScan = false
    /// Rows that were just checked. Each waits 0.35 s before moving to the basket;
    /// unchecking within that window cancels its task.
    @State private var pendingMoves: [PersistentIdentifier: Task<Void, Never>] = [:]
    /// Bumped on every insert from the add row, for the light impact haptic.
    @State private var addedTick = 0
    /// Bumped when "Put checked items away" runs from the menu, for the success haptic.
    @State private var menuPutAwayTick = 0
    /// Keeps the action bar up while its "4 in your Fridge" confirmation shows.
    @State private var holdsBasketBar = false
    @State private var lastPutAwayCount = 0

    @ScaledMetric(relativeTo: .body) private var addTileSide: CGFloat = 40

    /// Guarded: a missing symbol renders blank with no build error (§5.1).
    private static let basketSymbol = Theme.symbol("basket", fallback: "cart")
    private static let basketDelay: Duration = .milliseconds(350)

    private var toBuy: [ShoppingItem] { items.filter { !$0.isChecked } }
    private var inCart: [ShoppingItem] { items.filter(\.isChecked) }

    private var shareText: String {
        toBuy.map { item in
            let qty = item.displayQuantity
            return "• " + item.name + (qty.isEmpty ? "" : " (\(qty))")
        }.joined(separator: "\n")
    }

    private var showsBasketBar: Bool {
        !inCart.isEmpty || holdsBasketBar
    }

    private struct AisleGroup: Identifiable {
        let category: FoodCategory
        let items: [ShoppingItem]
        var id: FoodCategory { category }
    }

    /// Items to buy, grouped by `FoodCategory.guess` in `FoodCategory.aisleOrder`.
    private var aisleGroups: [AisleGroup] {
        var byCategory: [FoodCategory: [ShoppingItem]] = [:]
        for item in toBuy {
            byCategory[FoodCategory.guess(category: "", name: item.name), default: []].append(item)
        }
        return FoodCategory.aisleOrder.compactMap { (category: FoodCategory) -> AisleGroup? in
            guard let list = byCategory[category], !list.isEmpty else { return nil }
            return AisleGroup(category: category, items: list)
        }
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            shoppingList
                .navigationTitle("Shopping")
                .sheet(isPresented: $showReceiptScan) { ReceiptScanView() }
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        if !toBuy.isEmpty {
                            ShareLink(item: shareText) { Image(systemName: "square.and.arrow.up") }
                                .accessibilityLabel("Share")
                        }
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button { showReceiptScan = true } label: {
                                Label("Scan receipt", systemImage: "doc.text.viewfinder")
                            }
                            Button { putAwayFromMenu() } label: {
                                Label("Put checked items away", systemImage: "refrigerator.fill")
                            }
                            .disabled(inCart.isEmpty)
                            Button(role: .destructive) { clearChecked() } label: {
                                Label("Clear checked", systemImage: "trash")
                            }
                            .disabled(inCart.isEmpty)
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                        .accessibilityLabel("More")
                    }
                }
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    if showsBasketBar {
                        basketBar
                            .transition(AnyTransition.reducible(.move(edge: .bottom).combined(with: .opacity),
                                                                reduceMotion: reduceMotion))
                    }
                }
                .motionAnimation(Theme.Motion.smooth, value: showsBasketBar)
                .hapticImpact(.light, trigger: addedTick)
                .hapticSuccess(trigger: menuPutAwayTick)
                // The "Add to shopping list" quick action: wait for the tab switch to settle, then focus.
                .task(id: router.shoppingAddRequested) {
                    guard router.shoppingAddRequested else { return }
                    try? await Task.sleep(for: .milliseconds(400))
                    guard !Task.isCancelled else { return }
                    addFieldFocused = true
                    router.shoppingAddRequested = false
                }
                .task(id: holdsBasketBar) {
                    guard holdsBasketBar else { return }
                    try? await Task.sleep(for: .seconds(1.8))
                    guard !Task.isCancelled else { return }
                    holdsBasketBar = false
                }
        }
    }

    private var shoppingList: some View {
        List {
            Section {
                addRow
            }

            if items.isEmpty {
                Section {
                    emptyState
                        .shopClearRow()
                }
            } else {
                ForEach(aisleGroups) { group in
                    Section {
                        ForEach(group.items) { item in
                            row(item)
                        }
                    } header: {
                        SectionHeader(group.category.title, count: group.items.count, tile: group.category)
                    }
                }

                if !inCart.isEmpty {
                    Section {
                        ForEach(inCart) { item in
                            row(item)
                        }
                    } header: {
                        SectionHeader("In the basket", count: inCart.count, systemImage: Self.basketSymbol)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .listChrome()
    }

    // MARK: - Add row

    private var addRow: some View {
        let trimmed = newItem.trimmingCharacters(in: .whitespaces)
        let guess = FoodCategory.guess(category: "", name: trimmed)
        let shownGuess: FoodCategory? = (!trimmed.isEmpty && guess != .other) ? guess : nil
        let side = min(addTileSide, 56)
        return HStack(spacing: Theme.Space.s) {
            Button { submitOrFocus() } label: {
                Image(systemName: "plus")
                    .font(.body.weight(.bold))
                    .foregroundStyle(Theme.Colors.onBeet)
                    .frame(width: side, height: side)
                    .background(Theme.Colors.beet,
                                in: RoundedRectangle(cornerRadius: Theme.Radius.tile, style: .continuous))
                    .frame(minWidth: Theme.Metrics.minTap, minHeight: Theme.Metrics.minTap)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Add item")

            TextField("Add an item", text: $newItem)
                .font(Theme.Fonts.body)
                .foregroundStyle(Theme.Colors.ink)
                .focused($addFieldFocused)
                .submitLabel(.done)
                .onSubmit(addItem)

            if let shownGuess {
                // Shows which aisle the item will land in.
                CategoryTile(shownGuess, size: .small, style: .soft)
                    .transition(AnyTransition.reducible(.scale(scale: 0.6).combined(with: .opacity),
                                                        reduceMotion: reduceMotion))
            }
        }
        .frame(minHeight: Theme.Metrics.shoppingRowMin)
        .motionAnimation(Theme.Motion.snappy, value: shownGuess)
        .listRowInsets(EdgeInsets(top: 0, leading: Theme.Space.xxs, bottom: 0, trailing: Theme.Space.m))
        .listRowBackground(Theme.Colors.surface)
    }

    // MARK: - Rows

    private func isOn(_ item: ShoppingItem) -> Bool {
        item.isChecked || pendingMoves[item.persistentModelID] != nil
    }

    private func checkBinding(for item: ShoppingItem) -> Binding<Bool> {
        Binding(
            get: { isOn(item) },
            set: { newValue in setChecked(item, newValue) }
        )
    }

    private func row(_ item: ShoppingItem) -> some View {
        let checked = isOn(item)
        let reason = Self.displayReason(item.reason)
        let qty = item.displayQuantity
        return HStack(spacing: Theme.Space.s) {
            CheckToggle(isOn: checkBinding(for: item), accessibilityLabel: "Bought \(item.name)")
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .strikethrough(checked, color: Theme.Colors.text2)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(checked ? Theme.Colors.text2 : Theme.Colors.ink)
                if let reason {
                    Text(reason)
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.text2)
                        .lineLimit(2)
                }
            }
            .multilineTextAlignment(.leading)
            .padding(.vertical, 6)
            .alignmentGuide(.listRowSeparatorLeading) { d in d[.leading] }
            Spacer(minLength: Theme.Space.xs)
            if !qty.isEmpty {
                Text(qty)
                    .font(Theme.Fonts.tag)
                    .foregroundStyle(Theme.Colors.text2)
            }
        }
        .frame(minHeight: Theme.Metrics.shoppingRowMin)
        .contentShape(Rectangle())
        .onTapGesture { toggle(item) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spokenLabel(item, reason: reason, qty: qty))
        .accessibilityValue(checked ? "On" : "Off")
        .accessibilityAddTraits(.isToggle)
        .accessibilityAction { toggle(item) }
        .listRowInsets(EdgeInsets(top: 0, leading: Theme.Space.xxs, bottom: 0, trailing: Theme.Space.m))
        .listRowBackground(Theme.Colors.surface)
        .listRowSeparatorTint(Theme.Colors.separator)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { delete(item) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    /// "Bought Milk, 1 gal, For Pancakes"
    private func spokenLabel(_ item: ShoppingItem, reason: String?, qty: String) -> String {
        var parts = ["Bought \(item.name)"]
        if !qty.isEmpty { parts.append(qty) }
        if let reason { parts.append(reason) }
        return parts.joined(separator: ", ")
    }

    /// Recipe lists read "For Pancakes, French Toast"; "Used up", "Tossed" and "Used in …" stay as written.
    private static func displayReason(_ raw: String) -> String? {
        let reason = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if reason.isEmpty { return nil }
        if reason == "Used up" || reason == "Tossed" || reason.hasPrefix("Used in ") || reason.hasPrefix("For ") {
            return reason
        }
        return "For " + reason
    }

    // MARK: - Basket bar

    private var basketBar: some View {
        let count = inCart.isEmpty ? lastPutAwayCount : inCart.count
        return HStack(spacing: 10) {
            InlineConfirmButton("Put \(count) away in Fridge", systemImage: "refrigerator.fill",
                                kind: .primary, fullWidth: true) {
                let moved = moveCheckedToFridge()
                guard moved > 0 else { return nil }
                lastPutAwayCount = moved
                holdsBasketBar = true
                return "\(moved) in your Fridge"
            }
            Button { showReceiptScan = true } label: {
                Image(systemName: "doc.text.viewfinder")
            }
            .buttonStyle(IconCircleButtonStyle(.beetSoft, diameter: 50))
            .accessibilityLabel("Scan receipt instead")
        }
        .padding(.horizontal, Theme.Space.m)
        .padding(.top, 10)
        .padding(.bottom, Theme.Space.xs)
        .frame(maxWidth: .infinity)
        .background(.bar)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Theme.Colors.separator)
                .frame(height: 0.5)
        }
    }

    // MARK: - Empty

    private var emptyState: some View {
        EmptyStateView(
            tiles: [.condiments, .snacks, .beverages],
            title: "Nothing to buy",
            message: "Your list fills itself as you cook and plan.",
            actions: [
                EmptyAction(title: "Type it", step: "Type an item above", action: { addFieldFocused = true }),
                EmptyAction(title: "Recipes", step: "Add what a recipe is missing",
                            action: { AppRouter.shared.tab = .recipes }),
                EmptyAction(title: "Plan", step: "Shop for your week in Plan",
                            action: { AppRouter.shared.tab = .plan }),
            ]
        )
    }

    // MARK: - Actions

    private func submitOrFocus() {
        if newItem.trimmingCharacters(in: .whitespaces).isEmpty {
            addFieldFocused = true
        } else {
            addItem()
        }
    }

    private func addItem() {
        let name = newItem.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        context.insert(ShoppingItem(name: name))
        newItem = ""
        addFieldFocused = true
        addedTick += 1
    }

    /// Row tap: the same toggle as the check circle.
    private func toggle(_ item: ShoppingItem) {
        let next = !isOn(item)
        if reduceMotion {
            setChecked(item, next)
        } else {
            withAnimation(Theme.Motion.snappy) {
                setChecked(item, next)
            }
        }
    }

    /// Checking strikes the row through now and moves it to the basket after 0.35 s
    /// (at once under Reduce Motion). Unchecking a waiting row cancels the move.
    private func setChecked(_ item: ShoppingItem, _ checked: Bool) {
        let id = item.persistentModelID
        if checked {
            guard !item.isChecked, pendingMoves[id] == nil else { return }
            if reduceMotion {
                item.isChecked = true
                return
            }
            pendingMoves[id] = Task { @MainActor in
                try? await Task.sleep(for: Self.basketDelay)
                guard !Task.isCancelled else { return }
                withAnimation(Theme.Motion.smooth) {
                    if item.modelContext != nil {
                        item.isChecked = true
                    }
                    pendingMoves[id] = nil
                }
            }
        } else if let task = pendingMoves[id] {
            task.cancel()
            pendingMoves[id] = nil
        } else if item.isChecked {
            if reduceMotion {
                item.isChecked = false
            } else {
                withAnimation(Theme.Motion.smooth) {
                    item.isChecked = false
                }
            }
        }
    }

    private func delete(_ item: ShoppingItem) {
        let id = item.persistentModelID
        pendingMoves[id]?.cancel()
        pendingMoves[id] = nil
        context.delete(item)
    }

    private func clearChecked() {
        for item in inCart { context.delete(item) }
    }

    private func putAwayFromMenu() {
        let moved = moveCheckedToFridge()
        guard moved > 0 else { return }
        menuPutAwayTick += 1
        let message = "\(moved) in your Fridge"
        AccessibilityNotification.Announcement(message).post()
    }

    /// Bought items become pantry items; set expiry dates afterwards in the Fridge tab.
    /// - Returns: how many items were put away.
    @discardableResult
    private func moveCheckedToFridge() -> Int {
        let checked = inCart
        for item in checked {
            context.insert(PantryItem(name: item.name, quantity: item.quantity == 0 ? 1 : item.quantity, unit: item.unit))
            context.delete(item)
        }
        return checked.count
    }
}

private extension View {
    /// A row with no card behind it (the empty state).
    func shopClearRow() -> some View {
        self.listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}
