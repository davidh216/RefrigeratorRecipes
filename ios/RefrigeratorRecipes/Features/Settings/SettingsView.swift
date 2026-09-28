import SwiftUI
import SwiftData
import FridgeCore

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @AppStorage(SettingsKey.remindersEnabled) private var remindersEnabled = SettingsDefault.remindersEnabled
    @AppStorage(SettingsKey.reminderLeadDays) private var leadDays = SettingsDefault.reminderLeadDays
    @AppStorage(SettingsKey.reminderHour) private var reminderHour = SettingsDefault.reminderHour
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.staples) private var staples = SettingsDefault.staples
    @AppStorage(SettingsKey.claudeModel) private var model = SettingsDefault.claudeModel
    @AppStorage(SettingsKey.checkInReminderEnabled) private var checkInReminder = SettingsDefault.checkInReminderEnabled
    @AppStorage(SettingsKey.checkInWeekday) private var checkInWeekday = SettingsDefault.checkInWeekday
    @AppStorage(SettingsKey.planAllMeals) private var planAllMeals = SettingsDefault.planAllMeals

    @Query(sort: \HouseholdMember.createdAt) private var household: [HouseholdMember]
    @State private var newMember: HouseholdMember?
    @State private var apiKey = KeychainStore.read(KeychainStore.anthropicAccount) ?? ""
    @State private var keySaved = KeychainStore.read(KeychainStore.anthropicAccount) != nil

    /// Width of the tag column in "How freshness tags work", so the meanings line up.
    @ScaledMetric(relativeTo: .footnote) private var tagColumnWidth: CGFloat = 112

    private static let apiKeyURL = URL(string: "https://console.anthropic.com/settings/keys")

    private var iCloudAvailable: Bool { FileManager.default.ubiquityIdentityToken != nil }

    var body: some View {
        NavigationStack {
            Form {
                claudeSection
                remindersSection
                checkInSection
                householdSection
                mealPlanSection
                staplesSection
                dataSection
                advancedSection
                freshnessGuideSection
            }
            .listChrome()
            .tint(Theme.Colors.beetText)
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .navigationDestination(item: $newMember) { member in
                HouseholdMemberEditor(member: member)
            }
            .task {
                if remindersEnabled { _ = await ExpiryNotifier.requestAuthorization() }
            }
        }
        .sheetChrome()
    }

    // MARK: - Claude

    private var claudeSection: some View {
        Section {
            LabeledContent {
                keyStatus
            } label: {
                Text("API key")
            }
            .settingsRow()

            SecureField("sk-ant-…", text: $apiKey)
                .font(Theme.Fonts.mono)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .settingsRow()

            HStack(spacing: Theme.Space.s) {
                InlineConfirmButton(keySaved ? "Update key" : "Save key", systemImage: "key.fill",
                                    kind: .primary, size: .compact) {
                    saveKey()
                }
                .disabled(apiKey.trimmingCharacters(in: .whitespaces).isEmpty)
                Spacer(minLength: 0)
                if keySaved {
                    Button("Remove", role: .destructive) { removeKey() }
                        .buttonStyle(QuietButtonStyle(color: Theme.Colors.todayText))
                        .accessibilityLabel("Remove API key")
                }
            }
            .padding(.vertical, Theme.Space.xxs)
            .settingsRow()

            if let url = Self.apiKeyURL {
                Link(destination: url) {
                    HStack(spacing: Theme.Space.xs) {
                        Text("Get an API key")
                        Spacer(minLength: Theme.Space.xs)
                        Image(systemName: "arrow.up.right")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Theme.Colors.text3)
                            .accessibilityHidden(true)
                    }
                }
                .settingsRow()
            }
        } header: {
            SettingsSectionHeader(title: "Claude (AI chef & scanning)", systemImage: "sparkles")
        } footer: {
            footerText("Stored in this device's Keychain. Photos, your inventory, and chat messages are sent to Anthropic's API when you use AI features; usage is billed to this key.")
        }
    }

    @ViewBuilder
    private var keyStatus: some View {
        if keySaved {
            Label {
                Text("Key saved")
                    .foregroundStyle(Theme.Colors.text2)
            } icon: {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(Theme.Colors.fresh)
            }
            .font(Theme.Fonts.detailStrong)
        } else {
            Text("No key")
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text3)
        }
    }

    /// Returns the inline confirmation, or nil when nothing was saved.
    private func saveKey() -> String? {
        KeychainStore.write(apiKey.trimmingCharacters(in: .whitespacesAndNewlines), account: KeychainStore.anthropicAccount)
        let saved = !apiKey.isEmpty
        withAnimation(motion(Theme.Motion.snappy)) {
            keySaved = saved
        }
        return saved ? "Saved" : nil
    }

    private func removeKey() {
        KeychainStore.delete(KeychainStore.anthropicAccount)
        withAnimation(motion(Theme.Motion.snappy)) {
            apiKey = ""
            keySaved = false
        }
    }

    // MARK: - Expiration reminders

    private var remindersSection: some View {
        Section {
            Toggle("Remind me before food expires", isOn: $remindersEnabled.animation(motion(Theme.Motion.smooth)))
                .onChange(of: remindersEnabled) { _, enabled in
                    if enabled { Task { _ = await ExpiryNotifier.requestAuthorization() } }
                }
                .settingsRow()
            if remindersEnabled {
                Stepper(leadDays == 0 ? "On the day it expires" : "\(leadDays) day\(leadDays == 1 ? "" : "s") before", value: $leadDays, in: 0...7)
                    .settingsRow()
                Stepper("At \(hourLabel)", value: $reminderHour, in: 5...21)
                    .settingsRow()
            }
            Stepper("\"Expiring soon\" = within \(soonDays) days", value: $soonDays, in: 1...14)
                .settingsRow()
        } header: {
            SettingsSectionHeader(title: "Expiration reminders", systemImage: "bell.fill")
        }
    }

    // MARK: - Weekly check-in

    private var checkInSection: some View {
        Section {
            Toggle("Weekly reminder", isOn: $checkInReminder.animation(motion(Theme.Motion.smooth)))
                .onChange(of: checkInReminder) { _, enabled in
                    if enabled { Task { _ = await ExpiryNotifier.requestAuthorization() } }
                }
                .settingsRow()
            if checkInReminder {
                Picker("Day", selection: $checkInWeekday) {
                    ForEach(1...7, id: \.self) { day in
                        Text(Calendar.current.weekdaySymbols[day - 1]).tag(day)
                    }
                }
                .settingsRow()
            }
        } header: {
            SettingsSectionHeader(title: "Weekly check-in", systemImage: "checklist")
        } footer: {
            footerText("A two-minute pass through what's expiring or hasn't been confirmed in a while, at 10 AM.")
        }
    }

    // MARK: - Household

    private var householdSection: some View {
        Section {
            ForEach(household) { member in
                NavigationLink {
                    HouseholdMemberEditor(member: member)
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(member.displayName)
                            .font(Theme.Fonts.rowTitle)
                            .foregroundStyle(Theme.Colors.ink)
                        Text(member.restrictionSummary ?? "No allergies or diet")
                            .font(Theme.Fonts.detail)
                            .foregroundStyle(Theme.Colors.text2)
                    }
                }
                .settingsRow()
            }
            .onDelete { offsets in
                for index in offsets { context.delete(household[index]) }
            }
            Button {
                let member = HouseholdMember(name: "")
                context.insert(member)
                newMember = member
            } label: {
                Label("Add person", systemImage: "person.badge.plus")
            }
            .settingsRow()
        } header: {
            SettingsSectionHeader(title: "Household", systemImage: "person.2.fill")
        } footer: {
            footerText("Everyone's allergies and diets apply to Tonight, Plan my week and the Chef, since meals are shared. Allergens are spotted by ingredient name, so always check labels.")
        }
    }

    // MARK: - Meal plan

    private var mealPlanSection: some View {
        Section {
            Toggle("Plan breakfast & lunch too", isOn: $planAllMeals)
                .settingsRow()
        } header: {
            SettingsSectionHeader(title: "Meal plan", systemImage: "calendar")
        } footer: {
            footerText(planAllMeals
                       ? "Each recipe goes to the meal it fits (pancakes to breakfast, chili to dinner). Tap a meal's label to change it."
                       : "The plan is dinners only.")
        }
    }

    // MARK: - Always in stock

    private var staplesSection: some View {
        Section {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                TextField("Staples", text: $staples, axis: .vertical)
                    .textInputAutocapitalization(.never)
                staplesPreview
            }
            .padding(.vertical, Theme.Space.xxs)
            .settingsRow()
        } header: {
            SettingsSectionHeader(title: "Always in stock", systemImage: Theme.symbol("basket.fill", fallback: "cart.fill"))
        } footer: {
            footerText("Comma-separated. These never count as missing when matching recipes.")
        }
    }

    /// Live preview of the parsed staples as capsules.
    @ViewBuilder
    private var staplesPreview: some View {
        let parsed = Staples.parse(staples)
        if !parsed.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(Array(parsed.enumerated()), id: \.offset) { _, staple in
                        Text(staple)
                            .font(Theme.Fonts.footnote.weight(.semibold))
                            .foregroundStyle(Theme.Colors.text2)
                            .lineLimit(1)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Theme.Colors.fill, in: Capsule())
                    }
                }
            }
            .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(staplesSpokenLabel(parsed))
        }
    }

    private func staplesSpokenLabel(_ parsed: [String]) -> String {
        let count = parsed.count == 1 ? "1 staple" : "\(parsed.count) staples"
        return count + ": " + parsed.joined(separator: ", ")
    }

    // MARK: - Data

    private var dataSection: some View {
        Section {
            LabeledContent("iCloud sync", value: iCloudAvailable ? "On" : "Not signed in")
                .settingsRow()
            SettingsConfirmRow("Add sample recipes", systemImage: "book.closed.fill") {
                addSampleRecipes()
            }
            .settingsRow()
        } header: {
            SettingsSectionHeader(title: "Data", systemImage: "tray.full.fill")
        }
    }

    /// Returns the inline confirmation that replaces the old "OK" alert.
    private func addSampleRecipes() -> String? {
        let added = (try? SampleData.importRecipes(into: context)) ?? 0
        if added == 0 { return "Already added" }
        return added == 1 ? "Added 1 recipe" : "Added \(added) recipes"
    }

    // MARK: - Advanced

    private var advancedSection: some View {
        Section {
            TextField("Claude model", text: $model)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .font(Theme.Fonts.mono)
                .settingsRow()
            Button("Reset to default model") { model = SettingsDefault.claudeModel }
                .disabled(model == SettingsDefault.claudeModel)
                .settingsRow()
        } header: {
            SettingsSectionHeader(title: "Advanced", systemImage: "slider.horizontal.3")
        }
    }

    // MARK: - How freshness tags work

    private var freshnessGuideSection: some View {
        Section {
            ForEach(guideRows) { row in
                guideRow(row)
                    .settingsRow()
            }
        } header: {
            SettingsSectionHeader(title: "How freshness tags work", systemImage: "leaf.fill")
        } footer: {
            footerText("‘Use soon’ means within \(soonDays) day\(soonDays == 1 ? "" : "s"). Change it under Expiration reminders.")
        }
    }

    /// Real tags for each rung of the heat scale, following the current "Use soon" window.
    private var guideRows: [FreshnessGuideRow] {
        var rows: [FreshnessGuideRow] = [
            FreshnessGuideRow(id: "today", status: .expiringSoon(daysLeft: 0), meaning: "Cook it tonight."),
            FreshnessGuideRow(id: "tomorrow", status: .expiringSoon(daysLeft: 1), meaning: "Use it tomorrow at the latest."),
        ]
        if soonDays >= 2 {
            rows.append(FreshnessGuideRow(id: "soon", status: .expiringSoon(daysLeft: soonDays), meaning: "Use it this week."))
        }
        rows.append(FreshnessGuideRow(id: "fresh", status: .fresh(daysLeft: max(9, soonDays + 1)), meaning: "Fresh. Nothing to do."))
        rows.append(FreshnessGuideRow(id: "frozen", status: .fresh(daysLeft: 90), location: .freezer, meaning: "Frozen. The clock is paused."))
        rows.append(FreshnessGuideRow(id: "past", status: .expired(daysAgo: 2), meaning: "Past its date. Check it before using."))
        return rows
    }

    @ViewBuilder
    private func guideRow(_ row: FreshnessGuideRow) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 6) {
                FreshnessTag(status: row.status, location: row.location)
                guideMeaning(row.meaning)
            }
            .padding(.vertical, Theme.Space.xxs)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        } else {
            HStack(spacing: Theme.Space.s) {
                FreshnessTag(status: row.status, location: row.location)
                    .frame(minWidth: min(tagColumnWidth, 160), alignment: .leading)
                guideMeaning(row.meaning)
            }
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .accessibilityElement(children: .combine)
        }
    }

    private func guideMeaning(_ text: String) -> some View {
        Text(text)
            .font(Theme.Fonts.detail)
            .foregroundStyle(Theme.Colors.text2)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Helpers

    private func footerText(_ text: String) -> some View {
        Text(text)
            .font(Theme.Fonts.footnote)
            .foregroundStyle(Theme.Colors.text3)
    }

    private func motion(_ animation: Animation) -> Animation {
        Theme.Motion.adaptive(animation, reduceMotion: reduceMotion)
    }

    private var hourLabel: String {
        let date = Calendar.current.date(bySettingHour: reminderHour, minute: 0, second: 0, of: .now) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }
}

