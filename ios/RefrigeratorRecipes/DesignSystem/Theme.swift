import SwiftUI
import UIKit

// "Fresh Market" design tokens. See ios/DESIGN.md §2–§5 and §7.1.
// Screen code never writes hex values, font sizes or radii; it reads them from `Theme`.

extension UIColor {
    convenience init(rgb: UInt32, alpha: CGFloat = 1) {
        self.init(red: CGFloat((rgb >> 16) & 0xFF) / 255,
                  green: CGFloat((rgb >> 8) & 0xFF) / 255,
                  blue: CGFloat(rgb & 0xFF) / 255,
                  alpha: alpha)
    }
}

extension Color {
    /// Light/dark (and optional Increase Contrast) pair, resolved from the trait collection.
    init(light: UInt32, dark: UInt32, lightHC: UInt32? = nil, darkHC: UInt32? = nil) {
        self.init(uiColor: UIColor { traits in
            let isDark = traits.userInterfaceStyle == .dark
            let isHC = traits.accessibilityContrast == .high
            let value: UInt32
            if isDark { value = isHC ? (darkHC ?? dark) : dark }
            else { value = isHC ? (lightHC ?? light) : light }
            return UIColor(rgb: value)
        })
    }
}

enum Theme {
    enum Colors {
        // Neutrals
        static let canvas     = Color(light: 0xF2F4F3, dark: 0x121014)
        static let surface    = Color(light: 0xFFFFFF, dark: 0x1E1A21)
        static let fill       = Color(light: 0xE7EBE9, dark: 0x2B2630)
        static let fillStrong = Color(light: 0xD6DCD9, dark: 0x36313B)
        static let separator  = Color(light: 0xD9DEDC, dark: 0x3A343F, lightHC: 0xA9B1AD, darkHC: 0x5A5360)
        static let ink        = Color(light: 0x16181D, dark: 0xF4F1F6)
        static let text2      = Color(light: 0x4E555A, dark: 0xB8B0BE, lightHC: 0x3A4045, darkHC: 0xD6D0DA)
        static let text3      = Color(light: 0x5F676C, dark: 0x978F9D, lightHC: 0x4E555A, darkHC: 0xB8B0BE)
        static let inverse    = Color(light: 0xFFFFFF, dark: 0x16181D)
        // Beet
        static let beet           = Color(light: 0xA3145C, dark: 0xC0206F)
        static let beetPressed    = Color(light: 0x85104B, dark: 0xA51A60)
        static let onBeet         = Color(light: 0xFFFFFF, dark: 0xFFFFFF)
        static let onBeet2        = Color(light: 0xFFE3F1, dark: 0xFFE3F1)
        static let beetText       = Color(light: 0xA3145C, dark: 0xF58ACB)
        static let beetSoft       = Color(light: 0xF7DDEA, dark: 0x3B1831)
        static let beetStrong     = Color(light: 0x8E0F50, dark: 0xFFB0DC)
        static let ticketButton   = Color(light: 0xFFFFFF, dark: 0xFFFFFF)
        static let onTicketButton = Color(light: 0xA3145C, dark: 0xA3145C)
        // Freshness
        static let fresh     = Color(light: 0x1B7440, dark: 0x6CD697)
        static let freshSoft = Color(light: 0xDDF2E4, dark: 0x1F3327)
        static let soon      = Color(light: 0xFFC21F, dark: 0xFFC933)
        static let onSoon    = Color(light: 0x16181D, dark: 0x2E2000)
        static let soonText  = Color(light: 0x8A5B00, dark: 0xFFD35C)
        static let soonSoft  = Color(light: 0xFFF1C7, dark: 0x3A2E0C)
        static let today     = Color(light: 0xC8341A, dark: 0xFF6A47)
        static let onToday   = Color(light: 0xFFFFFF, dark: 0x2B0A03)
        static let todayText = Color(light: 0xB42D14, dark: 0xFF8B70)
        static let todaySoft = Color(light: 0xFBE3DD, dark: 0x3A1A14)
        static let past      = Color(light: 0x4E555A, dark: 0xB8B0BE, lightHC: 0x3A4045, darkHC: 0xD6D0DA)
        static let frost     = Color(light: 0x236A91, dark: 0x8FCBEB)
        static let frostSoft = Color(light: 0xE3F0F7, dark: 0x1C2A33)
        static let tapeEdge  = Color.black.opacity(0.10)      // apply only when colorScheme == .light
        static let stickerShadow = Color.black.opacity(0.12)
        // Dial
        static let dialFace  = Color(light: 0x16181D, dark: 0x0E0C10)
        static let dialTrack = Color(light: 0x3A3D44, dark: 0x3A3540)
        static let dialTick  = Color.white.opacity(0.35)
        static let dialFresh = Color(light: 0x6CD697, dark: 0x6CD697)
        static let dialSoon  = Color(light: 0xFFC933, dark: 0xFFC933)
        static let dialToday = Color(light: 0xFF6A47, dark: 0xFF6A47)
        static let dialFrost = Color(light: 0x8FCBEB, dark: 0x8FCBEB)
        static let dialPast  = Color(light: 0x978F9D, dark: 0x978F9D)
    }

