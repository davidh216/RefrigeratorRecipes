import SwiftUI
import SwiftData

/// Chat with Claude about what to cook, grounded in the current kitchen.
struct ChefView: View {
    @Environment(\.modelContext) private var context
    @Query private var pantry: [PantryItem]
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var plan: [MealPlanEntry]

    @State private var turns: [ClaudeClient.ChatTurn] = []
    @State private var input = ""
    @State private var isThinking = false
    @State private var errorMessage: String?
    @State private var savingIndex: Int?
    @State private var savedRecipe: Recipe?
    @State private var showSettings = false
    @State private var hasKey = KeychainStore.read(KeychainStore.anthropicAccount) != nil

    private let suggestions = [
        "What can I make tonight with what I have?",
        "What should I cook first before it goes bad?",
        "Plan three easy dinners for this week.",
        "Something quick, under 20 minutes.",
    ]

    var body: some View {
        NavigationStack {
            Group {
                if hasKey {
                    chat
                } else {
                    ContentUnavailableView {
                        Label("Set up your chef", systemImage: "sparkles")
                    } description: {
                        Text("The chef, photo scanning, and recipe import use Claude. Add your Anthropic API key in Settings to turn them on.")
                    } actions: {
                        Button("Open Settings") { showSettings = true }
                            .buttonStyle(.borderedProminent)
                    }
                }
            }
            .navigationTitle("Chef")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !turns.isEmpty {
                    ToolbarItem(placement: .primaryAction) {
                        Button("New chat") {
                            turns = []
                            errorMessage = nil
                        }
                    }
                }
            }
            .navigationDestination(item: $savedRecipe) { recipe in
                RecipeDetailView(recipe: recipe)
            }
            .sheet(isPresented: $showSettings, onDismiss: {
                hasKey = KeychainStore.read(KeychainStore.anthropicAccount) != nil
            }) {
                SettingsView()
            }
        }
    }

    private var chat: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        if turns.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Ask me what to cook. I can see your fridge, recipes, and meal plan.")
                                    .foregroundStyle(.secondary)
                                ForEach(suggestions, id: \.self) { suggestion in
                                    Button(suggestion) { send(suggestion) }
                                        .buttonStyle(.bordered)
                                }
                            }
                            .padding(.top, 24)
                        }
                        ForEach(Array(turns.enumerated()), id: \.offset) { index, turn in
                            bubble(turn, index: index)
                        }
                        if isThinking {
                            HStack { ProgressView(); Text("Thinking…").foregroundStyle(.secondary) }
                                .id("thinking")
                        }
                        if let errorMessage {
                            Text(errorMessage).foregroundStyle(.red).font(.callout)
                        }
                        Color.clear.frame(height: 1).id("bottom")
                    }
                    .padding()
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: turns.count) { _, _ in
                    withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                }
            }

            Divider()
            HStack(alignment: .bottom) {
                TextField("Ask the chef…", text: $input, axis: .vertical)
                    .lineLimit(1...5)
                    .textFieldStyle(.roundedBorder)
                Button {
                    send(input)
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.title)
                }
                .disabled(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isThinking)
                .accessibilityLabel("Send")
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    @ViewBuilder
    private func bubble(_ turn: ClaudeClient.ChatTurn, index: Int) -> some View {
        if turn.role == .user {
            HStack {
                Spacer(minLength: 40)
                Text(turn.text)
                    .padding(10)
                    .background(Color.accentColor.opacity(0.15), in: RoundedRectangle(cornerRadius: 14))
            }
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Text(Self.markdown(turn.text))
                    .textSelection(.enabled)
                Button {
                    Task { await saveRecipe(from: turn.text, index: index) }
                } label: {
                    if savingIndex == index {
                        ProgressView()
                    } else {
                        Label("Save as recipe", systemImage: "square.and.arrow.down")
                            .font(.caption)
                    }
                }
                .buttonStyle(.bordered)
                .disabled(savingIndex != nil)
            }
            .padding(10)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
        }
    }

    private static func markdown(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    }

    private var kitchenContext: String {
        let prefs = KitchenPreferences.current
        return KitchenContext.render(
            pantry: pantry,
            recipes: recipes,
            plan: plan,
            staples: prefs.staples,
            soonThresholdDays: prefs.soonThresholdDays
        )
    }

    private func send(_ raw: String) {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isThinking else { return }
        input = ""
        errorMessage = nil
        turns.append(.init(role: .user, text: text))
        isThinking = true
        let history = turns
        let kitchen = kitchenContext
        Task {
            defer { isThinking = false }
            do {
                let reply = try await ClaudeClient.fromSettings().chat(history: history, kitchenContext: kitchen)
                turns.append(.init(role: .assistant, text: reply))
            } catch {
                // Drop the unanswered question so the conversation stays user/assistant alternating.
                if turns.last?.role == .user { input = turns.removeLast().text }
                errorMessage = error.localizedDescription
            }
        }
    }

    private func saveRecipe(from text: String, index: Int) async {
        savingIndex = index
        errorMessage = nil
        defer { savingIndex = nil }
        do {
            let request = "Turn the main dish described below into a complete recipe.\n\n" + text
            let generated = try await ClaudeClient.fromSettings().generateRecipe(request: request, kitchenContext: kitchenContext)
            savedRecipe = Recipe.insert(from: generated, into: context)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
