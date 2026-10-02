import SwiftUI
import SwiftData
import FridgeCore

// Recipe detail (DESIGN.md §8.11): a crate-colored header the recipe tile zooms into,
// a serif headnote, an ingredient card that knows what you have, numbered steps in
// the cook's pen, and a bottom bar for "I cooked this" and planning.

struct RecipeDetailView: View {
    @Bindable var recipe: Recipe

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Query private var pantry: [PantryItem]
    @Query private var shopping: [ShoppingItem]
    @Query(sort: \HouseholdMember.createdAt) private var household: [HouseholdMember]
    @Query private var nutritionCache: [IngredientNutrition]
    @AppStorage(SettingsKey.staples) private var staplesRaw = SettingsDefault.staples
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays

    @State private var showEditor = false
    @State private var showPlanner = false
    @State private var showCooked = false
    @State private var confirmDelete = false
    /// The missing-ingredient row that was just tapped; its trailing slot reads "Added" for 2 s.
    @State private var rowConfirmation: IngredientConfirmation?
    @State private var rowAddedCount = 0
    @State private var isEstimating = false
    @State private var estimateError: String?

    /// Width of the ingredient status-glyph column.
    @ScaledMetric(relativeTo: .title3) private var glyphColumn: CGFloat = 24
    /// Minimum width of the step-number column.
    @ScaledMetric(relativeTo: .title2) private var stepNumberWidth: CGFloat = 28

    private static let basketSymbol = Theme.symbol("basket", fallback: "cart")

    private var staples: [String] { Staples.parse(staplesRaw) }

    private var match: RecipeMatch {
        recipe.match(stock: pantry.map(\.stockItem), staples: staples, soonThresholdDays: soonDays)
    }

