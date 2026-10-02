import SwiftUI
import FridgeCore

// Cards, blocks, list and sheet chrome, headers, empty states, stickers, the
// order ticket and small controls (DESIGN.md §4, §7.7).

// MARK: - Container modifiers

private struct SurfaceCardModifier: ViewModifier {
    let padding: CGFloat
    let radius: CGFloat
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return content
            .padding(padding)
            .background(Theme.Colors.surface, in: shape)
            .overlay {
                if colorSchemeContrast == .increased {
                    shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
                }
            }
    }
}

extension View {
    /// Flat `surface` card. No shadow; a 1pt `separator` border under Increase Contrast.
    func surfaceCard(padding: CGFloat = Theme.Space.cardPadding, radius: CGFloat = Theme.Radius.card) -> some View {
        modifier(SurfaceCardModifier(padding: padding, radius: radius))
    }

    /// Full crate color behind the content, `onFill` foreground, clipped. Padding is the caller's job.
    /// Only for the hero objects listed in DESIGN.md §2.6.
    func crateBlock(_ category: FoodCategory, radius: CGFloat = Theme.Radius.hero) -> some View {
        let palette = category.palette
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return self
            .background(palette.fill, in: shape)
            .foregroundStyle(palette.onFill)
            .clipShape(shape)
    }

    /// For `List`: hidden scroll background on `canvas`, compact section spacing.
    func listChrome() -> some View {
        self.scrollContentBackground(.hidden)
            .background(Theme.Colors.canvas)
            .listSectionSpacing(.compact)
    }

    /// For every sheet root.
    func sheetChrome() -> some View {
        self.presentationDragIndicator(.visible)
            .presentationCornerRadius(Theme.Radius.deck)
            .presentationBackground(Theme.Colors.canvas)
    }

    /// Bottom bar for a sheet's one commit (or the chef composer).
    func actionBar<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        let barContent = content()
        return self.safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 8) {
                barContent
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 8)
            .frame(maxWidth: .infinity)
            .background(.bar)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(Theme.Colors.separator)
                    .frame(height: 0.5)
            }
        }
    }
}

// MARK: - SectionHeader

/// Use as `Section { … } header: { SectionHeader(…) }`.
/// Fallback if list header insets misbehave: `header: { Text(title) }.headerProminence(.increased)`.
struct SectionHeader: View {
    let title: String
    var count: Int? = nil
    var systemImage: String? = nil
    var symbolColor: Color = Theme.Colors.text2
    var tile: FoodCategory? = nil
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    @_disfavoredOverload
    init(_ title: String, count: Int? = nil, systemImage: String? = nil, symbolColor: Color = Theme.Colors.text2,
         tile: FoodCategory? = nil, actionTitle: String? = nil, action: (() -> Void)? = nil) {
        self.title = title
        self.count = count
        self.systemImage = systemImage
        self.symbolColor = symbolColor
        self.tile = tile
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                titleRow
                Spacer(minLength: 8)
                actionButton
            }
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    titleRow
                    Spacer(minLength: 0)
                }
                actionButton
            }
        }
        .textCase(nil)
        .padding(.top, 8)
        .padding(.bottom, 4)
    }

    @ViewBuilder
    private var titleRow: some View {
        if let tile {
            CategoryTile(tile, size: .small, style: .soft)
                .alignmentGuide(.firstTextBaseline) { d in d.height * 0.75 }
        } else if let systemImage {
            Image(systemName: systemImage)
                .font(.headline)
                .foregroundStyle(symbolColor)
                .accessibilityHidden(true)
        }
        Text(title)
            .font(Theme.Fonts.section)
            .foregroundStyle(Theme.Colors.ink)
            .accessibilityAddTraits(.isHeader)
        if let count {
            Text("\(count)")
                .font(Theme.Fonts.tag)
                .foregroundStyle(Theme.Colors.text2)
                .contentTransition(.numericText())
        }
    }

    @ViewBuilder
    private var actionButton: some View {
        if let actionTitle, let action {
            Button(actionTitle, action: action)
                .buttonStyle(QuietButtonStyle(color: Theme.Colors.plumText))
        }
    }
}

// MARK: - SheetLede

/// The first content row of a sheet. Never repeats the navigation title.
struct SheetLede: View {
    let systemImage: String
    let text: String

    @ScaledMetric(relativeTo: .body) private var tileSide: CGFloat = 44

    @_disfavoredOverload
    init(systemImage: String, text: String) {
        self.systemImage = systemImage
        self.text = text
    }

