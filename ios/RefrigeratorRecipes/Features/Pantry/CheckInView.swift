import SwiftUI
import SwiftData
import FridgeCore

/// The weekly two-minute check-in: confirm what's still in the kitchen, one card at a time.
struct CheckInView: View {
    enum Answer { case kept, used, tossed }

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query private var pantry: [PantryItem]
    @Query(filter: #Predicate<ShoppingItem> { !$0.isChecked }) private var shopping: [ShoppingItem]
    @Query private var events: [FoodEvent]
    @AppStorage(SettingsKey.soonThresholdDays) private var soonDays = SettingsDefault.soonThresholdDays
    @AppStorage(SettingsKey.lastCheckInAt) private var lastCheckInAt = SettingsDefault.lastCheckInAt

    /// Captured once when the check-in starts so the order doesn't shift while answering.
    @State private var queue: [PantryItem] = []
    @State private var started = false
    @State private var position = 0
    @State private var answers: [PersistentIdentifier: Answer] = [:]
    @State private var showSummary = false
    /// Gone items the user wants on the shopping list.
    @State private var restock: Set<PersistentIdentifier> = []

    private var current: PantryItem? { position < queue.count ? queue[position] : nil }

    var body: some View {
        NavigationStack {
            Group {
                if !started {
                    ProgressView()
                } else if queue.isEmpty {
                    ContentUnavailableView {
                        Label("All caught up", systemImage: "checkmark.seal")
                    } description: {
                        Text("Nothing in your kitchen needs checking right now.")
                    } actions: {
                        Button("Done") { finish() }.buttonStyle(.borderedProminent)
                    }
                } else if showSummary || current == nil {
                    summary
                } else if let item = current {
                    card(for: item)
                }
            }
            .navigationTitle(showSummary || current == nil ? "Check-in done" : "Weekly check-in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                if started, !queue.isEmpty, !showSummary, current != nil, !answers.isEmpty {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Finish") { showSummary = true }
                    }
                }
            }
        }
        .onAppear(perform: start)
    }

    // MARK: - Card

    private func card(for item: PantryItem) -> some View {
        VStack(spacing: 20) {
            VStack(spacing: 6) {
                ProgressView(value: Double(position), total: Double(queue.count))
                Text("\(position + 1) of \(queue.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            Spacer(minLength: 0)

            VStack(spacing: 12) {
                Image(systemName: item.location.symbol)
                    .font(.system(size: 34))
                    .foregroundStyle(Color.accentColor)
                Text(item.name)
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)
                let qty = QuantityFormatter.string(quantity: item.quantity, unit: item.unit)
                Text([qty, item.location.title].filter { !$0.isEmpty }.joined(separator: " · "))
                    .foregroundStyle(.secondary)
                ExpiryBadge(status: item.expiryStatus(soonThresholdDays: soonDays))
                Text(ageText(for: item))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
            .padding(.horizontal)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 20))

            Spacer(minLength: 0)

            VStack(spacing: 10) {
                answerButton("Still have it", systemImage: "checkmark", style: .accent) { answer(.kept, item) }
                HStack(spacing: 10) {
                    answerButton("Used it", systemImage: "fork.knife", style: .plain) { answer(.used, item) }
                    answerButton("Tossed it", systemImage: "trash", style: .destructive) { answer(.tossed, item) }
                }
                HStack {
                    Button("Undo") { undo() }
                        .disabled(position == 0)
                    Spacer()
                    Button("Skip") { advance() }
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .background(Color(.systemGroupedBackground))
        .animation(.snappy, value: position)
    }

    private enum AnswerStyle { case accent, plain, destructive }

    private func answerButton(_ title: String, systemImage: String, style: AnswerStyle, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
        }
        .buttonStyle(.plain)
        .foregroundStyle(style == .accent ? Color.white : style == .destructive ? Color.red : Color.primary)
        .background(
            style == .accent ? Color.accentColor : style == .destructive ? Color.red.opacity(0.12) : Color(.tertiarySystemFill),
            in: RoundedRectangle(cornerRadius: 14)
        )
    }

    private func ageText(for item: PantryItem) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        if let confirmed = item.lastConfirmedAt {
            return "Last confirmed \(formatter.localizedString(for: confirmed, relativeTo: .now))"
        }
        return "Added \(formatter.localizedString(for: item.addedAt, relativeTo: .now))"
    }

    // MARK: - Summary

    private var goneItems: [PantryItem] {
        queue.filter { answers[$0.persistentModelID] == .used || answers[$0.persistentModelID] == .tossed }
    }

    private var summary: some View {
        let kept = queue.filter { answers[$0.persistentModelID] == .kept }.count
        let used = queue.filter { answers[$0.persistentModelID] == .used }
        let tossed = queue.filter { answers[$0.persistentModelID] == .tossed }
        let tossedValue = tossed.compactMap(\.price).reduce(0, +)
        let monthStart = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
        let pending = (used.map { FoodOutcome(kind: .used, date: .now) } + tossed.map { FoodOutcome(kind: .tossed, date: .now, value: $0.price) })
        let month = WasteSummary.summarize(events.map(\.outcome) + pending, since: monthStart)
        let currency = Locale.current.currency?.identifier ?? "USD"

        return List {
            Section {
                LabeledContent("Still here", value: "\(kept)")
                LabeledContent("Used", value: "\(used.count)")
                LabeledContent("Tossed", value: tossedValue > 0 ? "\(tossed.count) · \(tossedValue.formatted(.currency(code: currency)))" : "\(tossed.count)")
            } footer: {
                if let rate = month.wasteRate {
                    Text("Last 30 days: \(month.tossedCount) of \(month.usedCount + month.tossedCount) items tossed (\(rate.formatted(.percent.precision(.fractionLength(0)))))" + (month.tossedValue > 0 ? ", about \(month.tossedValue.formatted(.currency(code: currency))) of food." : "."))
                }
            }

            let gone = goneItems
            if !gone.isEmpty {
                Section {
                    ForEach(gone) { item in
                        let onList = shopping.contains { IngredientName.matches($0.name, item.name) }
                        Toggle(isOn: Binding(
                            get: { restock.contains(item.persistentModelID) },
                            set: { if $0 { restock.insert(item.persistentModelID) } else { restock.remove(item.persistentModelID) } }
                        )) {
                            VStack(alignment: .leading) {
                                Text(item.name)
                                if onList { Text("Already on your list").font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                        .disabled(onList)
                    }
                } header: {
                    Text("Buy again?")
                }
            }

            Section {
                Button("Save check-in") { finish() }
                    .frame(maxWidth: .infinity)
                    .fontWeight(.semibold)
            }
        }
    }

    // MARK: - Actions

    private func start() {
        guard !started else { return }
        let candidates = pantry.map(\.checkInCandidate)
        queue = CheckIn.queue(candidates, soonThresholdDays: soonDays).map { pantry[$0] }
        started = true
    }

    private func answer(_ answer: Answer, _ item: PantryItem) {
        answers[item.persistentModelID] = answer
        if answer == .used { restock.insert(item.persistentModelID) } else { restock.remove(item.persistentModelID) }
        advance()
    }

    private func advance() {
        position += 1
        if position >= queue.count { showSummary = true }
    }

    private func undo() {
        guard position > 0 else { return }
        showSummary = false
        position -= 1
        answers[queue[position].persistentModelID] = nil
    }

    /// Answers are applied only here, so Close discards a half-done check-in.
    private func finish() {
        let now = Date.now
        let listed = shopping.map(\.name)
        for item in queue {
            switch answers[item.persistentModelID] {
            case .kept:
                item.lastConfirmedAt = now
            case .used, .tossed:
                let kind = answers[item.persistentModelID] == .tossed ? "tossed" : "used"
                context.insert(FoodEvent(kind: kind, item: item, date: now))
                if restock.contains(item.persistentModelID), !listed.contains(where: { IngredientName.matches($0, item.name) }) {
                    context.insert(ShoppingItem(name: item.name, reason: kind == "tossed" ? "Tossed" : "Used up"))
                }
                context.delete(item)
            case nil:
                break
            }
        }
        lastCheckInAt = now.timeIntervalSince1970
        dismiss()
    }
}