    var body: some View {
        let currentMatch = match
        let rescues = Rescue.items(
            requirements: recipe.requirements,
            stock: pantry.map(\.stockItem),
            soonThresholdDays: soonDays
        )
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                header(currentMatch)
                dietWarning
                nutritionCard
                headnote
                sourceCredit
                ingredientsSection(currentMatch, rescues: rescues)
                stepsSection
                footerSection
            }
            .padding(.horizontal, Theme.Space.gutter)
            .padding(.top, Theme.Space.xs)
            .padding(.bottom, Theme.Space.xl)
        }
        .background(Theme.Colors.canvas)
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    recipe.isFavorite.toggle()
                } label: {
                    Image(systemName: recipe.isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(Theme.Colors.plumText)
                        .symbolEffect(.bounce, value: reduceMotion ? false : recipe.isFavorite)
                }
                .accessibilityLabel(recipe.isFavorite ? "Unfavorite" : "Favorite")
                Button("Edit") { showEditor = true }
            }
        }
        .actionBar {
            if dynamicTypeSize.isAccessibilitySize {
                // §11: at accessibility sizes the action row becomes a full-width stack.
                VStack(spacing: Theme.Space.xs) {
                    Button {
                        showCooked = true
                    } label: {
                        Label("I cooked this", systemImage: "frying.pan.fill")
                    }
                    .buttonStyle(PrimaryButtonStyle(fullWidth: true))

                    Button {
                        showPlanner = true
                    } label: {
                        Label("Add to meal plan", systemImage: "calendar.badge.plus")
                    }
                    .buttonStyle(SecondaryButtonStyle(fullWidth: true))
                }
            } else {
                HStack(spacing: 10) {
                    Button {
                        showCooked = true
                    } label: {
                        Label("I cooked this", systemImage: "frying.pan.fill")
                    }
                    .buttonStyle(PrimaryButtonStyle(fullWidth: true))

                    Button {
                        showPlanner = true
                    } label: {
                        Image(systemName: "calendar.badge.plus")
                    }
                    .buttonStyle(IconCircleButtonStyle(.plumSoft, diameter: 50))
                    .accessibilityLabel("Add to meal plan")
                }
            }
        }
        .hapticImpact(.light, trigger: recipe.isFavorite)
        .hapticSuccess(trigger: rowAddedCount)
        .task(id: rowConfirmation) {
            guard rowConfirmation != nil else { return }
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                rowConfirmation = nil
            }
        }
        .sheet(isPresented: $showEditor) { RecipeEditor(recipe: recipe) }
        .sheet(isPresented: $showPlanner) { AddToPlanSheet(recipe: recipe) }
        .sheet(isPresented: $showCooked) { CookedSheet(recipe: recipe) }
        .confirmationDialog("Delete \(recipe.title)?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                context.delete(recipe)
                dismiss()
            }
        }
    }

    // MARK: - Header

    /// The crate block the recipe tile zooms into.
    private func header(_ match: RecipeMatch) -> some View {
        let category = recipe.leadCategory(staples: staples)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: Theme.Space.xs) {
                Text(recipe.cuisine.isEmpty ? "Recipe" : Cuisine.displayName(for: recipe.cuisine))
                    .eyebrowStyle()
                Spacer(minLength: Theme.Space.xs)
                Image(systemName: category.symbol)
                    .font(.title2.weight(.bold))
                    .accessibilityHidden(true)
            }
            Text(recipe.title)
                .font(Theme.Fonts.display)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Theme.Space.xs) {
                    metaStickers(match)
                }
                VStack(alignment: .leading, spacing: Theme.Space.xs) {
                    metaStickers(match)
                }
            }
            .padding(.top, Theme.Space.xxs)
        }
        .padding(Theme.Space.heroPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .crateBlock(category)
        .accessibilityElement(children: .contain)
    }

    /// Time, servings and coverage, as flat (unrotated) stickers.
    @ViewBuilder
    private func metaStickers(_ match: RecipeMatch) -> some View {
        if recipe.totalMinutes > 0 {
            Sticker("\(recipe.totalMinutes) min", systemImage: "clock")
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(recipe.totalMinutes == 1 ? "1 minute" : "\(recipe.totalMinutes) minutes")
        }
        Sticker("Serves \(recipe.servings)", systemImage: "person.2.fill")
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Serves \(recipe.servings)")
        Sticker(match.canMake ? "Ready" : "\(match.have.count)/\(match.requiredCount)",
                systemImage: match.canMake ? "checkmark.circle.fill" : Self.basketSymbol,
                symbolColor: match.canMake ? Theme.Colors.fresh : Theme.Colors.text2)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(match.canMake
                                ? "Ready to cook, you have everything"
                                : "Have \(match.have.count) of \(match.requiredCount) ingredients")
    }

    // MARK: - Headnote and tags

    /// "From @creator · View original", and a note when the recipe was rebuilt from a caption.
    @ViewBuilder
    private var sourceCredit: some View {
        let url = recipe.sourceURL.flatMap(URL.init(string:))
        if url != nil || !recipe.sourceCreator.isEmpty || recipe.isReconstructed {
            VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                HStack(spacing: Theme.Space.xs) {
                    if !recipe.sourceCreator.isEmpty {
                        Text("From \(recipe.sourceCreator)")
                            .font(Theme.Fonts.detailStrong)
                            .foregroundStyle(Theme.Colors.ink)
                    }
                    if let url {
                        Link(destination: url) {
                            Label("View original", systemImage: "arrow.up.right.square")
                        }
                        .font(Theme.Fonts.detailStrong)
                        .foregroundStyle(Theme.Colors.plumText)
                    }
                }
                if recipe.isReconstructed {
                    Label("Rebuilt from the video's title and caption. Check amounts against the original.",
                          systemImage: "wand.and.stars")
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// Per-serving calories and macros, with what the estimate leaves out.
    @ViewBuilder
    private var nutritionCard: some View {
        let estimate = recipe.nutrition(table: Nutrition.table(nutritionCache))
        if estimate.total > 0 {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Per serving")
                        .eyebrowStyle()
                        .foregroundStyle(Theme.Colors.text2)
                    Spacer(minLength: 0)
                    if !estimate.isReliable {
                        Text("Partial estimate")
                            .font(Theme.Fonts.tag)
                            .foregroundStyle(Theme.Colors.soonText)
                    }
                }
                HStack(spacing: Theme.Space.s) {
                    macro("\(Int(estimate.perServing.kcal.rounded()))", unit: "kcal", label: "Calories")
                    macro("\(Int(estimate.perServing.protein.rounded()))", unit: "g", label: "Protein")
                    macro("\(Int(estimate.perServing.carbs.rounded()))", unit: "g", label: "Carbs")
                    macro("\(Int(estimate.perServing.fat.rounded()))", unit: "g", label: "Fat")
                }
                if !estimate.missing.isEmpty {
                    Text("Leaves out " + estimate.missing.joined(separator: ", ").lowercased() + ".")
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                    if ClaudeClient.isAvailable {
                        Button {
                            Task { await estimateMissing(estimate.missing) }
                        } label: {
                            if isEstimating {
                                ProgressView()
                            } else {
                                Label("Estimate the rest with Claude", systemImage: "sparkles")
                            }
                        }
                        .buttonStyle(QuietButtonStyle(color: Theme.Colors.plumText))
                        .disabled(isEstimating)
                    }
                    if let estimateError {
                        Text(estimateError)
                            .font(Theme.Fonts.footnote)
                            .foregroundStyle(Theme.Colors.todayText)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .surfaceCard()
            .accessibilityElement(children: .contain)
        }
    }

    private func macro(_ value: String, unit: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Theme.numberText("≈" + value, unit: unit)
                .foregroundStyle(Theme.Colors.ink)
            Text(label)
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label), about \(value) \(unit == "g" ? "grams" : "calories")")
    }

    /// Asks Claude about ingredients the built-in table doesn't cover and caches the answers.
    private func estimateMissing(_ names: [String]) async {
        isEstimating = true
        estimateError = nil
        defer { isEstimating = false }
        let items = recipe.sortedIngredients
            .filter { names.contains($0.name) }
            .map { (name: $0.name, unit: KitchenUnit.canonical($0.unit)) }
        do {
            let guesses = try await ClaudeClient.fromSettings().estimateNutrition(ingredients: items)
            for guess in guesses {
                let unit = items.first { $0.name == guess.name }?.unit ?? ""
                let entry = IngredientNutrition(name: guess.name)
                entry.kcal = guess.kcal_per_100g
                entry.protein = guess.protein_g
                entry.carbs = guess.carbs_g
                entry.fat = guess.fat_g
                entry.fiber = guess.fiber_g
                entry.gramsPerCup = guess.grams_per_cup
                if guess.grams_per_unit > 0 { entry.unitsRaw = ["\(unit)=\(guess.grams_per_unit)"] }
                context.insert(entry)
            }
        } catch {
            estimateError = error.localizedDescription
        }
    }

    /// "Not for Sam: milk (Parmesan)", one line per person the recipe doesn't suit.
    @ViewBuilder
    private var dietWarning: some View {
        let lines: [String] = household.compactMap { member in
            let conflicts = recipe.conflicts(with: member.restrictions)
            guard !conflicts.isEmpty else { return nil }
            let items = Array(Set(conflicts.map(\.ingredient))).sorted().joined(separator: ", ")
            return "Not for \(member.displayName): \(DietRules.summary(conflicts)) (\(items))"
        }
        if !household.isEmpty && household.contains(where: { !$0.restrictions.isEmpty }) && !recipe.allergyCheckAvailable {
            // A language the keyword lists don't cover: say so rather than pass it silently (HANDOFF §4.2).
            Label("Allergy check isn't available in this recipe's language. Check the ingredients yourself.",
                  systemImage: "exclamationmark.triangle.fill")
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.todayText)
                .fixedSize(horizontal: false, vertical: true)
        }
        if !lines.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                ForEach(lines, id: \.self) { line in
                    Label(line, systemImage: "exclamationmark.triangle.fill")
                        .font(Theme.Fonts.detailStrong)
                        .foregroundStyle(Theme.Colors.todayText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text("Checked by ingredient name only. Always check labels.")
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .surfaceCard()
            .accessibilityElement(children: .combine)
        }
    }

    @ViewBuilder
    private var headnote: some View {
        let tags = recipe.tags.map { RecipeTagChip.clean($0) }.filter { !$0.isEmpty }
        let gentle = tags.contains { RecipeTag.id(for: $0).flatMap(RecipeTag.tag)?.isGentleMood == true }
        if !recipe.summary.isEmpty || !tags.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                if !recipe.summary.isEmpty {
                    Text(recipe.summary)
                        .font(Theme.Fonts.headnote)
                        .foregroundStyle(Theme.Colors.ink)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if !tags.isEmpty {
                    tagStrip(tags)
                }
                if gentle {
                    GentleMoodFooter()
                }
            }
        }
    }

    /// Tags as quiet `fill` capsules, scrolling edge to edge.
    private func tagStrip(_ tags: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tags.indices, id: \.self) { index in
                    RecipeTagChip(raw: tags[index])
                }
            }
        }
        .contentMargins(.horizontal, Theme.Space.gutter, for: .scrollContent)
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .padding(.horizontal, -Theme.Space.gutter)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Tags: " + tags.map(RecipeTagChip.name).joined(separator: ", "))
    }

    // MARK: - Ingredients

    @ViewBuilder
    private func ingredientsSection(_ match: RecipeMatch, rescues: [RescueItem]) -> some View {
        let ingredients = recipe.sortedIngredients
        if !ingredients.isEmpty {
            let stapleKeys = Set(staples.map { IngredientName.normalize($0) })
            let listed = shopping.filter { !$0.isChecked }.map(\.name)
            let firstID = ingredients.first?.persistentModelID
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                ingredientsHeader(match, count: ingredients.count)

                VStack(spacing: 0) {
                    ForEach(ingredients) { ingredient in
                        ingredientEntry(ingredient,
                                        isFirst: ingredient.persistentModelID == firstID,
                                        stapleKeys: stapleKeys,
                                        rescues: rescues,
                                        listed: listed)
                    }
                }
                .surfaceCard(padding: 0)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))

                if !match.missing.isEmpty {
                    InlineConfirmButton("Add \(match.missing.count) missing to list",
                                        systemImage: Self.basketSymbol,
                                        kind: .secondary,
                                        fullWidth: true) {
                        addAllMissing()
                    }
                    .padding(.top, Theme.Space.xxs)
                }
            }
        }
    }

    /// "Ingredients 7" with the coverage badge trailing (under it at accessibility sizes).
    @ViewBuilder
    private func ingredientsHeader(_ match: RecipeMatch, count: Int) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: Theme.Space.xxs) {
                SectionHeader("Ingredients", count: count)
                CoverageBadge(match: match)
            }
        } else {
            HStack(alignment: .center, spacing: Theme.Space.xs) {
                SectionHeader("Ingredients", count: count)
                // SectionHeader pads 8 above and 4 below; this re-centers the badge on the title.
                CoverageBadge(match: match)
                    .padding(.top, Theme.Space.xxs)
            }
        }
    }

    /// One ingredient row, with a hairline above every row but the first.
    @ViewBuilder
    private func ingredientEntry(_ ingredient: RecipeIngredient, isFirst: Bool, stapleKeys: Set<String>,
                                 rescues: [RescueItem], listed: [String]) -> some View {
        let state = ingredientState(ingredient, stapleKeys: stapleKeys)
        let urgent = rescues.first(where: { IngredientName.matches($0.name, ingredient.name) })
        let onList = state == .missing && listed.contains(where: { IngredientName.matches($0, ingredient.name) })
        if !isFirst {
            DetailHairline(leadingInset: Theme.Space.m + glyphColumn + Theme.Space.s)
        }
        ingredientRow(ingredient, state: state, urgent: urgent, onList: onList)
    }

    private func ingredientState(_ ingredient: RecipeIngredient, stapleKeys: Set<String>) -> IngredientState {
        if stapleKeys.contains(IngredientName.normalize(ingredient.name)) { return .staple }
        if pantry.contains(where: { IngredientName.matches($0.name, ingredient.name) }) { return .inStock }
        return ingredient.isOptional ? .optionalMissing : .missing
    }

    /// Missing rows are buttons that put that one item on the list.
    @ViewBuilder
    private func ingredientRow(_ ingredient: RecipeIngredient, state: IngredientState,
                               urgent: RescueItem?, onList: Bool) -> some View {
        let confirmation: String? = rowConfirmation?.id == ingredient.persistentModelID ? rowConfirmation?.text : nil
        let spoken = spokenIngredient(ingredient, state: state, urgent: urgent, onList: onList)
        if state == .missing {
            Button {
                addOne(ingredient)
            } label: {
                ingredientRowContent(ingredient, state: state, urgent: urgent, onList: onList, confirmation: confirmation)
            }
            .buttonStyle(IngredientRowButtonStyle())
            .accessibilityLabel(spoken)
            .accessibilityHint("Adds to shopping list")
        } else {
            ingredientRowContent(ingredient, state: state, urgent: urgent, onList: onList, confirmation: nil)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(spoken)
        }
    }

    private func ingredientRowContent(_ ingredient: RecipeIngredient, state: IngredientState,
                                      urgent: RescueItem?, onList: Bool, confirmation: String?) -> some View {
        let isAX = dynamicTypeSize.isAccessibilitySize
        return HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
            Text(Image(systemName: state.symbol))
                .font(.title3)
                .foregroundStyle(state.color)
                .frame(width: glyphColumn)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                nameText(ingredient, state: state)
                if !ingredient.note.isEmpty {
                    Text(ingredient.note)
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                }
                if state == .missing {
                    missingText(onList: onList)
                }
                if isAX {
                    trailingColumn(ingredient, urgent: urgent, confirmation: confirmation, alignment: .leading)
                        .padding(.top, Theme.Space.xxs)
                }
            }
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)

            if !isAX {
                trailingColumn(ingredient, urgent: urgent, confirmation: confirmation, alignment: .trailing)
            }
        }
        .padding(.horizontal, Theme.Space.m)
        .padding(.vertical, Theme.Space.s)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
    }

    /// Quantity (or the "Added" confirmation), with a small freshness tag under it when the food is urgent.
    @ViewBuilder
    private func trailingColumn(_ ingredient: RecipeIngredient, urgent: RescueItem?, confirmation: String?,
                                alignment: HorizontalAlignment) -> some View {
        let quantity = ingredient.displayQuantity
        if confirmation != nil || !quantity.isEmpty || urgent != nil {
            VStack(alignment: alignment, spacing: 6) {
                if let confirmation {
                    Label(confirmation, systemImage: "checkmark")
                        .font(Theme.Fonts.detailStrong)
                        .foregroundStyle(Theme.Colors.fresh)
                        .lineLimit(1)
                } else if !quantity.isEmpty {
                    Text(quantity)
                        .font(Theme.Fonts.number)
                        .foregroundStyle(Theme.Colors.text2)
                        .lineLimit(1)
                }
                if let urgent {
                    FreshnessTag(status: urgent.status, size: .small)
                }
            }
            .fixedSize()
        }
    }

    private func nameText(_ ingredient: RecipeIngredient, state: IngredientState) -> Text {
        let name: Text = Text(ingredient.name)
            .font(Theme.Fonts.rowTitle)
            .foregroundStyle(Theme.Colors.ink)
        let qualifier: String?
        switch state {
        case .staple: qualifier = "staple"
        case .optionalMissing: qualifier = "(optional)"
        case .inStock: qualifier = ingredient.isOptional ? "(optional)" : nil
        case .missing: qualifier = nil
        }
        guard let qualifier else { return name }
        let suffix: Text = Text(" " + qualifier)
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
        return name + suffix
    }

    private func missingText(onList: Bool) -> Text {
        let missing: Text = Text("Missing").foregroundStyle(Theme.Colors.todayText)
        guard onList else { return missing.font(Theme.Fonts.footnote) }
        let listed: Text = Text(" · on your list").foregroundStyle(Theme.Colors.text2)
        return (missing + listed).font(Theme.Fonts.footnote)
    }

    private func spokenIngredient(_ ingredient: RecipeIngredient, state: IngredientState,
                                  urgent: RescueItem?, onList: Bool) -> String {
        var parts = [ingredient.name]
        if !ingredient.note.isEmpty { parts.append(ingredient.note) }
        let quantity = ingredient.displayQuantity
        if !quantity.isEmpty { parts.append(quantity) }
        switch state {
        case .inStock: parts.append(ingredient.isOptional ? "optional, you have it" : "you have it")
        case .staple: parts.append("staple")
        case .optionalMissing: parts.append("optional")
        case .missing: parts.append(onList ? "missing, on your list" : "missing")
        }
        if let urgent {
            parts.append(urgent.status.spokenLabel().lowercased())
        }
        return parts.joined(separator: ", ")
    }

    // MARK: - Steps

    @ViewBuilder
    private var stepsSection: some View {
        if !recipe.instructions.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                SectionHeader("Steps", count: recipe.instructions.count)
                VStack(spacing: 0) {
                    ForEach(Array(recipe.instructions.enumerated()), id: \.offset) { index, step in
                        if index > 0 {
                            DetailHairline(leadingInset: Theme.Space.m + stepNumberWidth + 14)
                        }
                        stepRow(number: index + 1, text: step)
                    }
                }
                .surfaceCard(padding: 0)
            }
        }
    }

    private func stepRow(number: Int, text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 14) {
            Text("\(number)")
                .font(Theme.Fonts.numberLarge)
                .foregroundStyle(Theme.Colors.plumText)
                .frame(minWidth: stepNumberWidth, alignment: .leading)
            Text(text)
                .font(Theme.Fonts.body)
                .foregroundStyle(Theme.Colors.ink)
                .lineSpacing(3)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, Theme.Space.m)
        .padding(.vertical, 14)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Step \(number)")
        .accessibilityValue(text)
    }

    // MARK: - History and delete

    private var footerSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            if recipe.cookCount > 0 {
                Text(historyText)
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text3)
            }
            Button(role: .destructive) {
                confirmDelete = true
            } label: {
                Label("Delete recipe", systemImage: "trash")
            }
            .buttonStyle(QuietButtonStyle(color: Theme.Colors.todayText))
        }
    }

    /// "Cooked 3 times · last on Sep 12"
    private var historyText: String {
        let times = recipe.cookCount == 1 ? "Cooked once" : "Cooked \(recipe.cookCount) times"
        guard let last = recipe.lastCookedAt else { return times }
        return times + " · last on " + last.formatted(.dateTime.month(.abbreviated).day())
    }

    // MARK: - Actions

    private var preferences: KitchenPreferences {
        KitchenPreferences(staples: staples, soonThresholdDays: soonDays)
    }

    /// Adds everything the recipe is missing. Returns the inline confirmation.
    private func addAllMissing() -> String? {
        let added = ShoppingAdder.addMissing(
            for: [PlannedRecipe(title: recipe.title, requirements: recipe.requirements)],
            pantry: pantry,
            existing: shopping,
            preferences: preferences,
            context: context
        )
        return added == 0 ? "On your list" : "Added \(added)"
    }

    /// Adds one missing ingredient, then shows "Added" in its row for 2 s.
    private func addOne(_ ingredient: RecipeIngredient) {
        let id = ingredient.persistentModelID
        guard rowConfirmation?.id != id else { return }
        let added = ShoppingAdder.addMissing(
            for: [PlannedRecipe(title: recipe.title, requirements: [ingredient.requirement])],
            pantry: pantry,
            existing: shopping,
            preferences: preferences,
            context: context
        )
        let text = added > 0 ? "Added" : "On your list"
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            rowConfirmation = IngredientConfirmation(id: id, text: text)
        }
        rowAddedCount += 1
        let announcement = added > 0
            ? "Added \(ingredient.name) to your shopping list"
            : "\(ingredient.name) is already on your shopping list"
        AccessibilityNotification.Announcement(announcement).post()
    }
}

