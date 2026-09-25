import SwiftUI
import SwiftData
import FridgeCore

struct MealPlanView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \MealPlanEntry.day) private var entries: [MealPlanEntry]
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]

    @State private var weekStart = Calendar.current.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
    @State private var addingDay: PlanTarget?
    @State private var toast: String?
    @State private var cooking: MealPlanEntry?

    struct PlanTarget: Identifiable {
        let day: Date
        var id: Date { day }
    }

    private var calendar: Calendar { .current }

    private var days: [Date] {
        (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekStart) }
    }

    private var weekEntries: [MealPlanEntry] {
        guard let end = calendar.date(byAdding: .day, value: 7, to: weekStart) else { return [] }
        return entries.filter { $0.day >= weekStart && $0.day < end }
    }

    private func meals(on day: Date) -> [MealPlanEntry] {
        weekEntries
            .filter { calendar.isDate($0.day, inSameDayAs: day) }
            .sorted { MealSlot.allCases.firstIndex(of: $0.slot)! < MealSlot.allCases.firstIndex(of: $1.slot)! }
    }

    private var weekTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let end = calendar.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        return "\(formatter.string(from: weekStart)) – \(formatter.string(from: end))"
    }

    var body: some View {
        NavigationStack {
            List {
                HStack {
                    Button { shiftWeek(-1) } label: { Image(systemName: "chevron.left") }
                        .accessibilityLabel("Previous week")
                    Spacer()
                    Text(weekTitle).font(.headline)
                    Spacer()
                    Button { shiftWeek(1) } label: { Image(systemName: "chevron.right") }
                        .accessibilityLabel("Next week")
                }
                .buttonStyle(.borderless)

                ForEach(days, id: \.self) { day in
                    Section {
                        ForEach(meals(on: day)) { entry in
                            entryRow(entry)
                        }
                        Button { addingDay = PlanTarget(day: day) } label: {
                            Label("Add meal", systemImage: "plus")
                                .font(.subheadline)
                        }
                    } header: {
                        Text(day, format: .dateTime.weekday(.wide).month().day())
                            .foregroundStyle(calendar.isDateInToday(day) ? Color.accentColor : Color.secondary)
                    }
                }
            }
            .navigationTitle("Meal plan")
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Today") {
                        weekStart = calendar.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { addWeekToShopping() } label: {
                        Label("Shop for this week", systemImage: "cart.badge.plus")
                    }
                    .disabled(weekEntries.isEmpty)
                }
            }
            .sheet(item: $addingDay) { target in
                RecipePickerSheet(day: target.day)
            }
            .sheet(item: $cooking) { entry in
                if let recipe = entry.recipe {
                    CookedSheet(recipe: recipe, servings: entry.servings)
                }
            }
            .alert(toast ?? "", isPresented: Binding(get: { toast != nil }, set: { if !$0 { toast = nil } })) {
                Button("OK") {}
            }
        }
    }

    @ViewBuilder
    private func entryRow(_ entry: MealPlanEntry) -> some View {
        let content = HStack {
            Text(entry.slot.title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .frame(width: 70, alignment: .leading)
            Text(entry.recipe?.title ?? (entry.note.isEmpty ? "Meal" : entry.note))
            Spacer()
            Text("×\(entry.servings)").font(.caption).foregroundStyle(.secondary)
        }
        Group {
            if let recipe = entry.recipe {
                NavigationLink(value: recipe.persistentModelID) { content }
            } else {
                content
            }
        }
        .swipeActions {
            Button(role: .destructive) { context.delete(entry) } label: {
                Label("Remove", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading) {
            if entry.recipe != nil {
                Button { cooking = entry } label: {
                    Label("Cooked", systemImage: "frying.pan")
                }
                .tint(.green)
            }
        }
    }

    private func shiftWeek(_ weeks: Int) {
        weekStart = calendar.date(byAdding: .weekOfYear, value: weeks, to: weekStart) ?? weekStart
    }

    private func addWeekToShopping() {
        let planned = weekEntries.compactMap { entry -> PlannedRecipe? in
            guard let recipe = entry.recipe else { return nil }
            let scale = Double(entry.servings) / Double(max(recipe.servings, 1))
            return PlannedRecipe(title: recipe.title, requirements: recipe.requirements, scale: scale)
        }
        let added = ShoppingAdder.addMissing(
            for: planned,
            pantry: pantry,
            existing: shopping,
            preferences: .current,
            context: context
        )
        toast = added == 0
            ? "You already have everything for this week."
            : "Added \(added) item\(added == 1 ? "" : "s") to your shopping list."
    }
}

struct RecipePickerSheet: View {
    let day: Date

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @State private var slot: MealSlot = .dinner
    @State private var search = ""

    private var filtered: [Recipe] {
        search.isEmpty ? recipes : recipes.filter { $0.title.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            List {
                Picker("Meal", selection: $slot) {
                    ForEach(MealSlot.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())

                ForEach(filtered) { recipe in
                    Button {
                        context.insert(MealPlanEntry(day: day, slot: slot, recipe: recipe, servings: recipe.servings))
                        dismiss()
                    } label: {
                        HStack {
                            Text(recipe.title).foregroundStyle(.primary)
                            Spacer()
                            if recipe.totalMinutes > 0 {
                                Text("\(recipe.totalMinutes) min").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .overlay {
                if recipes.isEmpty {
                    ContentUnavailableView("No recipes", systemImage: "book", description: Text("Add recipes in the Recipes tab first."))
                }
            }
            .searchable(text: $search)
            .navigationTitle(Text(day, format: .dateTime.weekday(.wide).month().day()))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}
