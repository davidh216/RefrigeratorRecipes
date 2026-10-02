import SwiftUI
import SwiftData
import FridgeCore

/// First-run welcome (HANDOFF-cuisines-languages-moods.md, "Second priority"): what Fridge does,
/// who's eating, starter recipes and reminders, then filling the fridge. Shown once on a fresh
/// install, skippable, and reachable again from Settings. Notification permission is asked here,
/// with the reason, and nowhere at launch.
struct WelcomeView: View {
    /// What to do once the welcome closes.
    enum Finish {
        case done, scanReceipt, addByHand
    }

    private enum Step: Int, CaseIterable {
        case intro, household, setup, fridge
    }

    /// The last step offers the receipt scanner; from Settings the welcome ends after setup instead.
    let showsFridgeStep: Bool
    let onFinish: (Finish) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \HouseholdMember.createdAt) private var household: [HouseholdMember]
    @Query private var recipes: [Recipe]
    @AppStorage(SettingsKey.remindersEnabled) private var remindersEnabled = SettingsDefault.remindersEnabled
    @AppStorage(SettingsKey.checkInReminderEnabled) private var checkInReminder = SettingsDefault.checkInReminderEnabled
    @AppStorage(SettingsKey.superIngredientReminder) private var superIngredientReminder = SettingsDefault.superIngredientReminder

    @State private var step: Step = .intro
    @State private var addStarters: Bool
    @State private var wantsReminders: Bool
    /// The reminder choice the screen opened with; a replay from Settings only changes reminders
    /// if the user flips the toggle.
    private let initialReminders: Bool

    init(showsFridgeStep: Bool = true, onFinish: @escaping (Finish) -> Void) {
        self.showsFridgeStep = showsFridgeStep
        self.onFinish = onFinish
        // First run: both on by default. From Settings: starters off (so deleted ones don't come
        // back), and reminders as they are now.
        let remindersOn = UserDefaults.standard.object(forKey: SettingsKey.remindersEnabled) as? Bool
            ?? SettingsDefault.remindersEnabled
        let reminders = showsFridgeStep ? true : remindersOn
        _addStarters = State(initialValue: showsFridgeStep)
        _wantsReminders = State(initialValue: reminders)
        initialReminders = reminders
    }
    @State private var newName = ""
    @State private var isWorking = false
    @FocusState private var nameFocused: Bool

    private var steps: [Step] { showsFridgeStep ? Step.allCases : [.intro, .household, .setup] }

    /// Starter recipes not saved yet; the toggle hides once they're all in.
    private var missingStarters: Int { SampleData.missing(among: recipes).count }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.section) {
                    progress
                    Group {
                        switch step {
                        case .intro: intro
                        case .household: householdStep
                        case .setup: setupStep
                        case .fridge: fridgeStep
                        }
                    }
                    .transition(.opacity)
                }
                .padding(.horizontal, Theme.Space.gutter)
                .padding(.vertical, Theme.Space.m)
                .containerRelativeFrame(.horizontal)
            }
            .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.Colors.canvas)
            .toolbar {
                if step != .intro {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Back") { move(by: -1) }
                            .disabled(isWorking)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Skip") { onFinish(.done) }
                        .disabled(isWorking)
                        .accessibilityHint("Closes the welcome. You can open it again from Settings.")
                }
            }
            .actionBar { actionButton }
        }
        .tint(Theme.Colors.plumText)
    }

    // MARK: - Progress

    private var progress: some View {
        let index = steps.firstIndex(of: step) ?? 0
        return HStack(spacing: 6) {
            ForEach(steps.indices, id: \.self) { i in
                Capsule()
                    .fill(i <= index ? Theme.Colors.plum : Theme.Colors.fillStrong)
                    .frame(height: 4)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Step \(index + 1) of \(steps.count)")
    }

    // MARK: - 1. What Fridge does

    private var intro: some View {
        VStack(alignment: .leading, spacing: Theme.Space.l) {
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                Text("Welcome to Fridge")
                    .font(Theme.Fonts.display)
                    .foregroundStyle(Theme.Colors.ink)
                    .accessibilityAddTraits(.isHeader)
                Text("Cook what you have before it goes bad.")
                    .font(Theme.Fonts.headnote)
                    .foregroundStyle(Theme.Colors.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                feature(.produce, title: "Know what's in your fridge",
                        detail: "Scan a grocery receipt or a photo, and Fridge keeps track of what needs using first.")
                feature(.meat, title: "Dinner ideas every night",
                        detail: "Tonight suggests recipes from what you have, starting with food that's about to expire.")
                feature(.grains, title: "Plan and shop in one place",
                        detail: "Plan the week around your household's allergies and diets, and the shopping list fills itself.")
            }
            .surfaceCard()
        }
    }

    private func feature(_ category: FoodCategory, title: LocalizedStringKey, detail: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: Theme.Space.s) {
            CategoryTile(category, size: .row, style: .crate)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.Fonts.rowTitle)
                    .foregroundStyle(Theme.Colors.ink)
                Text(detail)
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: - 2. Household

    private var householdStep: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            stepTitle("Who's eating?",
                      detail: "Add the people you cook for. Allergies and diets keep everyone's meals safe: recipes that don't fit are left out of Tonight and flagged everywhere else.")
            ForEach(household) { member in
                WelcomeMemberCard(member: member) {
                    withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
                        context.delete(member)
                    }
                }
            }
            HStack(spacing: Theme.Space.s) {
                TextField(household.isEmpty ? "Your name" : "Another name", text: $newName)
                    .textInputAutocapitalization(.words)
                    .submitLabel(.done)
                    .focused($nameFocused)
                    .onSubmit(addPerson)
                    .font(Theme.Fonts.body)
                Button(action: addPerson) {
                    Label("Add", systemImage: "plus")
                }
                .buttonStyle(SecondaryButtonStyle(size: .compact))
                .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .surfaceCard()
            Text("You can skip this and add people later in Settings, with foods to avoid and nutrition goals.")
                .font(Theme.Fonts.footnote)
                .foregroundStyle(Theme.Colors.text3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func addPerson() {
        let name = newName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            context.insert(HouseholdMember(name: name))
        }
        newName = ""
    }

    // MARK: - 3. Starter recipes and reminders

    private var setupStep: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            stepTitle("A few settings", detail: "Both can be changed any time in Settings.")
            if missingStarters > 0 {
                VStack(alignment: .leading, spacing: Theme.Space.xs) {
                    Toggle(isOn: $addStarters) {
                        Text("Add \(missingStarters) starter recipes")
                            .font(Theme.Fonts.rowTitle)
                            .foregroundStyle(Theme.Colors.ink)
                    }
                    Text("Weeknight dinners, breakfasts and snacks from around the world, so Tonight has something to suggest from day one.")
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .surfaceCard()
            }
            VStack(alignment: .leading, spacing: Theme.Space.xs) {
                Toggle(isOn: $wantsReminders) {
                    Text("Reminders")
                        .font(Theme.Fonts.rowTitle)
                        .foregroundStyle(Theme.Colors.ink)
                }
                Text("A nudge the day before food expires, a weekly fridge check-in, and Monday's super ingredient. When you continue, iPhone asks whether Fridge may send notifications.")
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .surfaceCard()
        }
    }

    /// Adds the starter recipes and asks for notifications if wanted. Only here, with the reason shown.
    private func applySetup() async {
        isWorking = true
        defer { isWorking = false }
        if addStarters && missingStarters > 0 {
            _ = try? SampleData.importRecipes(into: context)
        }
        // On a replay, an untouched toggle leaves each reminder setting as the user had it.
        guard showsFridgeStep || wantsReminders != initialReminders else { return }
        let allowed = wantsReminders ? await ExpiryNotifier.requestAuthorization() : false
        remindersEnabled = allowed
        checkInReminder = allowed
        superIngredientReminder = allowed
    }

    // MARK: - 4. Fill your fridge

    private var fridgeStep: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            stepTitle("Fill your fridge",
                      detail: "The fastest start is your last grocery receipt: Fridge reads it and adds everything with a use-by guess.")
            Button { onFinish(.scanReceipt) } label: {
                Label("Scan a receipt", systemImage: "doc.text.viewfinder")
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
            Button { onFinish(.addByHand) } label: {
                Label("Add items by hand", systemImage: "square.and.pencil")
            }
            .buttonStyle(SecondaryButtonStyle(fullWidth: true))
        }
    }

    // MARK: - Pieces

    private func stepTitle(_ title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            Text(title)
                .font(Theme.Fonts.titleHeavy)
                .foregroundStyle(Theme.Colors.ink)
                .accessibilityAddTraits(.isHeader)
            Text(detail)
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var actionButton: some View {
        switch step {
        case .fridge:
            Button("Skip for now") { onFinish(.done) }
                .buttonStyle(QuietButtonStyle())
                .frame(maxWidth: .infinity)
        case .setup:
            Button {
                Task {
                    await applySetup()
                    if showsFridgeStep { move(by: 1) } else { onFinish(.done) }
                }
            } label: {
                if isWorking {
                    ProgressView().tint(Theme.Colors.onPlum)
                } else {
                    Text(showsFridgeStep ? "Continue" : "Done")
                }
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
            .disabled(isWorking)
        default:
            Button(step == .intro ? "Get started" : "Continue") {
                // A typed but un-added name counts.
                if step == .household { addPerson() }
                move(by: 1)
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
        }
    }

    private func move(by offset: Int) {
        guard let index = steps.firstIndex(of: step), steps.indices.contains(index + offset) else { return }
        nameFocused = false
        withAnimation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion)) {
            step = steps[index + offset]
        }
    }
}

/// One person in the welcome: name, allergies and diets as chips. The full editor is in Settings.
private struct WelcomeMemberCard: View {
    @Bindable var member: HouseholdMember
    var onRemove: () -> Void

    private let columns = [GridItem(.adaptive(minimum: 104), spacing: Theme.Space.xs, alignment: .leading)]

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            HStack(spacing: Theme.Space.s) {
                TextField("Name", text: $member.name)
                    .textInputAutocapitalization(.words)
                    .font(Theme.Fonts.rowTitle)
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Theme.Colors.text3)
                        .frame(minWidth: Theme.Metrics.minTap, minHeight: Theme.Metrics.minTap)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove \(member.displayName)")
            }
            Text("Allergies")
                .eyebrowStyle()
                .foregroundStyle(Theme.Colors.text2)
            LazyVGrid(columns: columns, alignment: .leading, spacing: 0) {
                ForEach(Allergen.allCases) { allergen in
                    Chip(allergen.title, isSelected: member.allergens.contains(allergen),
                         accessibilityLabel: "\(allergen.title) allergy for \(member.displayName)") {
                        var set = member.allergens
                        if set.contains(allergen) { set.remove(allergen) } else { set.insert(allergen) }
                        member.allergens = set
                    }
                }
            }
            Text("Diet")
                .eyebrowStyle()
                .foregroundStyle(Theme.Colors.text2)
            LazyVGrid(columns: columns, alignment: .leading, spacing: 0) {
                ForEach(Diet.allCases) { diet in
                    Chip(diet.title, isSelected: member.diets.contains(diet),
                         accessibilityLabel: "\(diet.title) for \(member.displayName)") {
                        var set = member.diets
                        if set.contains(diet) { set.remove(diet) } else { set.insert(diet) }
                        member.diets = set
                    }
                }
            }
        }
        .surfaceCard()
    }
}
