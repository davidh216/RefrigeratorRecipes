import SwiftUI
import SwiftData
import FridgeCore

struct RecipesView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case cookable = "Can make", all = "All", favorites = "Favorites"
        var id: String { rawValue }
    }

    @Environment(\.modelContext) private var context
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @Query private var pantry: [PantryItem]
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var mode: Mode = .cookable
    @State private var search = ""
    @State private var showEditor = false
    @State private var showImport = false
    @State private var path = NavigationPath()

    private struct Row: Identifiable {
        let recipe: Recipe
        let match: RecipeMatch
        var id: PersistentIdentifier { recipe.persistentModelID }
    }

    private var rows: [Row] {
        let stock = pantry.map(\.stockItem)
        let staples = Staples.parse(staplesRaw)
        var result = recipes
            .filter { search.isEmpty || $0.title.localizedCaseInsensitiveContains(search) || $0.tags.contains { $0.localizedCaseInsensitiveContains(search) } }
            .map { Row(recipe: $0, match: $0.match(stock: stock, staples: staples, soonThresholdDays: soonDays)) }
        switch mode {
        case .all: break
        case .favorites: result = result.filter { $0.recipe.isFavorite }
        case .cookable: result.sort { RecipeMatcher.isBetter($0.match, than: $1.match) }
        }
        return result
    }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Picker("Show", selection: $mode) {
                    ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())

                if mode == .cookable {
                    let all = rows
                    let ready = all.filter { $0.match.canMake }
                    let almost = all.filter { !$0.match.canMake && $0.match.missing.count <= 2 }
                    let rest = all.filter { $0.match.missing.count > 2 }
                    if !ready.isEmpty { Section("Ready to cook") { ForEach(ready) { row($0) } } }
                    if !almost.isEmpty { Section("Missing 1–2 items") { ForEach(almost) { row($0) } } }
                    if !rest.isEmpty { Section("Needs shopping") { ForEach(rest) { row($0) } } }
                } else {
                    ForEach(rows) { row($0) }
                }
            }
            .overlay {
                if recipes.isEmpty {
                    ContentUnavailableView {
                        Label("No recipes yet", systemImage: "book")
                    } description: {
                        Text("Add your own, import one with AI, or start with 20 sample recipes.")
                    } actions: {
                        Button("Load sample recipes") { _ = try? SampleData.importRecipes(into: context) }
                            .buttonStyle(.borderedProminent)
                        Button("New recipe") { showEditor = true }
                    }
                } else if rows.isEmpty {
                    ContentUnavailableView.search(text: search)
                }
            }
            .searchable(text: $search, prompt: "Search recipes or tags")
            .navigationTitle("Recipes")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button { showEditor = true } label: { Label("New recipe", systemImage: "square.and.pencil") }
                        Button { showImport = true } label: { Label("Import with AI", systemImage: "sparkles") }
                        Button { _ = try? SampleData.importRecipes(into: context) } label: {
                            Label("Add sample recipes", systemImage: "tray.and.arrow.down")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add recipe")
                }
            }
            .sheet(isPresented: $showEditor) { RecipeEditor(recipe: nil) }
            .sheet(isPresented: $showImport) {
                RecipeImportView { recipe in path.append(recipe.persistentModelID) }
            }
        }
    }

    private func row(_ row: Row) -> some View {
        NavigationLink(value: row.recipe.persistentModelID) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Text(row.recipe.title)
                        if row.recipe.isFavorite {
                            Image(systemName: "heart.fill").font(.caption).foregroundStyle(.pink)
                        }
                    }
                    Text(subtitle(for: row))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                CoverageBadge(match: row.match)
            }
        }
    }

    private func subtitle(for row: Row) -> String {
        var parts: [String] = []
        if row.recipe.totalMinutes > 0 { parts.append("\(row.recipe.totalMinutes) min") }
        if row.match.usesExpiringCount > 0 { parts.append("uses \(row.match.usesExpiringCount) expiring") }
        if !row.match.missing.isEmpty { parts.append("need " + row.match.missing.prefix(3).joined(separator: ", ")) }
        return parts.joined(separator: " · ")
    }
}

/// Paste any recipe text (or describe a dish) and let Claude structure it.
struct RecipeImportView: View {
    var onImported: (Recipe) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query private var pantry: [PantryItem]
    @State private var text = ""
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextEditor(text: $text)
                        .frame(minHeight: 220)
                } footer: {
                    Text("Paste a recipe from a website or message, or describe a dish (\"a quick weeknight curry with the chicken I have\").")
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Import with AI")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if isWorking {
                        ProgressView()
                    } else {
                        Button("Import") { Task { await runImport() } }
                            .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
        }
    }

    private func runImport() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            let prefs = KitchenPreferences.current
            let kitchen = KitchenContext.render(pantry: pantry, recipes: [], plan: [], staples: prefs.staples, soonThresholdDays: prefs.soonThresholdDays)
            let generated = try await ClaudeClient.fromSettings().generateRecipe(request: text, kitchenContext: kitchen)
            let recipe = Recipe.insert(from: generated, into: context)
            dismiss()
            onImported(recipe)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