    /// Every style is built on a Dynamic Type text style (§3).
    enum Fonts {
        static let display       = Font.system(.largeTitle, weight: .heavy)
        static let heroTitle     = Font.system(.title, weight: .heavy)
        static let titleHeavy    = Font.system(.title2, weight: .heavy)
        static let section       = Font.system(.title3, weight: .heavy)
        static let cardTitle     = Font.system(.title3, weight: .bold)
        static let tileTitle     = Font.system(.headline, weight: .heavy)
        static let rowTitle      = Font.system(.body, weight: .semibold)
        static let body          = Font.body
        static let detail        = Font.subheadline
        static let detailStrong  = Font.subheadline.weight(.semibold)
        static let button        = Font.system(.body, weight: .bold)
        static let buttonCompact = Font.system(.subheadline, weight: .bold)
        static let chip          = Font.system(.subheadline, weight: .semibold)
        static let tag           = Font.system(.footnote, design: .rounded, weight: .bold).monospacedDigit()
        static let eyebrow       = Font.system(.caption, weight: .heavy)
        static let number        = Font.system(.headline, design: .rounded, weight: .heavy).monospacedDigit()
        static let numberLarge   = Font.system(.title2, design: .rounded, weight: .black).monospacedDigit()
        static let weekNumber    = Font.system(.title3, design: .rounded, weight: .black).monospacedDigit()
        static let displayNumber = Font.system(.largeTitle, design: .rounded, weight: .black).monospacedDigit()
        static let headnote      = Font.system(.title3, design: .serif).italic()
        static let footnote      = Font.footnote
        static let caption       = Font.caption.weight(.semibold)
        static let mono          = Font.system(.caption, design: .monospaced)
    }

    enum Space {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let s: CGFloat = 12
        static let m: CGFloat = 16
        static let l: CGFloat = 20
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
        static let xxxl: CGFloat = 40
        /// Screen side margin.
        static let gutter: CGFloat = 16
        /// Gap between cards.
        static let stack: CGFloat = 12
        /// Gap between sections.
        static let section: CGFloat = 24
        static let cardPadding: CGFloat = 16
        static let heroPadding: CGFloat = 20
        static let deckPadding: CGFloat = 24
    }

    /// Always used as `RoundedRectangle(cornerRadius:style: .continuous)`.
    enum Radius {
        static let meter: CGFloat = 2
        static let strip: CGFloat = 3
        static let tag: CGFloat = 4
        static let tileSmall: CGFloat = 8
        static let tile: CGFloat = 11
        static let tileLarge: CGFloat = 16
        static let tileXL: CGFloat = 18
        static let input: CGFloat = 14
        static let card: CGFloat = 22
        static let hero: CGFloat = 28
        static let deck: CGFloat = 32
    }

    enum Metrics {
        static let minTap: CGFloat = 44
        static let button: CGFloat = 50
        static let buttonCompact: CGFloat = 44
        static let foodRowMin: CGFloat = 60
        static let shoppingRowMin: CGFloat = 52
        static let stripHeight: CGFloat = 12
        static let dialLarge: CGFloat = 168
        static let dialSmall: CGFloat = 64
    }
}

extension Theme {
    /// Returns `name` if this OS has it, otherwise `fallback`.
    /// A misspelled or unavailable SF Symbol renders blank with no build error (§5.1).
    static func symbol(_ name: String, fallback: String) -> String {
        UIImage(systemName: name) != nil ? name : fallback
    }

    /// `Text(value)` in `Fonts.number` + `Text(" " + unit)` in `Fonts.detail`, read as one string.
    static func numberText(_ value: String, unit: String) -> Text {
        Text(value).font(Fonts.number) + Text(" " + unit).font(Fonts.detail)
    }
}

extension View {
    /// Small uppercase label: "TOP PICK", "ON FOR TONIGHT". At most one per block.
    func eyebrowStyle() -> some View {
        self.font(Theme.Fonts.eyebrow)
            .textCase(.uppercase)
            .tracking(1.0)
    }
}