// MARK: - Private helpers

/// How a recipe ingredient relates to what's in the kitchen.
private enum IngredientState {
    case inStock, staple, optionalMissing, missing

    var symbol: String {
        switch self {
        case .inStock: return "checkmark.circle.fill"
        case .staple: return "checkmark.circle"
        case .optionalMissing: return "circle"
        case .missing: return "circle.dashed"
        }
    }

    var color: Color {
        switch self {
        case .inStock: return Theme.Colors.fresh
        case .staple: return Theme.Colors.text2
        case .optionalMissing: return Theme.Colors.text3
        case .missing: return Theme.Colors.text2
        }
    }
}

/// Which ingredient row is showing its inline "Added" confirmation.
private struct IngredientConfirmation: Equatable {
    let id: PersistentIdentifier
    let text: String
}

/// A 0.5pt separator that starts where the row's text starts.
private struct DetailHairline: View {
    let leadingInset: CGFloat

    var body: some View {
        Rectangle()
            .fill(Theme.Colors.separator)
            .frame(height: 0.5)
            .padding(.leading, leadingInset)
            .accessibilityHidden(true)
    }
}

/// Tappable ingredient row: a quiet `fill` wash while pressed.
private struct IngredientRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Theme.Colors.fill : Color.clear)
    }
}