// MARK: - Private views

/// Section header: a 29pt beet-soft tile beside the title.
private struct SettingsSectionHeader: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label {
            Text(title)
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.text2)
        } icon: {
            SettingsIconTile(systemImage: systemImage)
        }
        .textCase(nil)
        .accessibilityAddTraits(.isHeader)
    }
}

/// A plain Form row button whose label turns into a short confirmation ("Added 12 recipes") for 2 seconds.
/// The row form of `InlineConfirmButton`, used where a capsule would look out of place.
private struct SettingsConfirmRow: View {
    let title: String
    let systemImage: String
    let action: () -> String?

    @State private var confirmation: String? = nil
    @State private var successCount = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(_ title: String, systemImage: String, action: @escaping () -> String?) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    var body: some View {
        Button {
            guard confirmation == nil, let result = action() else { return }
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                confirmation = result
            }
            successCount += 1
            AccessibilityNotification.Announcement(result).post()
        } label: {
            Label(confirmation ?? title, systemImage: confirmation == nil ? systemImage : "checkmark")
                .contentTransition(.symbolEffect(.replace))
        }
        .allowsHitTesting(confirmation == nil)
        .sensoryFeedback(.success, trigger: successCount)
        .task(id: confirmation) {
            guard confirmation != nil else { return }
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                confirmation = nil
            }
        }
    }
}

