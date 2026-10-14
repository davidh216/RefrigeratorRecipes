import FridgeCore
import SwiftUI

/// Cooking mode: the recipe one step at a time, in big type, with the screen kept on and timers taken from
/// the step text. The first page is the ingredients to get out; the last step ends with "I cooked this".
struct CookingModeView: View {
    struct Ingredient: Identifiable {
        let id: Int
        let name: String
        let note: String
        let quantity: String
    }

    let recipe: Recipe
    /// Title, steps and ingredients as the recipe page shows them (translated when it is).
    let title: String
    let steps: [String]
    let ingredients: [Ingredient]

    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @StateObject private var timers: CookingTimers
    /// 0 is the ingredients; 1… are the steps.
    @State private var page = 0
    @State private var gathered: Set<Int> = []
    @State private var showCooked = false
    @State private var confirmClose = false
    /// When it was last cooked as cooking mode opened. State, so it survives the parent re-rendering
    /// (which builds a new view value) once "I cooked this" changes the recipe.
    @State private var cookedBefore: Date?

    init(recipe: Recipe, title: String, steps: [String], ingredients: [Ingredient]) {
        self.recipe = recipe
        self.title = title
        self.steps = steps
        self.ingredients = ingredients
        _cookedBefore = State(initialValue: recipe.lastCookedAt)
        _timers = StateObject(wrappedValue: CookingTimers(recipeTitle: title))
    }

    /// The recipe as its page shows it unless the user translated it there (for Siri's "Start cooking").
    init(recipe: Recipe) {
        let text = RecipeTranslations.shown(for: recipe)
        let ingredients = recipe.sortedIngredients.enumerated().map { index, ingredient in
            Ingredient(id: index,
                       name: text.ingredient(at: index)?.name ?? ingredient.name,
                       note: text.ingredient(at: index)?.note ?? ingredient.note,
                       quantity: ingredient.displayQuantity)
        }
        self.init(recipe: recipe, title: text.title ?? recipe.title,
                  steps: text.instructions ?? recipe.instructions, ingredients: ingredients)
    }