// MARK: - Add to plan

struct AddToPlanSheet: View {
    let recipe: Recipe
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var day = Date.now
    @State private var slot: MealSlot
    @State private var servings: Int
    @State private var addedCount = 0
    @AppStorage(SettingsKey.planAllMeals) private var planAllMeals = SettingsDefault.planAllMeals

    /// `slot` defaults to the meal the recipe fits; dinners-only planning ignores it.
    init(recipe: Recipe, day: Date = .now, slot: MealSlot? = nil) {
        self.recipe = recipe
        _day = State(initialValue: day)
        _slot = State(initialValue: slot ?? recipe.guessedSlot)
        _servings = State(initialValue: recipe.servings)
    }

    private var mealOptions: [ChipOption<MealSlot>] {
        MealSlot.allCases.map { ChipOption($0, $0.title) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("Day", selection: $day, displayedComponents: .date)
                    if planAllMeals {
                        ChipPicker("Meal", selection: $slot, options: mealOptions)
                            .padding(.vertical, Theme.Space.xxs)
                            .listRowInsets(EdgeInsets())
                    }
                    Stepper("Servings: \(servings)", value: $servings, in: 1...24)
                }
                .listRowBackground(Theme.Colors.surface)
                .listRowSeparatorTint(Theme.Colors.separator)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.Colors.canvas)
            .navigationTitle(recipe.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        context.insert(MealPlanEntry(day: day, slot: planAllMeals ? slot : .dinner, recipe: recipe, servings: servings))
                        addedCount += 1
                        dismiss()
                    }
                }
            }
            .hapticSuccess(trigger: addedCount)
        }
        .presentationDetents([.medium, .large])
        .sheetChrome()
    }
}