    var body: some View {
        let side = min(tileSide, 64)
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Theme.Colors.plumText)
                .frame(width: side, height: side)
                .background(Theme.Colors.plumSoft, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .accessibilityHidden(true)
            Text(text)
                .font(Theme.Fonts.detail)
                .foregroundStyle(Theme.Colors.text2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
    }
}

// MARK: - EmptyStateView

struct EmptyAction: Identifiable {
    let id = UUID()
    /// Button label.
    let title: String
    var systemImage: String? = nil
    /// Non-nil makes a numbered to-do row ("Scan your last grocery receipt").
    var step: String? = nil
    let action: () -> Void

    @_disfavoredOverload
    init(title: String, systemImage: String? = nil, step: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.step = step
        self.action = action
    }
}

/// Left-aligned empty state: tile fan, title, message, actions.
/// `ContentUnavailableView.search(text:)` stays for search misses.
struct EmptyStateView: View {
    let tiles: [FoodCategory]
    let title: String
    let message: String
    var actions: [EmptyAction] = []

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @_disfavoredOverload
    init(tiles: [FoodCategory], title: String, message: String, actions: [EmptyAction] = []) {
        self.tiles = tiles
        self.title = title
        self.message = message
        self.actions = actions
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if !tiles.isEmpty {
                TileFan(tiles)
            }
            Text(title)
                .font(Theme.Fonts.titleHeavy)
                .foregroundStyle(Theme.Colors.ink)
                .accessibilityAddTraits(.isHeader)
            Text(message)
                .font(Theme.Fonts.body)
                .foregroundStyle(Theme.Colors.text2)
                .fixedSize(horizontal: false, vertical: true)
            if !actions.isEmpty {
                if actions.contains(where: { $0.step != nil }) {
                    stepRows
                } else {
                    buttonStack
                }
            }
        }
        .multilineTextAlignment(.leading)
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var stepRows: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(actions.indices, id: \.self) { index in
                if index > 0 {
                    Rectangle()
                        .fill(Theme.Colors.separator)
                        .frame(height: 0.5)
                }
                stepRow(number: index + 1, action: actions[index], isPrimary: index == 0)
            }
        }
    }

    @ViewBuilder
    private func stepRow(number: Int, action: EmptyAction, isPrimary: Bool) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            HStack(alignment: .top, spacing: 12) {
                stepNumber(number)
                VStack(alignment: .leading, spacing: 8) {
                    stepText(action)
                    actionButton(action, isPrimary: isPrimary, fullWidth: false, compact: true)
                }
            }
            .padding(.vertical, 12)
        } else {
            HStack(alignment: .center, spacing: 12) {
                stepNumber(number)
                stepText(action)
                Spacer(minLength: 8)
                actionButton(action, isPrimary: isPrimary, fullWidth: false, compact: true)
            }
            .padding(.vertical, 12)
        }
    }

    private func stepNumber(_ number: Int) -> some View {
        Text("\(number)")
            .font(Theme.Fonts.numberLarge)
            .foregroundStyle(Theme.Colors.plumText)
            .frame(minWidth: 24, alignment: .leading)
            .accessibilityLabel("Step \(number)")
    }

    private func stepText(_ action: EmptyAction) -> some View {
        Text(action.step ?? action.title)
            .font(Theme.Fonts.body)
            .foregroundStyle(Theme.Colors.ink)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var buttonStack: some View {
        VStack(spacing: 10) {
            ForEach(actions.indices, id: \.self) { index in
                actionButton(actions[index], isPrimary: index == 0, fullWidth: true, compact: false)
            }
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private func actionButton(_ action: EmptyAction, isPrimary: Bool, fullWidth: Bool, compact: Bool) -> some View {
        let size: ButtonSize = compact ? .compact : .regular
        if isPrimary {
            Button(action: action.action) {
                actionLabel(action)
            }
            .buttonStyle(PrimaryButtonStyle(size: size, fullWidth: fullWidth))
        } else {
            Button(action: action.action) {
                actionLabel(action)
            }
            .buttonStyle(SecondaryButtonStyle(size: size, fullWidth: fullWidth))
        }
    }

    @ViewBuilder
    private func actionLabel(_ action: EmptyAction) -> some View {
        if let systemImage = action.systemImage {
            Label(action.title, systemImage: systemImage)
        } else {
            Text(action.title)
        }
    }
}

// MARK: - ActionTile

/// A surface tile with a plum glyph over a short label, as a plain button.
struct ActionTile: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    @_disfavoredOverload
    init(_ title: String, systemImage: String, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.input, style: .continuous)
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: systemImage)
                    .font(.title3)
                    .foregroundStyle(Theme.Colors.plumText)
                    .accessibilityHidden(true)
                Text(title)
                    .font(Theme.Fonts.caption)
                    .foregroundStyle(Theme.Colors.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
            .background(Theme.Colors.surface, in: shape)
            .overlay {
                if colorSchemeContrast == .increased {
                    shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
                }
            }
            .contentShape(shape)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Stickers

/// A small white round label: "Broccoli · Today". Has the sticker lift.
struct Sticker: View {
    let text: String
    var tone: FreshTone? = nil
    var systemImage: String? = nil
    var symbolColor: Color = Theme.Colors.text2
    var rotation: Angle = .zero

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    @_disfavoredOverload
    init(_ text: String, tone: FreshTone? = nil, systemImage: String? = nil,
         symbolColor: Color = Theme.Colors.text2, rotation: Angle = .zero) {
        self.text = text
        self.tone = tone
        self.systemImage = systemImage
        self.symbolColor = symbolColor
        self.rotation = rotation
    }

    var body: some View {
        HStack(spacing: 6) {
            if let tone {
                ToneDot(tone)
            } else if let systemImage {
                Image(systemName: systemImage)
                    .imageScale(.small)
                    .foregroundStyle(symbolColor)
            }
            Text(text)
                .foregroundStyle(Theme.Colors.ink)
                .lineLimit(1)
        }
        .font(Theme.Fonts.tag)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(Theme.Colors.surface, in: Capsule())
        .overlay {
            if colorSchemeContrast == .increased {
                Capsule().strokeBorder(Theme.Colors.ink, lineWidth: 1)
            }
        }
        .shadow(color: Theme.Colors.stickerShadow, radius: 1.5, x: 0, y: 1)
        .rotationEffect(dynamicTypeSize.isAccessibilitySize ? .zero : rotation)
    }
}

/// A round "35 min" price sticker. Renders nothing when `minutes <= 0`.
struct TimeSticker: View {
    let minutes: Int
    var rotation: Angle = .degrees(6)

    @ScaledMetric(relativeTo: .title2) private var diameter: CGFloat = 64
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    init(minutes: Int, rotation: Angle = .degrees(6)) {
        self.minutes = minutes
        self.rotation = rotation
    }

    var body: some View {
        if minutes > 0 {
            let side = min(diameter, 88)
            VStack(spacing: -2) {
                Text("\(minutes)")
                    .font(Theme.Fonts.numberLarge)
                    .foregroundStyle(Theme.Colors.ink)
                Text("min")
                    .font(Theme.Fonts.tag)
                    .foregroundStyle(Theme.Colors.text2)
            }
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(8)
            .frame(width: side, height: side)
            .background(Theme.Colors.surface, in: Circle())
            .overlay {
                if colorSchemeContrast == .increased {
                    Circle().strokeBorder(Theme.Colors.ink, lineWidth: 1)
                }
            }
            .shadow(color: Theme.Colors.stickerShadow, radius: 1.5, x: 0, y: 1)
            .rotationEffect(dynamicTypeSize.isAccessibilitySize ? .zero : rotation)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(spokenLabel)
        }
    }

    private var spokenLabel: String {
        minutes == 1 ? "1 minute" : "\(minutes) minutes"
    }
}

// MARK: - Ticket

/// The order ticket for tonight's dinner: plum halves joined by a dashed tear line.
struct TicketCard<Top: View, Bottom: View>: View {
    let top: Top
    let bottom: Bottom

    init(@ViewBuilder top: () -> Top, @ViewBuilder bottom: () -> Bottom) {
        self.top = top()
        self.bottom = bottom()
    }

    var body: some View {
        VStack(spacing: 0) {
            top
                .padding(Theme.Space.heroPadding)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background {
                    // 1pt overlap hides any seam between the halves.
                    TicketHalf(notchedEdge: .bottom)
                        .fill(Theme.Colors.plum)
                        .padding(.bottom, -1)
                }
            bottom
                .padding(.horizontal, 20)
                .padding(.top, 14)
                .padding(.bottom, 20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background {
                    TicketHalf(notchedEdge: .top)
                        .fill(Theme.Colors.plum)
                }
                .overlay(alignment: .top) {
                    DashedRule()
                        .stroke(Theme.Colors.onPlum.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [5, 5]))
                        .frame(height: 1.5)
                        .padding(.horizontal, 18)
                        .accessibilityHidden(true)
                }
        }
        .foregroundStyle(Theme.Colors.onPlum)
    }
}

/// A single horizontal line through `midY` (the ticket's tear line). Stroke it with a dash pattern.
struct DashedRule: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.midY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        return p
    }
}

