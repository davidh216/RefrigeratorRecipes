import SwiftUI
import SwiftData
import FridgeCore

/// One person's nutrition goal: pick a goal, optionally add body details for a
/// calorie suggestion, and adjust any target. About 30 seconds for the common case.
struct NutritionGoalEditor: View {
    @Bindable var member: HouseholdMember
    @AppStorage(SettingsKey.dinnerShare) private var dinnerShare = SettingsDefault.dinnerShare
    @FocusState private var focused: Field?

    private enum Field: Hashable { case age, height, heightInches, weight, kcal, protein, carbs, fat, fiber }

    private static let usesImperial = Locale.current.measurementSystem == .us
    private static let decimal = FloatingPointFormatStyle<Double>.number.precision(.fractionLength(0...1))
    private static let whole = FloatingPointFormatStyle<Double>.number.precision(.fractionLength(0))

    var body: some View {
        Form {
            Section {
                Picker("Goal", selection: goalBinding) {
                    Text("No goal").tag(NutritionGoal?.none)
                    ForEach(NutritionGoal.allCases) { goal in
                        Text(goal.title).tag(NutritionGoal?.some(goal))
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
                .settingsRow()
            } header: {
                Text("Goal")
            } footer: {
                footer(member.goal == nil
                       ? "Without a goal, Plan my week only looks at what's in the fridge."
                       : "Plan my week picks dinners near \(member.displayName)'s share of these targets.")
            }

            if member.goal != nil {
                aboutSection
                suggestionSection
                targetsSection
            }
        }
        .listChrome()
        .tint(Theme.Colors.plumText)
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle("Nutrition goal")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focused = nil }
            }
        }
    }

    // MARK: - Sections

    private var aboutSection: some View {
        Section {
            numberRow("Age", value: $member.age, unit: "years", field: .age)
            Picker("Sex", selection: $member.sex) {
                ForEach(BodySex.allCases) { Text($0.title).tag($0) }
            }
            .settingsRow()
            if Self.usesImperial {
                HStack {
                    Text("Height")
                    Spacer()
                    numberField(feetBinding, format: Self.whole, field: .height)
                    Text("ft").foregroundStyle(Theme.Colors.text2)
                    numberField(inchesBinding, format: Self.whole, field: .heightInches)
                    Text("in").foregroundStyle(Theme.Colors.text2)
                }
                .settingsRow()
                numberRow("Weight", value: poundsBinding, format: Self.decimal, unit: "lb", field: .weight)
            } else {
                numberRow("Height", value: $member.heightCm, format: Self.whole, unit: "cm", field: .height)
                numberRow("Weight", value: $member.weightKg, format: Self.decimal, unit: "kg", field: .weight)
            }
            Picker("Activity", selection: $member.activity) {
                ForEach(ActivityLevel.allCases) { Text($0.title).tag($0) }
            }
            .settingsRow()
        } header: {
            Text("About \(member.displayName) (optional)")
        } footer: {
            footer("Used only to suggest a calorie target (Mifflin-St Jeor). It stays on your devices and in your iCloud.")
        }
    }

    @ViewBuilder
    private var suggestionSection: some View {
        if let goal = member.goal {
            let suggested = NutritionTargets.suggested(goal: goal, body: member.bodyDetails)
            let matches = member.dailyTargets.map { Self.sameTargets($0, suggested) } ?? false
            Section {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Suggested: \(Int(suggested.kcal).formatted()) kcal · \(Int(suggested.protein)) g protein")
                        .font(Theme.Fonts.rowTitle)
                        .foregroundStyle(Theme.Colors.ink)
                    Text(member.bodyDetails == nil
                         ? "Based on a typical adult. Add age, height and weight for a closer number."
                         : "Based on \(member.displayName)'s details and activity.")
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
                .settingsRow()
                Button(matches ? "Using suggested targets" : "Use suggested targets") {
                    focused = nil
                    member.dailyTargets = suggested
                }
                .disabled(matches)
                .settingsRow()
            }
        }
    }

    private var targetsSection: some View {
        Section {
            numberRow("Calories", value: $member.targetKcal, format: Self.whole, unit: "kcal", field: .kcal)
            numberRow("Protein", value: $member.targetProtein, format: Self.whole, unit: "g", field: .protein)
            numberRow("Carbs", value: $member.targetCarbs, format: Self.whole, unit: "g", field: .carbs)
            numberRow("Fat", value: $member.targetFat, format: Self.whole, unit: "g", field: .fat)
            numberRow("Fiber", value: $member.targetFiber, format: Self.whole, unit: "g", field: .fiber)
        } header: {
            Text("Daily targets")
        } footer: {
            footer("Dinner aims at about \(Int((dinnerShare * 100).rounded()))% of the day (change this in Settings → Meal plan). Nutrition numbers are estimates. These are personal goals, not medical advice.")
        }
    }

    // MARK: - Rows

    private func numberRow(_ title: String, value: Binding<Double>, format: FloatingPointFormatStyle<Double>,
                           unit: String, field: Field) -> some View {
        HStack {
            Text(title)
            Spacer()
            numberField(value, format: format, field: field)
            Text(unit)
                .foregroundStyle(Theme.Colors.text2)
                .frame(minWidth: 34, alignment: .leading)
        }
        .settingsRow()
        .accessibilityElement(children: .combine)
    }

    private func numberRow(_ title: String, value: Binding<Int>, unit: String, field: Field) -> some View {
        HStack {
            Text(title)
            Spacer()
            TextField("–", value: Self.blankWhenZero(value), format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .focused($focused, equals: field)
                .frame(maxWidth: 90)
            Text(unit)
                .foregroundStyle(Theme.Colors.text2)
                .frame(minWidth: 34, alignment: .leading)
        }
        .settingsRow()
        .accessibilityElement(children: .combine)
    }

    private func numberField(_ value: Binding<Double>, format: FloatingPointFormatStyle<Double>, field: Field) -> some View {
        TextField("–", value: Self.blankWhenZero(value), format: format)
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.trailing)
            .focused($focused, equals: field)
            .frame(maxWidth: 90)
    }

    private func footer(_ text: String) -> some View {
        Text(text)
            .font(Theme.Fonts.footnote)
            .foregroundStyle(Theme.Colors.text3)
    }

    // MARK: - Bindings

    /// Picking a goal for the first time fills in the suggested targets.
    private var goalBinding: Binding<NutritionGoal?> {
        Binding(
            get: { member.goal },
            set: { goal in
                member.goal = goal
                if let goal, member.targetKcal <= 0 {
                    member.dailyTargets = NutritionTargets.suggested(goal: goal, body: member.bodyDetails)
                }
            }
        )
    }

    private var poundsBinding: Binding<Double> {
        Binding(
            get: { member.weightKg > 0 ? (member.weightKg / 0.45359237 * 10).rounded() / 10 : 0 },
            set: { member.weightKg = max($0, 0) * 0.45359237 }
        )
    }

    private var totalInches: Double { member.heightCm / 2.54 }

    private var feetBinding: Binding<Double> {
        Binding(
            get: { member.heightCm > 0 ? (totalInches.rounded() / 12).rounded(.down) : 0 },
            set: { feet in
                let inches = member.heightCm > 0 ? totalInches.rounded().truncatingRemainder(dividingBy: 12) : 0
                member.heightCm = (max(feet, 0) * 12 + inches) * 2.54
            }
        )
    }

    private var inchesBinding: Binding<Double> {
        Binding(
            get: { member.heightCm > 0 ? totalInches.rounded().truncatingRemainder(dividingBy: 12) : 0 },
            set: { inches in
                let feet = member.heightCm > 0 ? (totalInches.rounded() / 12).rounded(.down) : 0
                member.heightCm = (feet * 12 + max(inches, 0)) * 2.54
            }
        )
    }

    /// 0 means "not given": show the placeholder, and clearing the field stores 0.
    private static func blankWhenZero<Value: Numeric>(_ value: Binding<Value>) -> Binding<Value?> {
        Binding(
            get: { value.wrappedValue == .zero ? nil : value.wrappedValue },
            set: { value.wrappedValue = $0 ?? .zero }
        )
    }

    private static func sameTargets(_ a: NutritionFacts, _ b: NutritionFacts) -> Bool {
        abs(a.kcal - b.kcal) < 1 && abs(a.protein - b.protein) < 1 && abs(a.carbs - b.carbs) < 1
            && abs(a.fat - b.fat) < 1 && abs(a.fiber - b.fiber) < 1
    }
}
