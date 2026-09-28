import SwiftUI

// Beet = do. Capsule buttons, quiet text buttons, icon circles and the inline
// confirmation that replaces success alerts (DESIGN.md §7.5).
// `.borderedProminent` and `.bordered` are banned: in dark mode they put white on #F58ACB.

/// Min height 50 (regular) / 44 (compact).
enum ButtonSize {
    case regular, compact
}

struct CapsuleButtonStyle: ButtonStyle {
    enum Kind { case primary, secondary, neutral, destructiveSoft, inverted }

    var kind: Kind = .primary
    var size: ButtonSize = .regular
    var fullWidth = false

    init(_ kind: Kind = .primary, size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.kind = kind
        self.size = size
        self.fullWidth = fullWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: kind, size: size, fullWidth: fullWidth)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var size: ButtonSize = .regular
    var fullWidth = false

    init(size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.size = size
        self.fullWidth = fullWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: .primary, size: size, fullWidth: fullWidth)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var size: ButtonSize = .regular
    var fullWidth = false

    init(size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.size = size
        self.fullWidth = fullWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: .secondary, size: size, fullWidth: fullWidth)
    }
}

struct NeutralButtonStyle: ButtonStyle {
    var size: ButtonSize = .regular
    var fullWidth = false

    init(size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.size = size
        self.fullWidth = fullWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: .neutral, size: size, fullWidth: fullWidth)
    }
}

struct DestructiveSoftButtonStyle: ButtonStyle {
    var size: ButtonSize = .regular
    var fullWidth = false

    init(size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.size = size
        self.fullWidth = fullWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: .destructiveSoft, size: size, fullWidth: fullWidth)
    }
}

/// White button on the beet ticket.
struct InvertedButtonStyle: ButtonStyle {
    var size: ButtonSize = .regular
    var fullWidth = false

    init(size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.size = size
        self.fullWidth = fullWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: .inverted, size: size, fullWidth: fullWidth)
    }
}

/// Environment values are read here, inside a View, not in the ButtonStyle.
private struct CapsuleButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let kind: CapsuleButtonStyle.Kind
    let size: ButtonSize
    let fullWidth: Bool

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        configuration.label
            .font(size == .regular ? Theme.Fonts.button : Theme.Fonts.buttonCompact)
            .lineLimit(2)
            .multilineTextAlignment(.center)
            .foregroundStyle(isEnabled ? labelColor : Theme.Colors.text3)
            .padding(.horizontal, size == .regular ? 20 : 16)
            .padding(.vertical, 8)
            .frame(maxWidth: fullWidth ? .infinity : nil,
                   minHeight: size == .regular ? Theme.Metrics.button : Theme.Metrics.buttonCompact)
            .background(isEnabled ? (configuration.isPressed ? pressedFillColor : fillColor) : Theme.Colors.fill, in: Capsule())
            .contentShape(Capsule())
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }

    private var fillColor: Color {
        switch kind {
        case .primary: return Theme.Colors.beet
        case .secondary: return Theme.Colors.beetSoft
        case .neutral: return Theme.Colors.fill
        case .destructiveSoft: return Theme.Colors.todaySoft
        case .inverted: return Theme.Colors.ticketButton
        }
    }

    private var pressedFillColor: Color {
        switch kind {
        case .primary: return Theme.Colors.beetPressed
        case .secondary: return Theme.Colors.beetSoft.opacity(0.8)
        case .neutral: return Theme.Colors.fillStrong
        case .destructiveSoft: return Theme.Colors.todaySoft.opacity(0.8)
        case .inverted: return Theme.Colors.ticketButton.opacity(0.9)
        }
    }

    private var labelColor: Color {
        switch kind {
        case .primary: return Theme.Colors.onBeet
        case .secondary: return Theme.Colors.beetStrong
        case .neutral: return Theme.Colors.ink
        case .destructiveSoft: return Theme.Colors.todayText
        case .inverted: return Theme.Colors.onTicketButton
        }
    }
}

// MARK: - Quiet

