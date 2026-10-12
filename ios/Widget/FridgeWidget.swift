import FridgeCore
import SwiftUI
import WidgetKit

/// The expiring-soon widget (DESIGN.md §8.18): what to use up first, on the Home Screen and Lock Screen.
/// It reads the copy of the fridge's dates the app saves (`WidgetSnapshot`) and works out "today" and
/// "3 days" itself, with a new entry each midnight. Tapping it opens Fridge.
@main
struct FridgeWidgetBundle: WidgetBundle {
    var body: some Widget {
        UseSoonWidget()
    }
}

struct UseSoonWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "UseSoon", provider: UseSoonProvider()) { entry in
            UseSoonView(entry: entry)
                .containerBackground(for: .widget) { Theme.Colors.surface }
                .widgetURL(URL(string: "fridge://fridge"))
        }
        .configurationDisplayName("Use soon")
        .description("What to use up first, before it goes bad.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

// MARK: - Timeline

struct UseSoonEntry: TimelineEntry {
    let date: Date
    /// Nil before the app has saved anything (just installed, or never opened).
    let snapshot: WidgetSnapshot?

    struct Row {
        let name: String
        let status: ExpiryStatus
        let inFreezer: Bool
    }

    /// Items to use soon or past their date, most urgent first.
    var urgent: [Row] {
        guard let snapshot else { return [] }
        return snapshot.items.compactMap { item in
            let status = ExpiryStatus.of(expiresAt: item.expiresAt, now: date, soonThresholdDays: snapshot.soonThresholdDays)
            return status.isUrgent ? Row(name: item.name, status: status, inFreezer: item.inFreezer) : nil
        }
    }

    /// The next thing to use when nothing is urgent.
    var next: Row? {
        guard let snapshot, let item = snapshot.items.first(where: { $0.expiresAt >= date }) else { return nil }
        let status = ExpiryStatus.of(expiresAt: item.expiresAt, now: date, soonThresholdDays: snapshot.soonThresholdDays)
        return Row(name: item.name, status: status, inFreezer: item.inFreezer)
    }

    var counts: FreshnessCounts {
        guard let snapshot else { return FreshnessCounts() }
        var counts = FreshnessCounts(snapshot.items.map {
            (status: ExpiryStatus.of(expiresAt: $0.expiresAt, now: date, soonThresholdDays: snapshot.soonThresholdDays),
             inFreezer: $0.inFreezer)
        })
        // Undated items count toward "is there anything here" but not toward the urgent lines.
        counts.noDate = max(0, snapshot.totalCount - snapshot.items.count)
        return counts
    }

    static let sample = UseSoonEntry(date: .now, snapshot: WidgetSnapshot(
        items: [
            .init(name: String(localized: "Spinach"), expiresAt: .now, inFreezer: false),
            .init(name: String(localized: "Chicken thighs"), expiresAt: .now.addingTimeInterval(86_400.0), inFreezer: false),
            .init(name: String(localized: "Greek yogurt"), expiresAt: .now.addingTimeInterval(2 * 86_400.0), inFreezer: false),
            .init(name: String(localized: "Strawberries"), expiresAt: .now.addingTimeInterval(3 * 86_400.0), inFreezer: false),
        ],
        totalCount: 14, soonThresholdDays: 3))
}

struct UseSoonProvider: TimelineProvider {
    func placeholder(in context: Context) -> UseSoonEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (UseSoonEntry) -> Void) {
        let saved = WidgetSnapshot.load()
        // The widget gallery shows the sample until there's something real to show.
        completion(context.isPreview && (saved?.items.isEmpty ?? true) ? .sample : UseSoonEntry(date: .now, snapshot: saved))
    }

    /// Now, then each of the next three midnights, when "tomorrow" becomes "today".
    func getTimeline(in context: Context, completion: @escaping (Timeline<UseSoonEntry>) -> Void) {
        let snapshot = WidgetSnapshot.load()
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        var entries = [UseSoonEntry(date: .now, snapshot: snapshot)]
        for day in 1...3 {
            if let midnight = calendar.date(byAdding: .day, value: day, to: today) {
                entries.append(UseSoonEntry(date: midnight, snapshot: snapshot))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - Views

struct UseSoonView: View {
    let entry: UseSoonEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryInline: inline
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        case .systemMedium: medium
        default: small
        }
    }

    private var headline: String {
        entry.snapshot == nil ? String(localized: "Open Fridge to start") : entry.counts.localizedHeadline
    }

    private var headlineColor: Color {
        let counts = entry.counts
        if counts.byTomorrow > 0 { return Theme.Colors.todayText }
        if counts.soon > 0 { return Theme.Colors.soonText }
        return Theme.Colors.ink
    }

    // MARK: Home Screen

    private var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            header
            Text(headline)
                .font(.system(.subheadline, weight: .heavy))
                .foregroundStyle(headlineColor)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
            Spacer(minLength: 0)
            rows(limit: 3, compact: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var medium: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                header
                Text(headline)
                    .font(.system(.title3, weight: .heavy))
                    .foregroundStyle(headlineColor)
                    .lineLimit(3)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
            }
            .frame(width: 118, alignment: .leading)
            rows(limit: 4, compact: false)
                .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var header: some View {
        Label("Use soon", systemImage: "refrigerator.fill")
            .font(Theme.Fonts.eyebrow)
            .foregroundStyle(Theme.Colors.plumText)
            .textCase(.uppercase)
            .lineLimit(1)
    }

    @ViewBuilder
    private func rows(limit: Int, compact: Bool) -> some View {
        let urgent = entry.urgent
        if urgent.isEmpty {
            if let next = entry.next {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Next up")
                        .font(Theme.Fonts.caption)
                        .foregroundStyle(Theme.Colors.text3)
                    row(next)
                }
            } else if entry.snapshot != nil {
                Text(entry.counts.total == 0 ? String(localized: "Scan a receipt or add food in Fridge.")
                                             : String(localized: "Nothing with a date yet."))
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
            }
        } else {
            VStack(alignment: .leading, spacing: compact ? 4 : 6) {
                ForEach(Array(urgent.prefix(limit).enumerated()), id: \.offset) { _, item in
                    row(item)
                }
                if urgent.count > limit {
                    Text("+\(urgent.count - limit) more")
                        .font(Theme.Fonts.caption)
                        .foregroundStyle(Theme.Colors.text3)
                }
            }
        }
    }

    private func row(_ item: UseSoonEntry.Row) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color(for: item))
                .frame(width: 7, height: 7)
            Text(item.name)
                .font(.system(.footnote, weight: .semibold))
                .foregroundStyle(Theme.Colors.ink)
                .lineLimit(1)
            Spacer(minLength: 4)
            Text(item.status.localizedShort)
                .font(Theme.Fonts.tag)
                .foregroundStyle(textColor(for: item))
                .lineLimit(1)
                .layoutPriority(1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(String(localized: "\(item.name), \(item.status.localizedSpoken(inFreezer: item.inFreezer).lowercased())"))
    }

    private func color(for item: UseSoonEntry.Row) -> Color {
        switch item.status.tone(inFreezer: item.inFreezer) {
        case .today: Theme.Colors.today
        case .soon: Theme.Colors.soon
        case .past: Theme.Colors.past
        case .paused: Theme.Colors.frost
        case .fresh: Theme.Colors.fresh
        case .none: Theme.Colors.text3
        }
    }

    private func textColor(for item: UseSoonEntry.Row) -> Color {
        switch item.status.tone(inFreezer: item.inFreezer) {
        case .today: Theme.Colors.todayText
        case .soon: Theme.Colors.soonText
        default: Theme.Colors.text2
        }
    }

    // MARK: Lock Screen

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Label(headline, systemImage: "refrigerator.fill")
                .font(.system(.headline, weight: .bold))
                .lineLimit(1)
                .widgetAccentable()
            ForEach(Array(entry.urgent.prefix(2).enumerated()), id: \.offset) { _, item in
                Text("\(item.name) · \(item.status.localizedShort)")
                    .font(.caption)
                    .lineLimit(1)
            }
            if entry.urgent.isEmpty, let next = entry.next {
                Text("Next: \(next.name) · \(next.status.localizedShort)")
                    .font(.caption)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var circular: some View {
        let count = entry.counts.byTomorrow + entry.counts.soon
        return ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: "refrigerator.fill")
                    .font(.caption2)
                Text("\(count)")
                    .font(.system(.title2, design: .rounded, weight: .black))
                    .widgetAccentable()
            }
        }
        .accessibilityLabel(String(localized: "\(count) to use soon"))
    }

    private var inline: some View {
        if let first = entry.urgent.first {
            let more = entry.urgent.count - 1
            return Text(more > 0 ? String(localized: "\(first.name) \(first.status.localizedShort.lowercased()) · \(more) more")
                                 : String(localized: "\(first.name) \(first.status.localizedShort.lowercased())"))
        }
        return Text(headline)
    }
}
