import SwiftUI
import FridgeCore

// Heat = time. Freshness tags, dots, the Fridge strip and the kitchen-timer dial
// (DESIGN.md §2.3, §2.4, §5.4, §7.3, §7.9).

extension FreshTone {
    /// Guarded SF Symbol name (§5.4). Heat glyphs never use `flame`.
    var symbol: String {
        switch self {
        case .today: return Theme.symbol("alarm.fill", fallback: "alarm")
        case .soon: return Theme.symbol("hourglass", fallback: "clock")
        case .fresh: return Theme.symbol("leaf.fill", fallback: "leaf")
        case .paused: return Theme.symbol("snowflake", fallback: "snowflake")
        case .past: return Theme.symbol("exclamationmark.triangle", fallback: "exclamationmark.circle")
        case .none: return Theme.symbol("calendar", fallback: "circle")
        }
    }

    /// Tag text and glyph color.
    var foreground: Color {
        switch self {
        case .today: return Theme.Colors.onToday
        case .soon: return Theme.Colors.onSoon
        case .fresh: return Theme.Colors.fresh
        case .paused: return Theme.Colors.frost
        case .past: return Theme.Colors.past
        case .none: return Theme.Colors.text3
        }
    }

    /// Tape fill for today and soon; nil for text-only and outlined tags.
    var fill: Color? {
        switch self {
        case .today: return Theme.Colors.today
        case .soon: return Theme.Colors.soon
        case .fresh, .paused, .past, .none: return nil
        }
    }

    /// Dots, strip segments and meters.
    var mark: Color {
        switch self {
        case .today: return Theme.Colors.today
        case .soon: return Theme.Colors.soon
        case .fresh: return Theme.Colors.fresh
        case .paused: return Theme.Colors.frost
        case .past: return Theme.Colors.past
        case .none: return Theme.Colors.fillStrong
        }
    }

    /// Arc color on the dark dial face.
    var dialMark: Color {
        switch self {
        case .today: return Theme.Colors.dialToday
        case .soon: return Theme.Colors.dialSoon
        case .fresh: return Theme.Colors.dialFresh
        case .paused: return Theme.Colors.dialFrost
        case .past: return Theme.Colors.dialPast
        case .none: return Theme.Colors.dialTrack
        }
    }

    /// Legend label, shared with the web preview (§6.2).
    var legendLabel: String {
        switch self {
        case .past: return "past date"
        case .today: return "by tomorrow"
        case .soon: return "this week"
        case .fresh: return "fresh"
        case .paused: return "frozen"
        case .none: return "no date"
        }
    }
}

// MARK: - TapeShape

/// Kitchen date tape: a rectangle with zig-zag notches on each short end.
/// Fallback: `RoundedRectangle(cornerRadius: 3)`; color and words carry the meaning.
struct TapeShape: Shape {
    var notch: CGFloat = 3
    var teeth = 3