/// One row of "How freshness tags work".
private struct FreshnessGuideRow: Identifiable {
    let id: String
    let status: ExpiryStatus
    var location: StorageLocation? = nil
    let meaning: String
}

private extension View {
    /// Flat surface rows with tinted separators, per DESIGN.md §4 (Lists).
    func settingsRow() -> some View {
        self.listRowBackground(Theme.Colors.surface)
            .listRowSeparatorTint(Theme.Colors.separator)
    }
}

// MARK: - Household member

/// One person's name, allergies, diet and foods to avoid.
struct HouseholdMemberEditor: View {
    @Bindable var member: HouseholdMember
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var avoidText: String
    @State private var confirmRemove = false

    init(member: HouseholdMember) {
        self.member = member
        _avoidText = State(initialValue: member.avoid.joined(separator: ", "))
    }

    var body: some View {
        Form {
            Section {
                TextField("Name", text: $member.name)
                    .textInputAutocapitalization(.words)
                    .settingsRow()
            }

            Section {
                ForEach(Allergen.allCases) { allergen in
                    Toggle(allergen.title, isOn: allergenBinding(allergen))
                        .settingsRow()
                }
            } header: {
                Text("Allergies")
            } footer: {
                Text("Recipes containing these are left out of Tonight and Plan my week, and flagged everywhere else. Gluten covers wheat, barley and rye.")
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text3)
            }

            Section {
                ForEach(Diet.allCases) { diet in
                    Toggle(diet.title, isOn: dietBinding(diet))
                        .settingsRow()
                }
            } header: {
                Text("Diet")
            }

            Section {
                TextField("Cilantro, mushrooms…", text: $avoidText, axis: .vertical)
                    .onChange(of: avoidText) { _, text in
                        member.avoid = Staples.parse(text)
                    }
                    .settingsRow()
            } header: {
                Text("Other foods to avoid")
            } footer: {
                Text("Separate with commas.")
                    .font(Theme.Fonts.footnote)
                    .foregroundStyle(Theme.Colors.text3)
            }

            Section {
                Button("Remove \(member.displayName)", role: .destructive) {
                    confirmRemove = true
                }
                .settingsRow()
            }
        }
        .listChrome()
        .navigationTitle(member.name.isEmpty ? "New person" : member.name)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Remove \(member.displayName)?", isPresented: $confirmRemove, titleVisibility: .visible) {
            Button("Remove", role: .destructive) {
                context.delete(member)
                dismiss()
            }
        }
    }

    private func allergenBinding(_ allergen: Allergen) -> Binding<Bool> {
        Binding(
            get: { member.allergens.contains(allergen) },
            set: { isOn in
                var set = member.allergens
                if isOn { set.insert(allergen) } else { set.remove(allergen) }
                member.allergens = set
            }
        )
    }

    private func dietBinding(_ diet: Diet) -> Binding<Bool> {
        Binding(
            get: { member.diets.contains(diet) },
            set: { isOn in
                var set = member.diets
                if isOn { set.insert(diet) } else { set.remove(diet) }
                member.diets = set
            }
        )
    }
}
