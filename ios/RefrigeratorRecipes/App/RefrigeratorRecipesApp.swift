import SwiftUI
import SwiftData
import FridgeCore

@main
struct RefrigeratorRecipesApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    let container = AppSchema.makeContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }
}

struct RootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @Query private var pantry: [PantryItem]

    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.reminderLeadDays) private var leadDays = SettingsDefault.reminderLeadDays
    @AppStorage(SettingsKey.reminderHour) private var reminderHour = SettingsDefault.reminderHour
    @AppStorage(SettingsKey.remindersEnabled) private var remindersEnabled = SettingsDefault.remindersEnabled
    @AppStorage(SettingsKey.checkInReminderEnabled) private var checkInReminder = SettingsDefault.checkInReminderEnabled
    @AppStorage(SettingsKey.checkInWeekday) private var checkInWeekday = SettingsDefault.checkInWeekday
    @ObservedObject private var router = AppRouter.shared

    /// Tab glyphs (DESIGN.md §5.6). The system fills them when selected.
    /// `basket` is guarded because a missing symbol renders blank with no build error.
    private static let shoppingSymbol = Theme.symbol("basket", fallback: "cart")

    var body: some View {
        TabView(selection: $router.tab) {
            TonightView()
                .tabItem { Label("Tonight", systemImage: "fork.knife") }
                .tag(AppTab.tonight)
            PantryView()
                .tabItem { Label("Fridge", systemImage: "refrigerator") }
                .badge(nowCount)
                .tag(AppTab.fridge)
            RecipesView()
                .tabItem { Label("Recipes", systemImage: "book.closed") }
                .tag(AppTab.recipes)
            MealPlanView()
                .tabItem { Label("Plan", systemImage: "calendar") }
                .tag(AppTab.plan)
            ShoppingListView()
                .tabItem { Label("Shopping", systemImage: Self.shoppingSymbol) }
                .tag(AppTab.shopping)
        }
        // Beet = do: the selected tab, toolbar buttons, links and toggles everywhere below.
        .tint(Theme.Colors.beetText)
        .task(id: reminderSignature) { await rescheduleReminders() }
        .task(id: "\(checkInReminder)|\(checkInWeekday)") {
            await ExpiryNotifier.scheduleWeeklyCheckIn(enabled: checkInReminder, weekday: checkInWeekday)
        }
        .sheet(isPresented: $router.checkInRequested) { CheckInView() }
        .onChange(of: router.checkInRequested) { _, requested in
            if requested { router.tab = .fridge }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await rescheduleReminders() } }
        }
    }

    /// Food to use tonight: items that are `.expiringSoon(0 or 1)` with the user's soon threshold.
    /// It is the Fridge tab badge, so the signal is visible from every tab. `badge(0)` hides it.
    /// Recomputed whenever the pantry changes and when the app comes back to the foreground.
    private var nowCount: Int {
        var counts = FreshnessCounts()
        for item in pantry {
            counts.add(item.expiryStatus(soonThresholdDays: soonDays), inFreezer: item.inFreezer)
        }
        return counts.byTomorrow
    }

    /// Changes whenever anything that affects reminders changes.
    private var reminderSignature: String {
        let items = pantry.map { "\($0.uuid)\($0.name)\($0.expiresAt?.timeIntervalSince1970 ?? 0)" }.sorted().joined()
        return "\(items)|\(leadDays)|\(reminderHour)|\(remindersEnabled)"
    }

    private func rescheduleReminders() async {
        let entries = pantry.compactMap { item -> ExpiryNotifier.Entry? in
            guard let date = item.expiresAt else { return nil }
            return .init(id: item.uuid, name: item.name, expiresAt: date)
        }
        await ExpiryNotifier.reschedule(entries, leadDays: leadDays, hour: reminderHour, enabled: remindersEnabled)
    }
}

#Preview {
    RootView()
        .modelContainer(AppSchema.makeContainer(inMemory: true))
}
