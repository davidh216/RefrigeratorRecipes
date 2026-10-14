import AudioToolbox
import FridgeCore
import Foundation
import UserNotifications

/// The timers running in cooking mode. Each counts down to a date, so it keeps time while the phone is
/// locked, and a local notification goes off then too. While Fridge is open, the timer chimes in the app
/// instead (`AppDelegate` hides these notifications in the foreground).
@MainActor
final class CookingTimers: ObservableObject {
    struct Running: Identifiable, Equatable {
        let id = UUID()
        /// 1-based step number, for "Step 3".
        let step: Int
        /// The words in the step, such as "8 to 10 minutes".
        let phrase: String
        let total: Int
        /// When it rings; nil while paused.
        var endsAt: Date?
        /// Seconds left when paused.
        var pausedRemaining: Int?
        var isFinished = false

        func remaining(at now: Date = .now) -> Int {
            if isFinished { return 0 }
            if let pausedRemaining { return pausedRemaining }
            return max(0, Int((endsAt ?? now).timeIntervalSince(now).rounded(.up)))
        }
    }

    nonisolated static let notificationPrefix = "cook-timer-"

    @Published private(set) var timers: [Running] = []
    /// Goes up each time a timer finishes, for the haptic.
    @Published private(set) var finishedCount = 0

    private let recipeTitle: String
    private var waits: [UUID: Task<Void, Never>] = [:]
    private var askedForNotifications = false

    init(recipeTitle: String) {
        self.recipeTitle = recipeTitle
    }

    /// Whether this step's timer is already counting (so its button doesn't start a second one).
    func isRunning(step: Int, phrase: String) -> Bool {
        timers.contains { $0.step == step && $0.phrase == phrase && !$0.isFinished }
    }

    func start(_ timer: StepTimer, step: Int) {
        var running = Running(step: step, phrase: timer.phrase, total: timer.seconds)
        running.endsAt = Date.now.addingTimeInterval(TimeInterval(timer.seconds))
        timers.append(running)
        schedule(running)
        if !askedForNotifications {
            askedForNotifications = true
            // A notification added before permission is decided is dropped, so the first timer's is
            // added again once the answer is in.
            Task {
                guard await ExpiryNotifier.requestAuthorization() else { return }
                for timer in timers where timer.endsAt != nil && !timer.isFinished { notify(timer) }
            }
        }
    }

    func togglePause(_ id: UUID) {
        guard let index = timers.firstIndex(where: { $0.id == id }), !timers[index].isFinished else { return }
        if let paused = timers[index].pausedRemaining {
            timers[index].pausedRemaining = nil
            timers[index].endsAt = Date.now.addingTimeInterval(TimeInterval(paused))
            schedule(timers[index])
        } else {
            timers[index].pausedRemaining = timers[index].remaining()
            timers[index].endsAt = nil
            unschedule(id)
        }
    }

    /// Stops a timer, or clears one that has finished.
    func remove(_ id: UUID) {
        unschedule(id)
        clearDelivered([id])
        timers.removeAll { $0.id == id }
    }

    func removeAll() {
        for timer in timers { unschedule(timer.id) }
        clearDelivered(timers.map(\.id))
        timers.removeAll()
    }

    private func schedule(_ timer: Running) {
        guard let endsAt = timer.endsAt else { return }
        let id = timer.id
        waits[id]?.cancel()
        waits[id] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(max(0, endsAt.timeIntervalSinceNow)))
            guard !Task.isCancelled else { return }
            self?.finish(id)
        }
        notify(timer)
    }

    private func notify(_ timer: Running) {
        guard let endsAt = timer.endsAt else { return }
        let content = UNMutableNotificationContent()
        content.title = recipeTitle
        content.body = String(localized: "Step \(timer.step) timer is done (\(timer.phrase)).")
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, endsAt.timeIntervalSinceNow), repeats: false)
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: Self.notificationPrefix + timer.id.uuidString, content: content, trigger: trigger))
    }

    /// Notifications that already went off (on the Lock Screen) for timers that are now cleared.
    private func clearDelivered(_ ids: [UUID]) {
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ids.map { Self.notificationPrefix + $0.uuidString })
    }

    private func unschedule(_ id: UUID) {
        waits[id]?.cancel()
        waits[id] = nil
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [Self.notificationPrefix + id.uuidString])
    }

    private func finish(_ id: UUID) {
        guard let index = timers.firstIndex(where: { $0.id == id }), !timers[index].isFinished else { return }
        let endedAt = timers[index].endsAt ?? .now
        timers[index].isFinished = true
        timers[index].endsAt = nil
        waits[id] = nil
        // Finishing late means the phone was locked and the notification already rang; don't ring twice.
        guard Date.now.timeIntervalSince(endedAt) < 3 else { return }
        finishedCount += 1
        // A chime, or a vibration when the ringer is off.
        AudioServicesPlayAlertSound(SystemSoundID(1005))
    }
}
