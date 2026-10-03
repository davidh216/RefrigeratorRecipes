import SwiftUI
import SwiftData
import FridgeCore

/// Chat with Claude about what to cook, grounded in the current kitchen.
struct ChefView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Query private var pantry: [PantryItem]
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var plan: [MealPlanEntry]
    @Query(sort: \HouseholdMember.createdAt) private var household: [HouseholdMember]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    /// 28pt glyph tiles and the chef avatar, scaled with Dynamic Type (capped).
    @ScaledMetric(relativeTo: .body) private var glyphTileSide: CGFloat = 28

    @State private var turns: [ClaudeClient.ChatTurn] = []
    @State private var input = ""
    @State private var isThinking = false
    @State private var errorMessage: String?
    @State private var retry: Retry?
    @State private var savingIndex: Int?
    @State private var savedRecipe: Recipe?
    /// Chat turn index → the recipe saved from it, so the button can read "Saved · Open".
    @State private var savedRecipeUUIDs: [Int: UUID] = [:]
    @State private var showSettings = false
    @State private var sendCount = 0
    @State private var hasKey = ClaudeClient.isAvailable
    @State private var showHandoff = false
    /// The last error means Fridge's own AI can't answer right now (out of requests, switched off).
    @State private var offerHandoff = false

    /// What "Try again" repeats after an error.
    enum Retry: Equatable {
        case send
        case save(text: String, index: Int)
    }

    /// A question to send as soon as the chef opens (e.g. from the Tonight screen).
    var initialPrompt: String? = nil
    /// A mood tag id to start with ("comfort-food"), e.g. the one picked on Tonight.
    var initialMood: String? = nil
    /// A cuisine id the chef cooks for ("persian"), from a cuisine page in Explore.
    var initialCuisine: String? = nil
    /// The mood the chef is cooking for; sent with every question and recipe.
    @State private var mood: String?
    @State private var appliedInitialMood = false
    /// Shows a Done button when presented as a sheet.
    var showsDone = false

    private static let suggestions: [ChefSuggestion] = [
        ChefSuggestion(text: "What can I make tonight with what I have?", systemImage: "fork.knife"),
        ChefSuggestion(text: "What should I cook first before it goes bad?", systemImage: "timer"),
        ChefSuggestion(text: "Plan three easy dinners for this week.", systemImage: "calendar"),
        ChefSuggestion(text: "Something quick, under 20 minutes.", systemImage: "bolt.fill"),
    ]

    private static let apiKeyURL = URL(string: "https://console.anthropic.com/settings/keys")

    /// Chat bubbles: 20pt corners with a 6pt tail corner (§8.16).
    private static let bubbleRadius: CGFloat = 20
    private static let bubbleTailRadius: CGFloat = 6
    private static let userBubbleShape = UnevenRoundedRectangle(
        topLeadingRadius: bubbleRadius, bottomLeadingRadius: bubbleRadius,
        bottomTrailingRadius: bubbleTailRadius, topTrailingRadius: bubbleRadius, style: .continuous)
    private static let chefBubbleShape = UnevenRoundedRectangle(
        topLeadingRadius: bubbleRadius, bottomLeadingRadius: bubbleTailRadius,
        bottomTrailingRadius: bubbleRadius, topTrailingRadius: bubbleRadius, style: .continuous)
    /// Keeps bubbles to roughly 85% of the width, leaving room on the opposite side.
    private static let bubbleInset: CGFloat = 48
    /// Prompt rows are at least 52pt tall.
    private static let promptMinHeight: CGFloat = 52

    var body: some View {
        NavigationStack {
            Group {
                if hasKey {
                    chat
                } else {
                    setupState
                }
            }
            .background(Theme.Colors.canvas)
            .navigationTitle("Chef")
            .task {
                if !appliedInitialMood {
                    appliedInitialMood = true
                    mood = initialMood
                }
                if let initialPrompt, hasKey, turns.isEmpty { send(initialPrompt) }
            }
            .onChange(of: hasKey) { _, nowHasKey in
                // A key was just added in Settings: ask the question the chef was opened with.
                if nowHasKey, let initialPrompt, turns.isEmpty { send(initialPrompt) }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if showsDone {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { dismiss() }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { showHandoff = true } label: {
                        Label("Ask another AI", systemImage: "arrow.up.forward.app")
                    }
                }
                if !turns.isEmpty {
                    ToolbarItem(placement: .primaryAction) {
                        Button("New chat") { startNewChat() }
                            .disabled(isThinking)
                    }
                }
            }
            .assistantHandoffDialog(isPresented: $showHandoff, prompt: { handoffPrompt }, openURL: openURL)
            .navigationDestination(item: $savedRecipe) { recipe in
                RecipeDetailView(recipe: recipe)
            }
            .sheet(isPresented: $showSettings, onDismiss: {
                hasKey = ClaudeClient.isAvailable
            }) {
                SettingsView()
            }
        }
        .sheetChrome()
    }

    // MARK: - No API key

    private var setupState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                EmptyStateView(
                    tiles: [.beverages],
                    title: "Set up your chef",
                    message: "The chef, photo scanning, and recipe import use Claude. Add your Anthropic API key in Settings to turn them on.",
                    actions: [
                        EmptyAction(title: "Get a key", step: "Create a key at console.anthropic.com", action: { openKeyConsole() }),
                        EmptyAction(title: "Open Settings", step: "Paste it in Settings", action: { showSettings = true }),
                    ]
                )
                Button { showHandoff = true } label: {
                    Label("Or ask ChatGPT or Claude instead", systemImage: "arrow.up.forward.app")
                }
                .buttonStyle(QuietButtonStyle(color: Theme.Colors.plumText))
                .padding(.horizontal, 24)
            }
        }
        .background(Theme.Colors.canvas)
    }

    private func openKeyConsole() {
        if let url = Self.apiKeyURL { openURL(url) }
    }

    // MARK: - Chat

    private var chat: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Theme.Space.stack) {
                    contextLine
                    if turns.isEmpty && !isThinking {
                        emptyConversation
                            .transition(.opacity)
                    }
                    ForEach(Array(turns.enumerated()), id: \.offset) { index, turn in
                        bubble(turn, index: index)
                            .transition(bubbleTransition)
                    }
                    if isThinking {
                        thinkingRow
                            .id("thinking")
                            .transition(.opacity)
                    }
                    if let errorMessage {
                        errorCard(errorMessage)
                            .transition(.opacity)
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.top, Theme.Space.s)
                .padding(.bottom, Theme.Space.m)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: turns.count) { _, _ in
                scrollToBottom(proxy)
            }
            .onChange(of: isThinking) { _, _ in
                scrollToBottom(proxy)
            }
            .onChange(of: errorMessage) { _, _ in
                scrollToBottom(proxy)
            }
        }
        .actionBar {
            composer
        }
    }

    private var bubbleTransition: AnyTransition {
        AnyTransition.reducible(.move(edge: .bottom).combined(with: .opacity), reduceMotion: reduceMotion)
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(motion(Theme.Motion.smooth)) {
            proxy.scrollTo("bottom", anchor: .bottom)
        }
    }

    // MARK: Context line

    /// What the chef is grounded in.
    private var contextLine: some View {
        let urgent = urgentItems.count
        let summary = String(localized: "Sees \(Self.items(pantry.count)) · \(urgent) to use soon · \(Self.recipes(recipes.count)) · \(plannedCount) planned")
        return Label {
            Text(summary)
                .fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: "sparkles")
                .foregroundStyle(Theme.Colors.plumText)
        }
        .font(Theme.Fonts.footnote)
        .foregroundStyle(Theme.Colors.text2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    // MARK: Empty conversation

    private var emptyConversation: some View {
        VStack(alignment: .leading, spacing: Theme.Space.l) {
            VStack(alignment: .leading, spacing: 6) {
                Text("What's for dinner?")
                    .font(Theme.Fonts.titleHeavy)
                    .foregroundStyle(Theme.Colors.ink)
                    .accessibilityAddTraits(.isHeader)
                Text("I can see your fridge, recipes, and meal plan.")
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            usingSoonRow
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                MoodChipRow(selection: $mood)
                if let mood, RecipeTag.tag(mood)?.isGentleMood == true {
                    GentleMoodFooter()
                }
            }
            VStack(spacing: Theme.Space.xs) {
                if let goalSuggestion {
                    promptRow(goalSuggestion)
                }
                ForEach(Self.suggestions) { suggestion in
                    promptRow(suggestion)
                }
            }
        }
        .padding(.top, Theme.Space.xs)
    }

    /// Up to 3 items to use soon; tapping one asks what to make with it.
    @ViewBuilder
    private var usingSoonRow: some View {
        let soon = Array(urgentItems.prefix(3))
        if !soon.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                Text("Using soon")
                    .font(Theme.Fonts.detailStrong)
                    .foregroundStyle(Theme.Colors.text2)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Space.xs) {
                        ForEach(soon) { entry in
                            usingSoonChip(entry)
                        }
                    }
                    .padding(.horizontal, Theme.Space.gutter)
                }
                .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
                .padding(.horizontal, -Theme.Space.gutter)
            }
        }
    }

    private func usingSoonChip(_ entry: ChefUrgentItem) -> some View {
        let item = entry.item
        let spoken = item.name + ", " + entry.status.spokenLabel(inFreezer: item.inFreezer).lowercased()
        return Button {
            send(Self.rescuePrompt(for: item.name))
        } label: {
            FoodChip(name: item.name, category: item.foodCategory, status: entry.status, location: item.location)
        }
        .buttonStyle(ChefPressStyle())
        .disabled(isThinking)
        .accessibilityLabel(spoken)
        .accessibilityHint("Asks the chef what to make with it")
    }

    private func promptRow(_ suggestion: ChefSuggestion) -> some View {
        let side = min(glyphTileSide, 40)
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous)
        return Button {
            send(suggestion.text)
        } label: {
            HStack(spacing: Theme.Space.s) {
                Image(systemName: suggestion.systemImage)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.Colors.plumText)
                    .frame(width: side, height: side)
                    .background(Theme.Colors.plumSoft, in: RoundedRectangle(cornerRadius: Theme.Radius.tileSmall, style: .continuous))
                    .accessibilityHidden(true)
                Text(suggestion.text)
                    .font(Theme.Fonts.body)
                    .foregroundStyle(Theme.Colors.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "arrow.up.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.Colors.text3)
                    .accessibilityHidden(true)
            }
            .frame(maxWidth: .infinity, minHeight: Self.promptMinHeight - 2 * Theme.Space.s, alignment: .leading)
            .surfaceCard(padding: Theme.Space.s, radius: Theme.Radius.input)
            .contentShape(shape)
        }
        .buttonStyle(ChefPressStyle())
        .disabled(isThinking)
        .accessibilityHint("Sends this to the chef")
    }

    // MARK: Bubbles

    @ViewBuilder
    private func bubble(_ turn: ClaudeClient.ChatTurn, index: Int) -> some View {
        if turn.role == .user {
            HStack(spacing: 0) {
                Spacer(minLength: Self.bubbleInset)
                Text(turn.text)
                    .font(Theme.Fonts.body)
                    .foregroundStyle(Theme.Colors.onPlum)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Theme.Colors.plum, in: Self.userBubbleShape)
                    .accessibilityLabel("You: \(turn.text)")
            }
        } else {
            chefTurn(turn, index: index)
        }
    }

    private func chefTurn(_ turn: ClaudeClient.ChatTurn, index: Int) -> some View {
        let text = Self.markdown(turn.text)
        return HStack(alignment: .top, spacing: Theme.Space.xs) {
            chefAvatar(pulsing: false)
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                Text(text)
                    .font(Theme.Fonts.body)
                    .foregroundStyle(Theme.Colors.ink)
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Theme.Colors.surface, in: Self.chefBubbleShape)
                    .overlay {
                        if colorSchemeContrast == .increased {
                            Self.chefBubbleShape.stroke(Theme.Colors.separator, lineWidth: 1)
                        }
                    }
                    .accessibilityLabel(Text("Chef: ") + Text(text))
                saveButton(for: turn, index: index)
            }
            Spacer(minLength: Theme.Space.l)
        }
    }

    /// 28pt plum-soft circle with sparkles. Decorative.
    private func chefAvatar(pulsing: Bool) -> some View {
        let side = min(glyphTileSide, 40)
        return Image(systemName: "sparkles")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Theme.Colors.plumText)
            .symbolEffect(.pulse, isActive: pulsing)
            .frame(width: side, height: side)
            .background(Theme.Colors.plumSoft, in: Circle())
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private func saveButton(for turn: ClaudeClient.ChatTurn, index: Int) -> some View {
        if let recipe = recipeSaved(from: index) {
            Button {
                savedRecipe = recipe
            } label: {
                Label("Saved · Open", systemImage: "checkmark")
            }
            .buttonStyle(SecondaryButtonStyle(size: .compact))
            .accessibilityLabel("Saved. Open the recipe")
        } else if savingIndex == index {
            Button {} label: {
                HStack(spacing: Theme.Space.xs) {
                    ProgressView()
                        .controlSize(.small)
                    Text("Saving…")
                }
            }
            .buttonStyle(SecondaryButtonStyle(size: .compact))
            .disabled(true)
            .accessibilityLabel("Saving recipe")
        } else {
            Button {
                Task { await saveRecipe(from: turn.text, index: index) }
            } label: {
                Label("Save as recipe", systemImage: "book.closed.fill")
            }
            .buttonStyle(SecondaryButtonStyle(size: .compact))
            .disabled(savingIndex != nil)
        }
    }

    /// The recipe saved from this turn, if it still exists.
    private func recipeSaved(from index: Int) -> Recipe? {
        guard let uuid = savedRecipeUUIDs[index] else { return nil }
        return recipes.first { $0.uuid == uuid }
    }

    // MARK: Thinking and errors

    private var thinkingRow: some View {
        HStack(alignment: .center, spacing: Theme.Space.xs) {
            chefAvatar(pulsing: !reduceMotion)
            HStack(spacing: 6) {
                if !reduceMotion {
                    Image(systemName: "ellipsis")
                        .symbolEffect(.variableColor.iterative, options: .repeating)
                        .accessibilityHidden(true)
                }
                Text("Thinking…")
            }
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Theme.Colors.surface, in: Self.chefBubbleShape)
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }

    private var canRetry: Bool {
        guard let retry, !isThinking, savingIndex == nil else { return false }
        switch retry {
        case .send:
            return !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .save:
            return true
        }
    }

    private func errorCard(_ message: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .accessibilityHidden(true)
            Text(message)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            if offerHandoff {
                Button("Ask another AI") { showHandoff = true }
                    .buttonStyle(QuietButtonStyle(color: Theme.Colors.todayText))
                    .padding(.vertical, -10)
            } else if canRetry {
                Button("Try again") { retryLastAction() }
                    .buttonStyle(QuietButtonStyle(color: Theme.Colors.todayText))
                    // Keeps the 44pt target without making the card taller.
                    .padding(.vertical, -10)
            }
        }
        .font(Theme.Fonts.detail)
        .foregroundStyle(Theme.Colors.todayText)
        .padding(.horizontal, Theme.Space.m)
        .padding(.vertical, 14)
        .background(Theme.Colors.todaySoft, in: RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
        .accessibilityElement(children: .contain)
    }

    private func retryLastAction() {
        guard let retry else { return }
        switch retry {
        case .send:
            send(input)
        case .save(let text, let index):
            Task { await saveRecipe(from: text, index: index) }
        }
    }

    // MARK: Composer

    private var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isThinking
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Ask the chef…", text: $input, axis: .vertical)
                .lineLimit(1...5)
                .font(Theme.Fonts.body)
                .foregroundStyle(Theme.Colors.ink)
                .padding(.horizontal, Theme.Space.m)
                .padding(.vertical, 11)
                .background(Theme.Colors.fill, in: RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
            Button {
                send(input)
            } label: {
                Image(systemName: "arrow.up")
            }
            .buttonStyle(IconCircleButtonStyle(.plum))
            .disabled(!canSend)
            .accessibilityLabel("Send")
        }
        .hapticImpact(.light, trigger: sendCount)
    }

    // MARK: - Data

    /// Pantry items that are `.expiringSoon`, fewest days first.
    private var urgentItems: [ChefUrgentItem] {
        pantry
            .compactMap { item -> ChefUrgentItem? in
                let status = item.expiryStatus(soonThresholdDays: soonDays)
                if case .expiringSoon(let days) = status {
                    return ChefUrgentItem(item: item, status: status, days: days)
                }
                return nil
            }
            .sorted { lhs, rhs in
                lhs.days != rhs.days ? lhs.days < rhs.days : lhs.item.name < rhs.item.name
            }
    }

    private var plannedCount: Int {
        let today = Calendar.current.startOfDay(for: .now)
        return plan.filter { $0.day >= today }.count
    }

    private static func items(_ count: Int) -> String {
        count == 1 ? String(localized: "1 item") : String(localized: "\(count) items")
    }

    private static func recipes(_ count: Int) -> String {
        count == 1 ? String(localized: "1 recipe") : String(localized: "\(count) recipes")
    }

    /// "A dinner around 650 kcal with 45 g protein…", when someone in the household has a goal.
    private var goalSuggestion: ChefSuggestion? {
        guard let daily = Household.averageDailyTarget(household) else { return nil }
        let share = UserDefaults.standard.object(forKey: SettingsKey.dinnerShare) as? Double ?? SettingsDefault.dinnerShare
        let dinner = NutritionTargets.perMeal(daily, meal: .dinner, split: MealSplit(dinner: share))
        let kcal = Int((dinner.kcal / 50).rounded() * 50)
        let protein = Int((dinner.protein / 5).rounded() * 5)
        let using = urgentItems.isEmpty ? "what I have" : "what's expiring"
        return ChefSuggestion(text: "A dinner around \(kcal) kcal with \(protein) g protein, using \(using).",
                              systemImage: "target")
    }

    private static func rescuePrompt(for name: String) -> String {
        "What can I make tonight with the \(name.lowercased()) before it goes bad?"
    }

    private static func markdown(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    }

    /// What goes to another AI app: the unsent question (or the last one asked) and the kitchen.
    private var handoffPrompt: String {
        let typed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        let lastAsked = turns.last(where: { $0.role == .user })?.text ?? ""
        return AssistantHandoff.prompt(question: typed.isEmpty ? lastAsked : typed, kitchenContext: kitchenContext)
    }

    private var kitchenContext: String {
        let prefs = KitchenPreferences.current
        return KitchenContext.render(
            pantry: pantry,
            recipes: recipes,
            plan: plan,
            staples: prefs.staples,
            soonThresholdDays: prefs.soonThresholdDays,
            household: household
        )
    }

    // MARK: - Actions

    private func motion(_ animation: Animation) -> Animation {
        Theme.Motion.adaptive(animation, reduceMotion: reduceMotion)
    }

    private func startNewChat() {
        withAnimation(motion(Theme.Motion.smooth)) {
            turns = []
            errorMessage = nil
            offerHandoff = false
            retry = nil
            savedRecipeUUIDs = [:]
        }
    }

    private func send(_ raw: String) {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isThinking else { return }
        input = ""
        sendCount += 1
        withAnimation(motion(Theme.Motion.smooth)) {
            errorMessage = nil
            offerHandoff = false
            retry = nil
            turns.append(.init(role: .user, text: text))
            isThinking = true
        }
        let history = turns
        let kitchen = kitchenContext
        let mood = mood
        let cuisine = initialCuisine
        Task {
            defer { isThinking = false }
            do {
                let reply = try await ClaudeClient.fromSettings().chat(history: history, kitchenContext: kitchen, mood: mood, cuisine: cuisine)
                withAnimation(motion(Theme.Motion.smooth)) {
                    turns.append(.init(role: .assistant, text: reply))
                    isThinking = false
                }
            } catch {
                withAnimation(motion(Theme.Motion.smooth)) {
                    // Drop the unanswered question so the conversation stays user/assistant alternating.
                    if turns.last?.role == .user { input = turns.removeLast().text }
                    errorMessage = error.localizedDescription
                    offerHandoff = Self.isOutOfAI(error)
                    retry = .send
                    isThinking = false
                }
            }
        }
    }

    /// Out of today's requests, or the shared AI isn't switched on: retrying won't help.
    private static func isOutOfAI(_ error: Error) -> Bool {
        if case .http(let code, _)? = error as? ClaudeClient.ClientError { return code == 429 || code == 503 }
        return false
    }

    private func saveRecipe(from text: String, index: Int) async {
        savingIndex = index
        errorMessage = nil
        offerHandoff = false
        retry = nil
        defer { savingIndex = nil }
        do {
            let request = "Turn the main dish described below into a complete recipe.\n\n" + text
            let generated = try await ClaudeClient.fromSettings().generateRecipe(request: request, kitchenContext: kitchenContext,
                                                                                 mood: mood, cuisine: initialCuisine)
            let recipe = Recipe.insert(from: generated, into: context)
            savedRecipeUUIDs[index] = recipe.uuid
            savedRecipe = recipe
        } catch {
            errorMessage = error.localizedDescription
            offerHandoff = Self.isOutOfAI(error)
            retry = .save(text: text, index: index)
        }
    }
}

// MARK: - Private helpers

/// A suggested question on the empty conversation.
private struct ChefSuggestion: Identifiable {
    let text: String
    let systemImage: String
    var id: String { text }
}

/// A pantry item that is expiring soon, with its status computed once.
private struct ChefUrgentItem: Identifiable {
    let item: PantryItem
    let status: ExpiryStatus
    let days: Int
    var id: PersistentIdentifier { item.persistentModelID }
}

/// Plain press feedback for card-like buttons: a slight scale (none under Reduce Motion) and dim.
private struct ChefPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        ChefPressBody(configuration: configuration)
    }
}

private struct ChefPressBody: View {
    let configuration: ButtonStyleConfiguration
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        configuration.label
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.55)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }
}