    func path(in r: CGRect) -> Path {
        guard teeth > 0, r.width > notch * 2, r.height > 0 else { return Path(r) }
        var p = Path()
        let step = r.height / CGFloat(teeth * 2)
        p.move(to: CGPoint(x: r.minX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
        for i in 1...(teeth * 2) {
            p.addLine(to: CGPoint(x: i.isMultiple(of: 2) ? r.maxX : r.maxX - notch, y: r.minY + step * CGFloat(i)))
        }
        p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        for i in stride(from: teeth * 2 - 1, through: 0, by: -1) {
            p.addLine(to: CGPoint(x: i.isMultiple(of: 2) ? r.minX : r.minX + notch, y: r.minY + step * CGFloat(i)))
        }
        p.closeSubpath()
        return p
    }
}

// MARK: - FreshnessTag

/// The expiry indicator: tape for today/soon, an outline for past, quiet text otherwise.
struct FreshnessTag: View {
    enum Size { case regular, small }

    let status: ExpiryStatus
    var location: StorageLocation? = nil
    var estimated: Bool = false
    var size: Size = .regular
    var showsNoDate: Bool = false

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    init(status: ExpiryStatus, location: StorageLocation? = nil, estimated: Bool = false,
         size: Size = .regular, showsNoDate: Bool = false) {
        self.status = status
        self.location = location
        self.estimated = estimated
        self.size = size
        self.showsNoDate = showsNoDate
    }

    var body: some View {
        let tone = status.tone(inFreezer: location == .freezer)
        if tone != FreshTone.none {
            styledTag(tone)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(spokenLabel)
        } else if showsNoDate {
            Text(status.shortLabel)
                .font(Theme.Fonts.tag)
                .foregroundStyle(Theme.Colors.text3)
                .lineLimit(1)
                .fixedSize()
                .accessibilityLabel(spokenLabel)
        }
    }

    private var spokenLabel: String {
        (estimated ? "About: " : "") + status.spokenLabel(inFreezer: location == .freezer)
    }

    @ViewBuilder
    private func styledTag(_ tone: FreshTone) -> some View {
        let boxed = tone.fill != nil || tone == .past
        let horizontal: CGFloat = boxed ? (size == .small ? 8 : 10) : 0
        let vertical: CGFloat = size == .small ? 3 : 5
        let content = HStack(spacing: 4) {
            Image(systemName: tone.symbol)
                .imageScale(.small)
            Text((estimated ? "~" : "") + status.shortLabel)
        }
        .font(Theme.Fonts.tag)
        .foregroundStyle(tone.foreground)
        .lineLimit(1)
        .padding(.horizontal, horizontal)
        .padding(.vertical, vertical)
        .fixedSize()

        if let fill = tone.fill {
            content
                .background(fill, in: TapeShape())
                .overlay {
                    if tone == .soon && colorScheme == .light {
                        TapeShape().stroke(Theme.Colors.tapeEdge, lineWidth: 0.5)
                    }
                }
                .overlay {
                    if colorSchemeContrast == .increased {
                        TapeShape().stroke(Theme.Colors.ink, lineWidth: 1)
                    }
                }
        } else if tone == .past {
            content
                .overlay {
                    RoundedRectangle(cornerRadius: Theme.Radius.tag, style: .continuous)
                        .strokeBorder(Theme.Colors.past, lineWidth: 1.25)
                }
        } else {
            content
        }
    }
}

// MARK: - ToneDot

/// A filled circle in `tone.mark`; `.past` is hollow. Decorative.
struct ToneDot: View {
    let tone: FreshTone
    var size: CGFloat = 8

    init(_ tone: FreshTone, size: CGFloat = 8) {
        self.tone = tone
        self.size = size
    }

    var body: some View {
        Group {
            if tone == .past {
                Circle().strokeBorder(tone.mark, lineWidth: 1.5)
            } else {
                Circle().fill(tone.mark)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

// MARK: - FreshnessStrip

/// The one-glance freshness signal on the Fridge (and, without a headline, on receipt review).
struct FreshnessStrip: View {
    let counts: FreshnessCounts
    @Binding var filter: FreshTone?
    var showsHeadline: Bool = true
    var onHeadlineTap: (() -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(counts: FreshnessCounts, filter: Binding<FreshTone?>, showsHeadline: Bool = true,
         onHeadlineTap: (() -> Void)? = nil) {
        self.counts = counts
        self._filter = filter
        self.showsHeadline = showsHeadline
        self.onHeadlineTap = onHeadlineTap
    }

    private struct Segment {
        let tone: FreshTone
        let count: Int
    }

    private static let order: [FreshTone] = [.past, .today, .soon, .fresh, .paused, .none]

    private var segments: [Segment] {
        Self.order
            .map { Segment(tone: $0, count: counts.count(for: $0)) }
            .filter { $0.count > 0 }
    }

    /// Non-zero tones, plus the active filter so it can always be cleared.
    private var legendTones: [FreshTone] {
        let active: FreshTone? = filter
        return Self.order.filter { tone in counts.count(for: tone) > 0 || active == tone }
    }

    private var isAllFresh: Bool {
        counts.total > 0 && counts.past == 0 && counts.byTomorrow == 0 && counts.soon == 0
    }

    var body: some View {
        if showsHeadline {
            content
                .surfaceCard(padding: Theme.Space.cardPadding, radius: Theme.Radius.card)
        } else {
            content
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 12) {
            if showsHeadline {
                headline
            }
            bar
            legend
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(counts.spokenSummary)
    }

    // MARK: Headline

    @ViewBuilder
    private var headline: some View {
        if let onHeadlineTap {
            Button(action: onHeadlineTap) {
                headlineLabel
            }
            .buttonStyle(.plain)
            .accessibilityHint("Shows items to use soon")
        } else {
            headlineLabel
        }
    }

    private var headlineLabel: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            if isAllFresh {
                Image(systemName: FreshTone.fresh.symbol)
                    .foregroundStyle(Theme.Colors.fresh)
            }
            Text(counts.headline)
                .foregroundStyle(Theme.Colors.ink)
                .multilineTextAlignment(.leading)
        }
        .font(Theme.Fonts.section)
        .accessibilityAddTraits(.isHeader)
    }

    // MARK: Bar

    private var bar: some View {
        GeometryReader { geo in
            let shown = segments
            let total = CGFloat(max(shown.reduce(0) { $0 + $1.count }, 1))
            let gaps = CGFloat(max(shown.count - 1, 0)) * 3
            if shown.isEmpty {
                Capsule().fill(Theme.Colors.fillStrong)
            } else {
                HStack(spacing: 3) {
                    ForEach(shown, id: \.tone) { s in
                        segmentShape(s.tone)
                            .frame(width: max(10, (geo.size.width - gaps) * CGFloat(s.count) / total))
                            .opacity(filter == nil || filter == s.tone ? 1 : 0.35)
                    }
                }
            }
        }
        .frame(height: Theme.Metrics.stripHeight)
        .clipShape(Capsule())
        .motionAnimation(Theme.Motion.smooth, value: counts)
        .motionAnimation(Theme.Motion.snappy, value: filter)
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private func segmentShape(_ tone: FreshTone) -> some View {
        if tone == .past {
            RoundedRectangle(cornerRadius: Theme.Radius.strip, style: .continuous)
                .strokeBorder(Theme.Colors.past, lineWidth: 1.5)
        } else {
            RoundedRectangle(cornerRadius: Theme.Radius.strip, style: .continuous)
                .fill(tone.mark)
        }
    }

    // MARK: Legend

    @ViewBuilder
    private var legend: some View {
        let tones = legendTones
        if !tones.isEmpty {
            if dynamicTypeSize.isAccessibilitySize {
                legendGrid(tones)
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 6) {
                        ForEach(tones, id: \.self) { tone in
                            legendEntry(tone)
                        }
                    }
                    legendGrid(tones)
                }
            }
        }
    }

    private func legendGrid(_ tones: [FreshTone]) -> some View {
        Grid(alignment: .leading, horizontalSpacing: 6, verticalSpacing: 6) {
            ForEach(Array(stride(from: 0, to: tones.count, by: 2)), id: \.self) { i in
                GridRow {
                    legendEntry(tones[i])
                    if i + 1 < tones.count {
                        legendEntry(tones[i + 1])
                    }
                }
            }
        }
    }

    private func legendEntry(_ tone: FreshTone) -> some View {
        let count = counts.count(for: tone)
        let isSelected = filter == tone
        let spoken = "\(count) \(tone.legendLabel)"
        return Button {
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                if isSelected {
                    filter = nil
                } else {
                    filter = tone
                }
            }
        } label: {
            HStack(spacing: 6) {
                ToneDot(tone)
                Text("\(count)")
                    .font(Theme.Fonts.number)
                    .foregroundStyle(Theme.Colors.ink)
                    .contentTransition(.numericText())
                Text(tone.legendLabel)
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
            }
            .lineLimit(1)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .frame(minHeight: Theme.Metrics.minTap)
            .background(isSelected ? Theme.Colors.fill : Color.clear, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(spoken)
        .accessibilityHint("Filters the list")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - FreshnessDial

/// The kitchen timer: a dark face with a 14-day arc. Decorative; the container carries the spoken label.
struct FreshnessDial: View {
    /// 64 / 168pt × min(@ScaledMetric scale, 1.4)
    enum Size { case small, large }

    let status: ExpiryStatus
    var location: StorageLocation? = nil
    var size: Size = .large
    var animatesIn: Bool = true

    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shownFraction: Double = 0

    init(status: ExpiryStatus, location: StorageLocation? = nil, size: Size = .large, animatesIn: Bool = true) {
        self.status = status
        self.location = location
        self.size = size
        self.animatesIn = animatesIn
    }

    var body: some View {
        let isLarge = size == .large
        let factor = min(scale, 1.4)
        let diameter = (isLarge ? Theme.Metrics.dialLarge : Theme.Metrics.dialSmall) * factor
        let lineWidth: CGFloat = (isLarge ? 12 : 6) * factor
        let inset: CGFloat = (isLarge ? 26 : 8) * factor
        let tone = status.tone(inFreezer: location == .freezer)
        let parts = status.dialParts
        let innerDiameter = max(diameter - 2 * (inset + lineWidth / 2) - 8, 16)

        ZStack {
            // 1. Face
            Circle().fill(Theme.Colors.dialFace)
            if !isLarge {
                Circle().strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }

            // 2. Ticks
            if isLarge {
                ForEach(0..<14, id: \.self) { i in
                    Capsule()
                        .fill(Theme.Colors.dialTick)
                        .frame(width: 3, height: 8)
                        .offset(y: -(diameter / 2 - 10 * factor))
                        .rotationEffect(.degrees(Double(i) / 14 * 360))
                }
            }

            // 3. Track
            if tone == .past {
                Circle()
                    .inset(by: inset)
                    .stroke(Theme.Colors.dialPast, style: StrokeStyle(lineWidth: lineWidth * 0.5, dash: [4, 5]))
            } else {
                Circle()
                    .inset(by: inset)
                    .stroke(Theme.Colors.dialTrack, lineWidth: lineWidth)
            }

            // 4. Arc
            if shownFraction > 0 {
                Circle()
                    .inset(by: inset)
                    .trim(from: 0, to: CGFloat(shownFraction))
                    .stroke(tone.dialMark, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }

            // 5. Center
            VStack(spacing: 0) {
                if isLarge && tone == .paused {
                    Image(systemName: FreshTone.paused.symbol)
                        .font(Theme.Fonts.footnote.weight(.semibold))
                }
                Text(parts.value)
                    .font(isLarge ? Theme.Fonts.displayNumber : Theme.Fonts.number)
                if isLarge {
                    Text(parts.unit)
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Color.white.opacity(0.75))
                }
            }
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: innerDiameter)
        }
        .frame(width: diameter, height: diameter)
        .onAppear {
            let target = status.dialFraction
            if animatesIn && !reduceMotion {
                shownFraction = 0
                withAnimation(.smooth(duration: 0.7)) {
                    shownFraction = target
                }
            } else {
                shownFraction = target
            }
        }
        .onChange(of: status) { _, newValue in
            if reduceMotion {
                shownFraction = newValue.dialFraction
            } else {
                withAnimation(Theme.Motion.smooth) {
                    shownFraction = newValue.dialFraction
                }
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Migration shim

/// Kept until every screen is migrated (§7.9).
@available(*, deprecated, message: "Use FreshnessTag")
struct ExpiryBadge: View {
    let status: ExpiryStatus

    init(status: ExpiryStatus) {
        self.status = status
    }

    var body: some View {
        FreshnessTag(status: status)
    }
}