/// One half of the ticket: convex rounded corners, with concave notches on `notchedEdge`.
/// Drawn clockwise with cubic curves only (k = 0.5523), so there is no arc-direction ambiguity.
struct TicketHalf: Shape {
    enum NotchedEdge { case top, bottom }

    var notchedEdge: NotchedEdge
    var cornerRadius: CGFloat = Theme.Radius.hero
    var notchRadius: CGFloat = 10

    func path(in rect: CGRect) -> Path {
        let k: CGFloat = 0.5523
        let minX = rect.minX, maxX = rect.maxX, minY = rect.minY, maxY = rect.maxY
        let c = max(0, min(cornerRadius, rect.height / 2, rect.width / 2))
        let n = max(0, min(notchRadius, rect.height / 2))
        let topNotched = notchedEdge == .top
        let bottomNotched = notchedEdge == .bottom

        var p = Path()

        // Top-left
        if topNotched {
            p.move(to: CGPoint(x: minX, y: minY + n))
            p.addCurve(to: CGPoint(x: minX + n, y: minY),
                       control1: CGPoint(x: minX + k * n, y: minY + n),
                       control2: CGPoint(x: minX + n, y: minY + k * n))
        } else {
            p.move(to: CGPoint(x: minX, y: minY + c))
            p.addCurve(to: CGPoint(x: minX + c, y: minY),
                       control1: CGPoint(x: minX, y: minY + c - k * c),
                       control2: CGPoint(x: minX + c - k * c, y: minY))
        }

        // Top-right
        if topNotched {
            p.addLine(to: CGPoint(x: maxX - n, y: minY))
            p.addCurve(to: CGPoint(x: maxX, y: minY + n),
                       control1: CGPoint(x: maxX - n, y: minY + k * n),
                       control2: CGPoint(x: maxX - k * n, y: minY + n))
        } else {
            p.addLine(to: CGPoint(x: maxX - c, y: minY))
            p.addCurve(to: CGPoint(x: maxX, y: minY + c),
                       control1: CGPoint(x: maxX - c + k * c, y: minY),
                       control2: CGPoint(x: maxX, y: minY + c - k * c))
        }

        // Bottom-right
        if bottomNotched {
            p.addLine(to: CGPoint(x: maxX, y: maxY - n))
            p.addCurve(to: CGPoint(x: maxX - n, y: maxY),
                       control1: CGPoint(x: maxX - k * n, y: maxY - n),
                       control2: CGPoint(x: maxX - n, y: maxY - k * n))
        } else {
            p.addLine(to: CGPoint(x: maxX, y: maxY - c))
            p.addCurve(to: CGPoint(x: maxX - c, y: maxY),
                       control1: CGPoint(x: maxX, y: maxY - c + k * c),
                       control2: CGPoint(x: maxX - c + k * c, y: maxY))
        }

        // Bottom-left
        if bottomNotched {
            p.addLine(to: CGPoint(x: minX + n, y: maxY))
            p.addCurve(to: CGPoint(x: minX, y: maxY - n),
                       control1: CGPoint(x: minX + n, y: maxY - k * n),
                       control2: CGPoint(x: minX + k * n, y: maxY - n))
        } else {
            p.addLine(to: CGPoint(x: minX + c, y: maxY))
            p.addCurve(to: CGPoint(x: minX, y: maxY - c),
                       control1: CGPoint(x: minX + c - k * c, y: maxY),
                       control2: CGPoint(x: minX, y: maxY - c + k * c))
        }

        p.closeSubpath()
        return p
    }
}