/// Text-only button with a 44pt target.
struct QuietButtonStyle: ButtonStyle {
    var color: Color = Theme.Colors.text2

    init(color: Color = Theme.Colors.text2) {
        self.color = color
    }

    func makeBody(configuration: Configuration) -> some View {
        QuietButtonBody(configuration: configuration, color: color)
    }
}

private struct QuietButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let color: Color

    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        configuration.label
            .font(Theme.Fonts.detailStrong)
            .foregroundStyle(isEnabled ? color : Theme.Colors.text3)
            .frame(minWidth: Theme.Metrics.minTap, minHeight: Theme.Metrics.minTap)
            .contentShape(Rectangle())
            .opacity(configuration.isPressed ? 0.6 : 1)
    }
}

// MARK: - Icon circle

/// A glyph in a circle. Call sites must add `.accessibilityLabel`.
struct IconCircleButtonStyle: ButtonStyle {
    enum Kind { case neutral, beet, beetSoft }

    var kind: Kind = .neutral
    var diameter: CGFloat = 44

    init(_ kind: Kind = .neutral, diameter: CGFloat = 44) {
        self.kind = kind
        self.diameter = diameter
    }

    func makeBody(configuration: Configuration) -> some View {
        IconCircleButtonBody(configuration: configuration, kind: kind, diameter: diameter)
    }
}

private struct IconCircleButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let kind: IconCircleButtonStyle.Kind
    let diameter: CGFloat

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let side = max(diameter, Theme.Metrics.minTap)
        configuration.label
            .font(.body.weight(.bold))
            .foregroundStyle(isEnabled ? labelColor : Theme.Colors.text3)
            .frame(width: side, height: side)
            .background(isEnabled ? (configuration.isPressed ? pressedFillColor : fillColor) : Theme.Colors.fillStrong, in: Circle())
            .contentShape(Circle())
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }

    private var fillColor: Color {
        switch kind {
        case .neutral: return Theme.Colors.fill
        case .beet: return Theme.Colors.beet
        case .beetSoft: return Theme.Colors.beetSoft
        }
    }

    private var pressedFillColor: Color {
        switch kind {
        case .neutral: return Theme.Colors.fillStrong
        case .beet: return Theme.Colors.beetPressed
        case .beetSoft: return Theme.Colors.beetSoft.opacity(0.8)
        }
    }

    private var labelColor: Color {
        switch kind {
        case .neutral: return Theme.Colors.ink
        case .beet: return Theme.Colors.onBeet
        case .beetSoft: return Theme.Colors.beetStrong
        }
    }
}

// MARK: - Inline confirmation

/// Replaces success alerts: after the action, the label turns into "Added 2 ✓" for 2 seconds.
struct InlineConfirmButton: View {
    let title: String
    let systemImage: String
    var kind: CapsuleButtonStyle.Kind = .secondary
    var size: ButtonSize = .regular
    var fullWidth: Bool = false
    let action: () -> String?

    @State private var confirmation: String? = nil
    @State private var successCount = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `action` returns the confirmation ("Added 2", "On your list") or nil.
    init(_ title: String, systemImage: String, kind: CapsuleButtonStyle.Kind = .secondary,
         size: ButtonSize = .regular, fullWidth: Bool = false,
         action: @escaping () -> String?) {
        self.title = title
        self.systemImage = systemImage
        self.kind = kind
        self.size = size
        self.fullWidth = fullWidth
        self.action = action
    }

    var body: some View {
        Button {
            guard confirmation == nil else { return }
            guard let result = action() else { return }
            withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
                confirmation = result
            }
            successCount += 1
            AccessibilityNotification.Announcement(result).post()
        } label: {
            Label(confirmation ?? title, systemImage: confirmation == nil ? systemImage : "checkmark")
                .contentTransition(.symbolEffect(.replace))
        }
        .buttonStyle(CapsuleButtonStyle(kind, size: size, fullWidth: fullWidth))
        // Blocks repeat taps while the confirmation shows, without greying it out.
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
