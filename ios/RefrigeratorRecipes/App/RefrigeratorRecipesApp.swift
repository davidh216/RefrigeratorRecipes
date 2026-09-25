import SwiftUI
import SwiftData

@main
struct RefrigeratorRecipesApp: App {
    let container = AppSchema.makeContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }
}

struct RootView: View {
    enum Tab: Hashable { case fridge, recipes, plan, shopping, chef }

    @State private var tab: Tab = .fridge
    @Environment(\.scenePhase) private var scenePhase
    @Query private var pantry: [PantryItem]

    @AppStorage(SettingsKey.reminderLeadDays) private var leadDays = SettingsDefault.reminderLeadDays
    @AppStorage(SettingsKey.reminderHour) private var reminderHour = SettingsDefault.reminderHour
    @AppStorage(SettingsKey.remindersEnabled) private var remindersEnabled = SettingsDefault.remindersEnabled

    var body: some View {
        TabView(selection: $tab) {
            PantryView()
                .tabItem { Label("Fridge", systemImage: "refrigerator") }
                .tag(Tab.fridge)
            RecipesView()
                .tabItem { Label("Recipes", systemImage: "book") }
                .tag(Tab.recipes)
            MealPlanView()
                .tabItem { Label("Plan", systemImage: "calendar") }
                .tag(Tab.plan)
            ShoppingListView()
                .tabItem { Label("Shopping", systemImage: "cart") }
                .tag(Tab.shopping)
            ChefView()
                .tabItem { Label("Chef", systemImage: "sparkles") }
                .tag(Tab.chef)
        }
        .task(id: reminderSignature) { await rescheduleReminders() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await rescheduleReminders() } }
        }
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
