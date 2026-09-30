import SwiftUI
import SwiftData
import FridgeCore

/// The Tonight tab's "Super ingredient of the week" card.
struct SuperIngredientCard: View {
    let edition: SuperIngredient
    /// A pantry item that is this ingredient, if there is one.
    let inKitchen: PantryItem?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: Theme.Space.s) {
                CategoryTile(edition.foodCategory, size: .large, style: .crate)
                VStack(alignment: .leading, spacing: 3) {
                    Text("SUPER INGREDIENT OF THE WEEK")
                        .font(Theme.Fonts.eyebrow)
                        .tracking(0.6)
                        .foregroundStyle(Theme.Colors.plumText)
                    Text(edition.ingredient)
                        .font(Theme.Fonts.cardTitle)
                        .foregroundStyle(Theme.Colors.ink)
                    Text(inKitchen != nil ? "You have some. 3 ways to use it this week." : edition.headline)
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
        .accessibilityHint("Opens this week's super ingredient: why it's good for you and three recipes.")
    }
}

/// The weekly showcase: why the ingredient is worth eating, nutrition per serving,
/// three recipes from the library, and tips for buying, storing and getting kids to eat it.
struct SuperIngredientView: View {
    let edition: SuperIngredient

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]
    @Query(sort: \HouseholdMember.createdAt) private var household: [HouseholdMember]
    @Query(sort: \Recipe.title) private var recipes: [Recipe]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var path: [PersistentIdentifier] = []

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.section) {
                    hero
                    kitchenStatus
                    benefitsSection
                    nutritionSection
                    recipesSection
                    tipsSection
                    Text("General nutrition information, not medical advice. Numbers are estimates from USDA data for the serving shown.")
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.text3)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.top, Theme.Space.s)
                .padding(.bottom, Theme.Space.xxl)
            }
            .background(Theme.Colors.canvas)
            .navigationTitle("This week")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .navigationDestination(for: PersistentIdentifier.self) { id in
                if let recipe = context.model(for: id) as? Recipe {
                    RecipeDetailView(recipe: recipe)
                }
            }
        }
        .sheetChrome()
    }

    // MARK: - Hero

    private var weekLabel: String {
        let start = WeeklySpotlight.weekStart(for: .now)
        return "WEEK OF " + start.formatted(.dateTime.month(.wide).day()).uppercased()
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            CategoryTile(edition.foodCategory, size: .xlarge, style: .crate)
                .padding(.bottom, Theme.Space.xxs)
            Text("SUPER INGREDIENT · \(weekLabel)")
                .font(Theme.Fonts.eyebrow)
                .tracking(0.6)
                .foregroundStyle(Theme.Colors.plumText)
            Text(edition.ingredient)
                .font(Theme.Fonts.display)
                .foregroundStyle(Theme.Colors.ink)
                .accessibilityAddTraits(.isHeader)
            Text(edition.headline)
                .font(Theme.Fonts.headnote)
                .foregroundStyle(Theme.Colors.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(edition.intro)
                .font(Theme.Fonts.body)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, Theme.Space.xxs)
        }
    }

    // MARK: - In your kitchen

    private var matchingStock: [PantryItem] {
        pantry.filter { edition.matches($0.name) }
    }

    private var onShoppingList: Bool {
        shopping.contains { !$0.isChecked && edition.matches($0.name) }
    }

    @ViewBuilder
    private var kitchenStatus: some View {
        if let item = matchingStock.first {
            let status = item.expiryStatus(soonThresholdDays: soonDays)
            HStack(spacing: Theme.Space.s) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Theme.Colors.fresh)
                    .accessibilityHidden(true)
                Text(status == .unknown ? "You have \(item.name.lowercased())." : "You have \(item.name.lowercased()): \(status.label.lowercased()).")
                    .font(Theme.Fonts.detailStrong)
                    .foregroundStyle(Theme.Colors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
            .surfaceCard()
        } else {
            HStack(spacing: Theme.Space.s) {
                Text(onShoppingList ? "\(edition.ingredient) is on your shopping list." : "Not in your kitchen yet.")
                    .font(Theme.Fonts.detailStrong)
                    .foregroundStyle(Theme.Colors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: Theme.Space.xs)
                if !onShoppingList {
                    Button {
                        context.insert(ShoppingItem(name: edition.ingredient, reason: "Super ingredient of the week"))
                    } label: {
                        Label("Add to list", systemImage: "cart.badge.plus")
                    }
                    .buttonStyle(CapsuleButtonStyle(.secondary, size: .compact))
                }
            }
            .surfaceCard()
            .sensoryFeedback(.success, trigger: onShoppingList)
        }
    }

    // MARK: - Why it's super

    private var benefitsSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            SectionHeader("Why it's super", systemImage: "sparkles")
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                ForEach(edition.benefits, id: \.self) { benefit in
                    HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
                        Image(systemName: "leaf.fill")
                            .font(.footnote)
                            .foregroundStyle(Theme.Colors.fresh)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(benefit.title)
                                .font(Theme.Fonts.rowTitle)
                                .foregroundStyle(Theme.Colors.ink)
                            Text(benefit.detail)
                                .font(Theme.Fonts.detail)
                                .foregroundStyle(Theme.Colors.text2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            .surfaceCard()
        }
    }

    // MARK: - Nutrition

    @ViewBuilder
    private var nutritionSection: some View {
        if let facts = edition.servingNutrition {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                SectionHeader("Per serving · \(edition.serving.label)", systemImage: "chart.bar.fill")
                HStack(spacing: 0) {
                    nutrient("\(Int(facts.kcal.rounded()))", unit: "", label: "Calories")
                    nutrient(Self.grams(facts.protein), unit: "g", label: "Protein")
                    nutrient(Self.grams(facts.fiber), unit: "g", label: "Fiber")
                    nutrient(Self.grams(facts.carbs), unit: "g", label: "Carbs")
                    nutrient(Self.grams(facts.fat), unit: "g", label: "Fat")
                }
                .surfaceCard()
            }
        }
    }

    private static func grams(_ value: Double) -> String {
        value < 10 ? String(format: "%.1f", value).replacingOccurrences(of: ".0", with: "") : "\(Int(value.rounded()))"
    }

    private func nutrient(_ value: String, unit: String, label: String) -> some View {
        VStack(spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 1) {
                Text(value).font(Theme.Fonts.number)
                if !unit.isEmpty {
                    Text(unit).font(Theme.Fonts.caption).foregroundStyle(Theme.Colors.text2)
                }
            }
            .foregroundStyle(Theme.Colors.ink)
            Text(label)
                .font(Theme.Fonts.caption)
                .foregroundStyle(Theme.Colors.text3)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Recipes

    private struct Row: Identifiable {
        var title: String
        var summary: String
        var minutes: Int
        var warning: String?
        var isSaved: Bool
        var id: String { title }
    }

    private var rows: [Row] {
        let restrictions = Household.restrictions(household)
        return edition.recipes.compactMap { title in
            let saved = recipes.first { $0.title.caseInsensitiveCompare(title) == .orderedSame }
            let preview = SampleData.preview(titled: title)
            guard saved != nil || preview != nil else { return nil }
            let ingredients = saved?.sortedIngredients.map(\.name) ?? preview?.ingredientNames ?? []
            let conflicts = restrictions.isEmpty ? [] : DietRules.conflicts(ingredients: ingredients, restrictions: restrictions)
            let reasons = Array(Set(conflicts.map(\.reason))).sorted()
            return Row(
                title: saved?.title ?? preview!.title,
                summary: saved?.summary ?? preview?.summary ?? "",
                minutes: saved?.totalMinutes ?? preview?.totalMinutes ?? 0,
                warning: reasons.isEmpty ? nil : "Contains " + reasons.joined(separator: ", ").lowercased(),
                isSaved: saved != nil
            )
        }
    }

    private var recipesSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            SectionHeader("Cook it this week", systemImage: "fork.knife")
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                    if index > 0 {
                        Rectangle().fill(Theme.Colors.separator).frame(height: 0.5)
                    }
                    Button { open(row.title) } label: { recipeRow(row) }
                        .buttonStyle(.plain)
                }
            }
            .surfaceCard(padding: 0)
            Text("Recipes you haven't saved yet are added to Recipes when you open them.")
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text3)
        }
    }

    private func recipeRow(_ row: Row) -> some View {
        HStack(alignment: .center, spacing: Theme.Space.s) {
            VStack(alignment: .leading, spacing: 3) {
                Text(row.title)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if !row.summary.isEmpty {
                    Text(row.summary)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .lineLimit(2)
                }
                HStack(spacing: Theme.Space.xs) {
                    if row.minutes > 0 {
                        Label("\(row.minutes) min", systemImage: "clock")
                    }
                    if row.isSaved {
                        Label("Saved", systemImage: "bookmark.fill")
                    }
                }
                .font(Theme.Fonts.caption)
                .foregroundStyle(Theme.Colors.text3)
                if let warning = row.warning {
                    Label(warning, systemImage: "exclamationmark.triangle.fill")
                        .font(Theme.Fonts.caption)
                        .foregroundStyle(Theme.Colors.todayText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .multilineTextAlignment(.leading)
            Spacer(minLength: Theme.Space.xs)
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.Colors.text3)
                .accessibilityHidden(true)
        }
        .padding(Theme.Space.cardPadding)
        .contentShape(Rectangle())
    }

    private func open(_ title: String) {
        guard let recipe = SampleData.recipe(titled: title, in: context) else { return }
        path.append(recipe.persistentModelID)
    }

    // MARK: - Tips

    private var tipsSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            SectionHeader("Good to know", systemImage: "lightbulb.fill")
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                tip("Picking it", systemImage: "cart", text: edition.choose)
                tip("Keeping it", systemImage: "refrigerator", text: edition.store)
                tip("For the kids", systemImage: "face.smiling", text: edition.kidTip)
            }
            .surfaceCard()
        }
    }

    private func tip(_ title: String, systemImage: String, text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
            Image(systemName: systemImage)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.Colors.plumText)
                .frame(width: 20)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                Text(text)
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