// MARK: - Controls

/// Include/check circle with a 44pt target.
struct CheckToggle: View {
    @Binding var isOn: Bool
    let label: String
    var tintColor: Color = Theme.Colors.plum

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @_disfavoredOverload
    init(isOn: Binding<Bool>, accessibilityLabel: String, tint: Color = Theme.Colors.plum) {
        self._isOn = isOn
        self.label = accessibilityLabel
        self.tintColor = tint
    }

    var body: some View {
        Button {
            if reduceMotion {
                isOn.toggle()
            } else {
                withAnimation(Theme.Motion.snappy) {
                    isOn.toggle()
                }
            }
        } label: {
            Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                .font(.title2)
                .foregroundStyle(isOn ? tintColor : Theme.Colors.text3)
                .contentTransition(.symbolEffect(.replace))
                .frame(width: Theme.Metrics.minTap, height: Theme.Metrics.minTap)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isOn)
        .accessibilityLabel(label)
        .accessibilityValue(spokenValue)
        .accessibilityAddTraits(.isToggle)
    }

    private var spokenValue: String {
        isOn ? "On" : "Off"
    }
}

/// Big servings number between minus and plus circles. Adjustable for VoiceOver.
struct ServingsStepper: View {
    @Binding var value: Int
    let range: ClosedRange<Int>
    var unit: String = "servings"

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(value: Binding<Int>, range: ClosedRange<Int>, unit: String = "servings") {
        self._value = value
        self.range = range
        self.unit = unit
    }