    private var lastPage: Int { steps.count }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            if !timers.timers.isEmpty {
                timerTray
            }
            TabView(selection: $page) {
                ingredientsPage
                    .tag(0)
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    stepPage(number: index + 1, text: step)
                        .tag(index + 1)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion), value: page)
        }
        .background(Theme.Colors.canvas)
        .safeAreaInset(edge: .bottom, spacing: 0) { bottomBar }
        // The screen stays on while cooking.
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear {
            UIApplication.shared.isIdleTimerDisabled = false
            timers.removeAll()
        }
        .hapticSuccess(trigger: timers.finishedCount)
        .hapticImpact(.light, trigger: page)
        .sheet(isPresented: $showCooked, onDismiss: {
            // Saved as cooked: cooking is over.
            if recipe.lastCookedAt != cookedBefore { dismiss() }
        }) {
            CookedSheet(recipe: recipe)
        }
        .confirmationDialog("Stop cooking? Your timers will stop too.", isPresented: $confirmClose,
                            titleVisibility: .visible) {
            Button("Stop cooking", role: .destructive) { dismiss() }
        }
    }

    // MARK: - Top

    private var topBar: some View {
        VStack(spacing: Theme.Space.xs) {
            HStack(spacing: Theme.Space.s) {
                Button {
                    if timers.timers.contains(where: { !$0.isFinished }) { confirmClose = true } else { dismiss() }
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(IconCircleButtonStyle(.neutral))
                .accessibilityLabel("Stop cooking")

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Theme.Fonts.rowTitle)
                        .foregroundStyle(Theme.Colors.ink)
                        .lineLimit(1)
                    Text(page == 0 ? String(localized: "Ingredients")
                                   : String(localized: "Step \(page) of \(steps.count)"))
                        .font(Theme.Fonts.detail)
                        .foregroundStyle(Theme.Colors.text2)
                        .contentTransition(.numericText())
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityElement(children: .combine)
            }
            progressBar
        }
        .padding(.horizontal, Theme.Space.gutter)
        .padding(.top, Theme.Space.xs)
        .padding(.bottom, Theme.Space.s)
    }

    private var progressBar: some View {
        GeometryReader { proxy in
            let fraction = steps.isEmpty ? 0 : CGFloat(page) / CGFloat(steps.count)
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.Colors.fill)
                Capsule().fill(Theme.Colors.plum)
                    .frame(width: max(6, proxy.size.width * fraction))
            }
        }
        .frame(height: 6)
        .animation(Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: reduceMotion), value: page)
        .accessibilityHidden(true)
    }

    // MARK: - Timers

    private var timerTray: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Space.xs) {
                    ForEach(timers.timers) { timer in
                        timerChip(timer, now: context.date)
                    }
                }
                .padding(.horizontal, Theme.Space.gutter)
            }
        }
        .padding(.bottom, Theme.Space.s)
    }

    private func timerChip(_ timer: CookingTimers.Running, now: Date) -> some View {
        let remaining = timer.remaining(at: now)
        let isPaused = timer.pausedRemaining != nil
        return Button {
            if timer.isFinished { timers.remove(timer.id) } else { timers.togglePause(timer.id) }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: timer.isFinished ? "bell.fill" : (isPaused ? "pause.fill" : "timer"))
                Text("Step \(timer.step)")
                    .font(Theme.Fonts.caption)
                Text(timer.isFinished ? String(localized: "Done") : Self.clock(remaining))
                    .font(Theme.Fonts.number)
                    .contentTransition(.numericText(countsDown: true))
            }
            .padding(.horizontal, Theme.Space.s)
            .frame(minHeight: Theme.Metrics.minTap)
            .foregroundStyle(timer.isFinished ? Theme.Colors.onToday : Theme.Colors.ink)
            .background(timer.isFinished ? Theme.Colors.today : (isPaused ? Theme.Colors.fill : Theme.Colors.plumSoft),
                        in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(timer.isFinished
            ? String(localized: "Step \(timer.step) timer is done")
            : String(localized: "Step \(timer.step) timer, \(Self.spoken(remaining)) left"))
        .accessibilityHint(timer.isFinished ? String(localized: "Clears the timer")
                                            : (isPaused ? String(localized: "Resumes the timer") : String(localized: "Pauses the timer")))
        .accessibilityAction(named: Text("Stop timer")) { timers.remove(timer.id) }
        .contextMenu {
            if !timer.isFinished {
                if isPaused {
                    Button("Resume", systemImage: "play.fill") { timers.togglePause(timer.id) }
                } else {
                    Button("Pause", systemImage: "pause.fill") { timers.togglePause(timer.id) }
                }
            }
            Button("Stop timer", systemImage: "xmark", role: .destructive) { timers.remove(timer.id) }
        }
    }

    // MARK: - Pages

    private var ingredientsPage: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                Text("Get everything out")
                    .font(Theme.Fonts.heroTitle)
                    .foregroundStyle(Theme.Colors.ink)
                    .accessibilityAddTraits(.isHeader)
                Text("Tap each one as it goes on the counter.")
                    .font(Theme.Fonts.body)
                    .foregroundStyle(Theme.Colors.text2)
                VStack(spacing: 0) {
                    ForEach(ingredients) { ingredient in
                        if ingredient.id > 0 {
                            Rectangle().fill(Theme.Colors.separator).frame(height: 0.5)
                                .padding(.leading, Theme.Space.m)
                        }
                        ingredientRow(ingredient)
                    }
                }
                .surfaceCard(padding: 0)
            }
            .padding(.horizontal, Theme.Space.gutter)
            .padding(.vertical, Theme.Space.m)
        }
    }

    private func ingredientRow(_ ingredient: Ingredient) -> some View {
        let isGathered = gathered.contains(ingredient.id)
        return Button {
            if isGathered { gathered.remove(ingredient.id) } else { gathered.insert(ingredient.id) }
        } label: {
            HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
                Image(systemName: isGathered ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isGathered ? Theme.Colors.fresh : Theme.Colors.text3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ingredient.name)
                        .font(Theme.Fonts.cardTitle)
                        .foregroundStyle(isGathered ? Theme.Colors.text3 : Theme.Colors.ink)
                        .strikethrough(isGathered, color: Theme.Colors.text3)
                    if !ingredient.note.isEmpty {
                        Text(ingredient.note)
                            .font(Theme.Fonts.detail)
                            .foregroundStyle(Theme.Colors.text2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if !ingredient.quantity.isEmpty {
                    Text(ingredient.quantity)
                        .font(Theme.Fonts.detailStrong)
                        .foregroundStyle(Theme.Colors.text2)
                        .multilineTextAlignment(.trailing)
                }
            }
            .multilineTextAlignment(.leading)
            .padding(.horizontal, Theme.Space.m)
            .padding(.vertical, Theme.Space.s)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([ingredient.quantity, ingredient.name, ingredient.note].filter { !$0.isEmpty }.joined(separator: ", "))
        .accessibilityAddTraits(isGathered ? [.isButton, .isSelected] : .isButton)
    }

    private func stepPage(number: Int, text: String) -> some View {
        let stepTimers = StepTimers.find(in: text)
        return ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                Text("STEP \(number)")
                    .font(Theme.Fonts.eyebrow)
                    .foregroundStyle(Theme.Colors.plumText)
                    .accessibilityHidden(true)
                Text(text)
                    .font(.system(.title2, weight: .semibold))
                    .foregroundStyle(Theme.Colors.ink)
                    .lineSpacing(6)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityLabel(String(localized: "Step \(number): \(text)"))
                if !stepTimers.isEmpty {
                    VStack(alignment: .leading, spacing: Theme.Space.xs) {
                        ForEach(stepTimers, id: \.self) { timer in
                            timerButton(timer, step: number)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Theme.Space.gutter)
            .padding(.vertical, Theme.Space.l)
        }
    }

    private func timerButton(_ timer: StepTimer, step: Int) -> some View {
        let running = timers.isRunning(step: step, phrase: timer.phrase)
        return Button {
            timers.start(timer, step: step)
        } label: {
            Label(running ? String(localized: "Timer running: \(timer.phrase)") : String(localized: "Start timer: \(timer.phrase)"),
                  systemImage: running ? "timer" : "play.fill")
        }
        .buttonStyle(SecondaryButtonStyle(size: .compact))
        .disabled(running)
        .accessibilityLabel(running ? String(localized: "\(timer.phrase) timer is running")
                                    : String(localized: "Start a \(Self.spoken(timer.seconds)) timer"))
    }

    // MARK: - Bottom

    private var bottomBar: some View {
        let isAX = dynamicTypeSize.isAccessibilitySize
        return Group {
            if isAX {
                VStack(spacing: Theme.Space.xs) { nextButton; backButton }
            } else {
                HStack(spacing: 10) { backButton; nextButton }
            }
        }
        .padding(.horizontal, Theme.Space.gutter)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity)
        .background(.bar)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.Colors.separator).frame(height: 0.5)
        }
    }

    private var backButton: some View {
        Button {
            page = max(0, page - 1)
        } label: {
            Label("Back", systemImage: "chevron.left")
        }
        .buttonStyle(SecondaryButtonStyle(fullWidth: true))
        .disabled(page == 0)
    }

    @ViewBuilder
    private var nextButton: some View {
        if page >= lastPage {
            Button {
                showCooked = true
            } label: {
                Label("I cooked this", systemImage: "frying.pan.fill")
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
        } else {
            Button {
                page = min(lastPage, page + 1)
            } label: {
                Label(page == 0 ? String(localized: "Start") : String(localized: "Next step"), systemImage: "chevron.right")
                    .labelStyle(TrailingIconLabelStyle())
            }
            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
        }
    }

    // MARK: - Formatting

    /// "7:42" or "1:05:00".
    static func clock(_ seconds: Int) -> String {
        let pattern: Duration.TimeFormatStyle.Pattern = seconds >= 3600 ? .hourMinuteSecond : .minuteSecond
        return Duration.seconds(seconds).formatted(.time(pattern: pattern))
    }

    /// "8 minutes", "1 hour, 30 minutes", in the app's language.
    static func spoken(_ seconds: Int) -> String {
        Duration.seconds(seconds).formatted(.units(allowed: [.hours, .minutes, .seconds], width: .wide))
    }
}

/// Text first, then the icon: "Next step ›".
private struct TrailingIconLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 6) {
            configuration.title
            configuration.icon
        }
    }
}
