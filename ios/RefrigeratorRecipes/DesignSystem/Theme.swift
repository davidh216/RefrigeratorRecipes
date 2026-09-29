import SwiftUI
import UIKit

// "Plum & Oat" design tokens (warm neutrals, plum accent). See ios/DESIGN.md §2–§5 and §7.1.
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
        // Neutrals: warm oat and cream (light), warm charcoal (dark)
        static let canvas     = Color(light: 0xF7F2EC, dark: 0x171315)
        static let surface    = Color(light: 0xFFFDFA, dark: 0x231D20)
        static let fill       = Color(light: 0xEEE6DE, dark: 0x2F272B)
        static let fillStrong = Color(light: 0xE2D8CE, dark: 0x3A3136)
        static let separator  = Color(light: 0xE4DBD3, dark: 0x3A3136, lightHC: 0xB3A79D, darkHC: 0x5E5359)
        static let ink        = Color(light: 0x2B2127, dark: 0xF6EFF2)
        static let text2      = Color(light: 0x5C5057, dark: 0xC2B6BC, lightHC: 0x463C42, darkHC: 0xDDD2D8)
        static let text3      = Color(light: 0x6B5F66, dark: 0xA0949A, lightHC: 0x5C5057, darkHC: 0xC2B6BC)
        static let inverse    = Color(light: 0xFFFFFF, dark: 0x2B2127)
        // Plum
        static let plum           = Color(light: 0x7B3A6B, dark: 0x9A4C86)
        static let plumPressed    = Color(light: 0x632E56, dark: 0x823F71)
        static let onPlum         = Color(light: 0xFFFFFF, dark: 0xFFFFFF)
        static let onPlum2        = Color(light: 0xF6E3F0, dark: 0xF6E3F0)
        static let plumText       = Color(light: 0x7B3A6B, dark: 0xE3A6D2)
        static let plumSoft       = Color(light: 0xF1E3EC, dark: 0x3A2434)
        static let plumStrong     = Color(light: 0x652B57, dark: 0xF2C3E4)
        static let ticketButton   = Color(light: 0xFFFFFF, dark: 0xFFFFFF)
        static let onTicketButton = Color(light: 0x7B3A6B, dark: 0x7B3A6B)
        // Freshness
        static let fresh     = Color(light: 0x1B7440, dark: 0x6CD697)
        static let freshSoft = Color(light: 0xDDF2E4, dark: 0x1F3327)
        static let soon      = Color(light: 0xFFC21F, dark: 0xFFC933)
        static let onSoon    = Color(light: 0x2B2127, dark: 0x2E2000)
        static let soonText  = Color(light: 0x8A5B00, dark: 0xFFD35C)
        static let soonSoft  = Color(light: 0xFFF1C7, dark: 0x3A2E0C)
        static let today     = Color(light: 0xC8341A, dark: 0xFF6A47)
        static let onToday   = Color(light: 0xFFFFFF, dark: 0x2B0A03)
        static let todayText = Color(light: 0xB42D14, dark: 0xFF8B70)
        static let todaySoft = Color(light: 0xFBE3DD, dark: 0x3A1A14)
        static let past      = Color(light: 0x5C5057, dark: 0xC2B6BC, lightHC: 0x463C42, darkHC: 0xDDD2D8)
        static let frost     = Color(light: 0x236A91, dark: 0x8FCBEB)
        static let frostSoft = Color(light: 0xE3F0F7, dark: 0x1C2A33)
        static let tapeEdge  = Color.black.opacity(0.10)      // apply only when colorScheme == .light
        static let stickerShadow = Color.black.opacity(0.12)
        // Dial
        static let dialFace  = Color(light: 0x2B2127, dark: 0x100C0E)
        static let dialTrack = Color(light: 0x453A40, dark: 0x3D3439)
        static let dialTick  = Color.white.opacity(0.35)
        static let dialFresh = Color(light: 0x6CD697, dark: 0x6CD697)
        static let dialSoon  = Color(light: 0xFFC933, dark: 0xFFC933)
        static let dialToday = Color(light: 0xFF6A47, dark: 0xFF6A47)
        static let dialFrost = Color(light: 0x8FCBEB, dark: 0x8FCBEB)
        static let dialPast  = Color(light: 0xA0949A, dark: 0xA0949A)
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