    var body: some View {
        HStack(spacing: 16) {
            Button {
                step(by: -1)
            } label: {
                Image(systemName: "minus")
            }
            .buttonStyle(IconCircleButtonStyle(.neutral))
            .disabled(value <= range.lowerBound)

            VStack(spacing: 0) {
                Text("\(value)")
                    .font(Theme.Fonts.displayNumber)
                    .foregroundStyle(Theme.Colors.ink)
                    .contentTransition(.numericText(value: Double(value)))
                Text(unit)
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
            }
            .lineLimit(1)
            .frame(minWidth: 64)

            Button {
                step(by: 1)
            } label: {
                Image(systemName: "plus")
            }
            .buttonStyle(IconCircleButtonStyle(.neutral))
            .disabled(value >= range.upperBound)
        }
        .sensoryFeedback(trigger: value) { oldValue, newValue in
            let feedback: SensoryFeedback = newValue > oldValue ? .increase : .decrease
            return feedback
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Servings")
        .accessibilityValue("\(value)")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: step(by: 1)
            case .decrement: step(by: -1)
            @unknown default: break
            }
        }
    }

    private func step(by delta: Int) {
        let next = min(max(value + delta, range.lowerBound), range.upperBound)
        guard next != value else { return }
        if reduceMotion {
            value = next
        } else {
            withAnimation(Theme.Motion.snappy) {
                value = next
            }
        }
    }
}

/// 29pt plum-soft tile for Settings section headers. Decorative.
struct SettingsIconTile: View {
    let systemImage: String

    init(systemImage: String) {
        self.systemImage = systemImage
    }

    var body: some View {
        Image(systemName: systemImage)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Theme.Colors.plumText)
            .frame(width: 29, height: 29)
            .background(Theme.Colors.plumSoft, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            .accessibilityHidden(true)
    }
}

// Literal text is localized (String Catalog); text built at runtime uses the String inits above.

extension SectionHeader {
    init(_ title: LocalizedStringResource, count: Int? = nil, systemImage: String? = nil,
         symbolColor: Color = Theme.Colors.text2, tile: FoodCategory? = nil, actionTitle: LocalizedStringResource? = nil,
         action: (() -> Void)? = nil) {
        self.init(String(localized: title), count: count, systemImage: systemImage, symbolColor: symbolColor, tile: tile,
                  actionTitle: actionTitle.map { String(localized: $0) }, action: action)
    }
}

extension SheetLede {
    init(systemImage: String, text: LocalizedStringResource) {
        self.init(systemImage: systemImage, text: String(localized: text))
    }
}

extension EmptyAction {
    init(title: LocalizedStringResource, systemImage: String? = nil, step: LocalizedStringResource? = nil,
         action: @escaping () -> Void) {
        self.init(title: String(localized: title), systemImage: systemImage, step: step.map { String(localized: $0) },
                  action: action)
    }
}

extension EmptyStateView {
    init(tiles: [FoodCategory], title: LocalizedStringResource, message: LocalizedStringResource, actions: [EmptyAction] = []) {
        self.init(tiles: tiles, title: String(localized: title), message: String(localized: message), actions: actions)
    }
}

extension ActionTile {
    init(_ title: LocalizedStringResource, systemImage: String, action: @escaping () -> Void) {
        self.init(String(localized: title), systemImage: systemImage, action: action)
    }
}

extension Sticker {
    init(_ text: LocalizedStringResource, tone: FreshTone? = nil, systemImage: String? = nil,
         symbolColor: Color = Theme.Colors.text2, rotation: Angle = .zero) {
        self.init(String(localized: text), tone: tone, systemImage: systemImage, symbolColor: symbolColor, rotation: rotation)
    }
}

extension CheckToggle {
    init(isOn: Binding<Bool>, accessibilityLabel: LocalizedStringResource, tint: Color = Theme.Colors.plum) {
        self.init(isOn: isOn, accessibilityLabel: String(localized: accessibilityLabel), tint: tint)
    }
}
