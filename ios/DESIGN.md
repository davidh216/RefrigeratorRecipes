# Fridge design system: "Fresh Market"

This is the single source of truth for the visual design of the Fridge iPhone app (SwiftUI, iOS 18+, Swift 5 mode, Xcode 16.4 in CI) and of its Safari preview (`preview/fridge-preview.template.html`).

Several engineers implement it in parallel, without a local compiler and without talking to each other. For that to work:

- **Section 7 (Design system API) is a contract.** Screen code is written against these exact names and signatures before the `DesignSystem` folder exists. If you own `DesignSystem`, implement exactly what is listed. If you own a screen and need something that is not listed, build it as a `private` view inside your own file. Do not add it to `DesignSystem`.
- **Only use stable, well-known SwiftUI.** iOS 17/18 APIs named here are allowed. No UIKit appearance proxies, private APIs, or `UIViewRepresentable` hacks, apart from the representables that already exist (document camera, barcode scanner, camera picker).
- **No hex literals, font sizes, or radii in screen code.** Everything comes from `Theme`.

---

## 0. Working agreement

### 0.1 Workstreams and file ownership

Each file has exactly one owner. Only edit files you own.

| WS | Owner of | Notes |
|---|---|---|
| **DS** | New folder `ios/RefrigeratorRecipes/DesignSystem/*`, new FridgeCore files and tests from §6, `Shared/Components.swift`, `Resources/Assets.xcassets/AccentColor.colorset` | Removes `ExpiryBadge`/`CoverageBadge` from `Shared/Components.swift` and re-creates them in DesignSystem (§7.15). Nothing else in that file changes. |
| **Shell** | `App/RefrigeratorRecipesApp.swift` (RootView), `App/AppRouter.swift`, `AppIcon.appiconset` | Adds `AppTab` + `AppRouter.tab` (§8.1). |
| **Tonight** | `Features/Tonight/TonightView.swift` | |
| **Fridge** | `Features/Pantry/PantryView.swift`, `PantryItemEditor.swift`, `BarcodeScannerView.swift` | |
| **Capture** | `Features/Pantry/ReceiptScanView.swift`, `PhotoScanView.swift` | Adds `rawText` to `ReviewItem`. |
| **Check-in** | `Features/Pantry/CheckInView.swift` | |
| **Recipes** | `Features/Recipes/RecipesView.swift` (includes `RecipeImportView`), `RecipeEditor.swift` | |
| **Detail** | `Features/Recipes/RecipeDetailView.swift` (includes `AddToPlanSheet`), `CookedSheet.swift` | |
| **Plan+Shop** | `Features/Plan/MealPlanView.swift` (includes `RecipePickerSheet`), `Features/Shopping/ShoppingListView.swift` | |
| **Chef+Settings** | `Features/Chef/ChefView.swift`, `Features/Settings/SettingsView.swift` | |
| **Web** | `preview/fridge-preview.template.html` (plus `smoke.js` only if a selector must change) | |

These cross-workstream names are fixed. You may use them before they exist:

- `AppRouter.shared.tab` of type `AppTab` (`.tonight`, `.fridge`, `.recipes`, `.plan`, `.shopping`). Owned by Shell.
- `AppRouter.shared.checkInRequested` (exists today).
- `ChefView(initialPrompt: String?, showsDone: Bool)` (exists today).
- `PantryItemEditor(draft: .init(item: item), item: item)` (exists today).

### 0.2 Decisions log (what the final direction takes from each proposal)

| Decision | Source | Why |
|---|---|---|
| Base system: category crate colors, a heat scale for time, beet magenta for "do" | Fresh Market | Scored highest with all judges. It makes the Tonight decision and the use-soon signal readable at a glance. |
| **Restraint:** dense lists use *soft* category tiles (a tinted fill and a deep glyph). Full crate color appears only on hero objects. | Judges (beauty, UX) | Keeps lists from turning into a rainbow. The trailing freshness tag is the only saturated thing in a list row. |
| Meat moved from ham pink to **coral** | Beauty judge | Pink sat too close to beet, so meat tiles looked pressable. |
| **Past date is quieter than Today.** It is an outlined ink label, not a solid fill. | UX judge (from Clock, Light) | Food you can still save tonight should be the loudest thing on screen. Past-date food is cleanup. |
| Freshness tags use **masking-tape shapes** (notched ends) for soon and today | Chef's Notebook | Kitchen date tape is specific to cooking. It also keeps tags visually apart from the round "rescue" stickers. |
| **Freezer pauses time.** Non-urgent freezer items get a quiet frost "frozen" tag. | Freshness Clock | Avoids false urgency. |
| **Kitchen-timer dial** is the centerpiece of the check-in card and appears in the item editor | Freshness Clock | Gives check-in one signature object. It replaces the watermark glyph. |
| **Order ticket** for tonight's dinner: beet, dashed tear line, notches. Built from explicit tokens and a shape, not a colorScheme flip. | Clock + feasibility judge | Makes the one committed choice specific to a kitchen, without an environment-flip risk. |
| Cook sheet shows **corrections in pen**: the old amount struck through in beet, then the new amount | Chef's Notebook | Easy to read, and charming. |
| Check-in **stamp** (STILL HERE / USED / TOSSED) and a **directional exit** (right / up into the pot / left) | Notebook + Light | Delight at a 150 ms cost, with a double-tap guard. |
| **Zoom transition** from a recipe's color block to its detail header | Fridge Light | iOS 18 and stable. The block grows into the header. |
| One serif: the **recipe headnote** in New York italic | Fridge Light | Adds warmth without the editorial-serif cliché. |
| **Dropped:** market awning, 160pt watermark glyphs, hard-offset brutalist sticker shadows, global toast overlay, custom FlowLayout, `UINavigationBar.appearance()`, PhaseAnimator dots | All judges | Tropes or feasibility risks. |
| **Inline confirmations** ("Added 2 ✓" on the button that did it) replace the "OK" alerts for successful actions | Notebook + feasibility judge | Feedback stays where the thumb is, with no global state. Alerts remain for errors. |
| Tonight "Use soon" chip **opens the item**. Long-press offers Used up / Ask the chef. A "+N more" chip goes to Fridge. | Fridge Light (UX judge) | Opening the item is what users most likely intend when they tap. |
| Fridge **freshness strip legend is a set of filters** | Freshness Clock | One tap takes you from the signal to the list. |
| Calm state: "Nothing on the clock. Next up: Greek yogurt in 5 days." | Freshness Clock | |
| Plan week-strip dots are colored by **urgency of the food each meal rescues** | Freshness Clock | The week then shows where expiring food gets used. |
| Increase Contrast values are **built into every token** | Freshness Clock | Required, not optional. |
| Runtime SF Symbol guard, FoodCategory inference in FridgeCore with unit tests, a three-step `ViewThatFits` for action rows | Fresh Market + feasibility judge | These pieces cannot be checked without a compiler, so they are made robust. |

---

## 1. Concept

**Market colors, kitchen labels.** Food comes home from the market in colored crates and gets a strip of date tape in your kitchen.

| Rule | Meaning | Where it lives (position and shape keep the rules apart) |
|---|---|---|
| **Color = food** | Each of 11 food categories has a crate color. | The **leading** tile of a row. In dense lists it is a soft tile; on hero objects it is a full crate block. |
| **Heat = time** | Freshness ladder: fresh (quiet herb-green text), then soon (citrus tape), then today/tomorrow (tomato tape). Past date is an ink outline, and frozen is quiet frost text. | The **trailing** tag of a row, the Fridge freshness strip, the timer dial, rescue stickers. |
| **Beet = do** | The only brand color. Used for the next action and the current selection. | Things you can **press**: primary buttons, selected chips, send, include checks, the tab tint, links, and the tonight ticket. |

Food-specific objects:

- **Crate tile**: a rounded square with an SF Symbol. Its radius is about 0.28× its size.
- **Date tape**: notched-end labels for soon and today.
- **Produce sticker**: small white round labels on color blocks ("Broccoli · Today"), slightly tilted.
- **Price-card numerals**: every number is set in SF Pro Rounded Heavy/Black with tabular digits.
- **Time sticker**: a round "35 min" price sticker on the Tonight hero.
- **Kitchen-timer dial**: a dark face with a 14-day arc. Used in check-in and the item editor.
- **Order ticket**: tonight's committed dinner, shown with a tear line.
- **Fridge magnets**: the app icon.

What we avoid:

- No cream, serif-heavy editorial layouts, or terracotta. The canvas is cool "fridge porcelain", and dark mode is aubergine-black.
- No purple-to-blue gradients or glowing AI orbs. No emoji.
- Everything is left-aligned. Empty states are left-aligned too.
- Surfaces are flat. There are no shadows on cards and no accent bars on the side of cards.

---

## 2. Color

All tokens are dynamic `Color`s with light, dark, and (where listed) Increase Contrast values. Contrast ratios below were measured with the WCAG 2.1 formula.

### 2.1 Neutrals

| Swift token | Role | Light | Dark | HC light / HC dark |
|---|---|---|---|---|
| `Theme.Colors.canvas` | Screen background, sheet background | `#F2F4F3` | `#121014` | — |
| `Theme.Colors.surface` | Cards, list rows, stickers, time sticker | `#FFFFFF` | `#1E1A21` | — |
| `Theme.Colors.fill` | Unselected chips, inputs, neutral buttons, stepper circles | `#E7EBE9` | `#2B2630` | — |
| `Theme.Colors.fillStrong` | Empty meter segments, "no date" segment, dashed placeholders, disabled send | `#D6DCD9` | `#36313B` | — |
| `Theme.Colors.separator` | 0.5pt hairlines, Increase Contrast card borders | `#D9DEDC` | `#3A343F` | `#A9B1AD` / `#5A5360` |
| `Theme.Colors.ink` | Primary text | `#16181D` | `#F4F1F6` | — |
| `Theme.Colors.text2` | Secondary text: details, reasons | `#4E555A` | `#B8B0BE` | `#3A4045` / `#D6D0DA` |
| `Theme.Colors.text3` | Tertiary text: placeholders, footers, hints. **Never on `fillStrong`.** | `#5F676C` | `#978F9D` | `#4E555A` / `#B8B0BE` |
| `Theme.Colors.inverse` | Text on an ink fill | `#FFFFFF` | `#16181D` | — |

### 2.2 Beet (action) and the ticket

| Swift token | Role | Light | Dark |
|---|---|---|---|
| `Theme.Colors.beet` | **Fill** of primary buttons, selected chips, send, include checks, the ticket, "today" in the week strip | `#A3145C` | `#C0206F` |
| `Theme.Colors.beetPressed` | Pressed state of beet fills | `#85104B` | `#A51A60` |
| `Theme.Colors.onBeet` | Text and glyphs on beet | `#FFFFFF` | `#FFFFFF` |
| `Theme.Colors.onBeet2` | Secondary text on beet (ticket eyebrow and meta) | `#FFE3F1` | `#FFE3F1` |
| `Theme.Colors.beetText` | Beet used as text or tint: links, toolbar buttons, tab tint, toggles, step numbers | `#A3145C` | `#F58ACB` |
| `Theme.Colors.beetSoft` | Secondary button fill, sheet-lede tiles, settings tiles, chef avatar | `#F7DDEA` | `#3B1831` |
| `Theme.Colors.beetStrong` | Text on `beetSoft` | `#8E0F50` | `#FFB0DC` |
| `Theme.Colors.ticketButton` | "I cooked it" fill on the ticket | `#FFFFFF` | `#FFFFFF` |
| `Theme.Colors.onTicketButton` | Its label | `#A3145C` | `#A3145C` |

- `AccentColor.colorset` is set to `beetText`: light `#A3145C` (sRGB 0.639, 0.078, 0.361), dark `#F58ACB` (0.961, 0.541, 0.796).
- `RootView` applies `.tint(Theme.Colors.beetText)`.
- **`.borderedProminent` and `.bordered` are banned.** In dark mode they would put white on `#F58ACB`. Use the DS button styles instead.

### 2.3 Freshness: the heat scale

`FreshTone` is new, pure, and lives in FridgeCore (§6.2). It is derived from the existing `ExpiryStatus` and from whether the item is in the freezer.

| `FreshTone` | From `ExpiryStatus` | Tag shape | Tag fill | Tag text and glyph | Glyph | Mark (dots, strip, meter) |
|---|---|---|---|---|---|---|
| `.today` | `.expiringSoon(0 or 1)` | Tape (notched) | `today` | `onToday` | `alarm.fill` | `today` |
| `.soon` | `.expiringSoon(≥2)` | Tape (notched) plus 0.5pt `tapeEdge` stroke in light mode | `soon` | `onSoon` | `hourglass` | `soon` |
| `.fresh` | `.fresh`, not in the freezer | Text only | none | `fresh` | `leaf.fill` | `fresh` |
| `.paused` | `.fresh`, in the freezer | Text only | none | `frost` | `snowflake` | `frost` |
| `.past` | `.expired` | Rect r4, 1.25pt outline | none | `past` | `exclamationmark.triangle` | hollow `past` outline |
| `.none` | `.unknown` | No tag. The editor shows "No date" in `text3`. | — | — | — | `fillStrong` |

Freezer items that are `.expiringSoon` or `.expired` stay on the normal ladder. Only non-urgent freezer items are paused.

| Swift token | Light | Dark | Use |
|---|---|---|---|
| `Theme.Colors.fresh` | `#1B7440` | `#6CD697` | Fresh text, "Ready", have-meter segments, "Used up" swipe tint |
| `Theme.Colors.freshSoft` | `#DDF2E4` | `#1F3327` | "Ready" badge fill, "Still here" stat tile |
| `Theme.Colors.soon` | `#FFC21F` | `#FFC933` | Citrus tape fill, strip segment |
| `Theme.Colors.onSoon` | `#16181D` | `#2E2000` | Text on citrus |
| `Theme.Colors.soonText` | `#8A5B00` | `#FFD35C` | Citrus as text ("uses 2 expiring" when all of them are soon) |
| `Theme.Colors.soonSoft` | `#FFF1C7` | `#3A2E0C` | Receipt "estimated" wash |
| `Theme.Colors.today` | `#C8341A` | `#FF6A47` | Tomato tape fill, strip segment |
| `Theme.Colors.onToday` | `#FFFFFF` | `#2B0A03` | Text on tomato |
| `Theme.Colors.todayText` | `#B42D14` | `#FF8B70` | Tomato as text: "Use soon" glyph, errors, destructive text, tossed numbers |
| `Theme.Colors.todaySoft` | `#FBE3DD` | `#3A1A14` | "Tossed it" button, error cards, tossed stat tile |
| `Theme.Colors.past` | `#4E555A` | `#B8B0BE` | Past tag text and outline (HC: `#3A4045` / `#D6D0DA`) |
| `Theme.Colors.frost` | `#236A91` | `#8FCBEB` | Paused (frozen) text |
| `Theme.Colors.frostSoft` | `#E3F0F7` | `#1C2A33` | Frozen legend chip when selected |
| `Theme.Colors.tapeEdge` | black @ 10% | — (light only) | Outline on citrus tape and light-fill crate tiles |

### 2.4 Timer dial

The dial has a dark face in both modes, so every arc color has high contrast wherever the dial sits.

| Swift token | Light | Dark | Use |
|---|---|---|---|
| `Theme.Colors.dialFace` | `#16181D` | `#0E0C10` | Dial face |
| `Theme.Colors.dialTrack` | `#3A3D44` | `#3A3540` | Unfilled track |
| `Theme.Colors.dialTick` | white @ 35% | white @ 35% | 14 day ticks |
| `Theme.Colors.dialFresh` | `#6CD697` | `#6CD697` | Arc, fresh (9.9:1 on face) |
| `Theme.Colors.dialSoon` | `#FFC933` | `#FFC933` | Arc, soon (11.6:1) |
| `Theme.Colors.dialToday` | `#FF6A47` | `#FF6A47` | Arc, today (6.3:1) |
| `Theme.Colors.dialFrost` | `#8FCBEB` | `#8FCBEB` | Arc, paused (10.1:1) |
| `Theme.Colors.dialPast` | `#978F9D` | `#978F9D` | Dashed track, past (5.7:1) |

The center number is white (17.8:1). The unit line is white @ 75% (10.4:1).

### 2.5 Category crates

Each category has four colors:

- **crate** `fill` with `onFill`: full saturation, for hero objects only.
- **soft** `soft` with `deep` glyph: for dense lists.

`deep` on `soft` is at least 4.9:1, and `onFill` on `fill` is at least 5.0:1, in both modes.

| `FoodCategory` | Name | Crate fill / on (light) | Crate fill / on (dark) | Soft / deep (light) | Soft / deep (dark) |
|---|---|---|---|---|---|
| `produce` | Herb | `#237F43` / `#FFFFFF` | `#5BD084` / `#0B2A12` | `#E2EEE7` / `#21733E` | `#2A3E35` / `#5BD084` |
| `dairy` | Milk carton | `#2A64D6` / `#FFFFFF` | `#6FA3FF` / `#061A3D` | `#E3EBFA` / `#285EC7` | `#2E354D` / `#72A5FF` |
| `meat` | Coral | `#F28A70` / `#43100A` ◇ | `#F5977F` / `#43100A` | `#F9E9E5` / `#A54633` | `#493334` / `#F5977F` |
| `seafood` | Sea | `#0B7872` / `#FFFFFF` | `#3CC7BC` / `#032A28` | `#DFEDED` / `#0C706B` | `#243D40` / `#3CC7BC` |
| `bakery` | Crust | `#9A5520` / `#FFFFFF` | `#D99557` / `#2E1504` | `#F2E9E2` / `#955320` | `#43332C` / `#DB995E` |
| `frozen` | Ice | `#A8DDF4` / `#0A3346` ◇ | `#8FD3F2` / `#0A3346` | `#E4EFF5` / `#296C8F` | `#353F4B` / `#8FD3F2` |
| `grains` | Oat | `#E4C487` / `#3F2C05` ◇ | `#DDBB78` / `#3F2C05` | `#F4EEE2` / `#82611E` | `#443A32` / `#DDBB78` |
| `condiments` | Olive | `#5F6E17` / `#FFFFFF` | `#B5C74A` / `#1E2404` | `#EAECE1` / `#5C6B17` | `#3C3D29` / `#B5C74A` |
| `beverages` | Grape | `#7338B5` / `#FFFFFF` | `#B98CF2` / `#22083F` | `#EDE5F5` / `#7338B5` | `#3D314B` / `#BD93F3` |
| `snacks` | Tangerine | `#F7A03A` / `#3A1800` ◇ | `#F5A84E` / `#3A1800` | `#FAEDE1` / `#97561B` | `#49362A` / `#F5A84E` |
| `other` | Pepper | `#5E666D` / `#FFFFFF` | `#A7B0B8` / `#15181B` | `#EAEBEC` / `#5D646B` | `#39383F` / `#A7B0B8` |

◇ = light fill. In light mode, crate tiles of these categories get a 0.5pt `tapeEdge` inner stroke so they don't wash out on white.

### 2.6 Where each color family may appear

- **Crate (full) fills: only these places.**
  - Tonight hero block and compact-pick tile
  - Recipe grid tiles
  - Recipe detail header
  - Check-in card
  - Item editor header tile and the selected category option
  - Empty-state tile fans
  - Check-in entry fan
- **Soft tiles: every list.** That means Fridge rows, Use-soon chips, receipt, photo and cook rows, recipe rows, plan rows, recipe picker, shopping aisle headers, and buy-again rows.
- **Heat colors: only for time.**
  - Tags, strip, dial, rescue sticker dots, week-strip dots, "uses N expiring" text, and summary numbers.
  - Tomato text also marks errors and destructive text. This is the one allowed overlap: both mean "attention".
- **Beet: only things you can press, or the current selection.** Two non-pressable exceptions:
  - The ticket, which *is* the committed action.
  - The step numbers on the recipe detail (`beetText`), which read as the cook's pen.
- **Never** combine a crate fill and a heat fill on the same element.

### 2.7 Contrast (measured)

| Pair | Light | Dark |
|---|---|---|
| ink on surface / canvas | 17.76 / 16.08 | 15.31 / 16.90 |
| text2 on surface / canvas / fill | 7.58 / 6.86 / 6.30 | 8.16 / 9.00 / 7.02 |
| text3 on surface / canvas / fill | 5.35 / 5.22 / 4.79 | 5.50 / 6.06 / 4.73 |
| text2 HC / text3 HC on fill | 8.73 / 6.30 | 9.77 / 7.02 |
| onBeet on beet | 7.47 | 5.71 |
| onBeet2 on beet | 6.23 | 4.76 |
| beetText on surface / canvas | 7.47 / 6.76 | 7.66 / 8.45 |
| beetStrong on beetSoft | 7.06 | 9.18 |
| onTicketButton on ticketButton | 7.47 | 7.47 |
| fresh on surface / freshSoft | 5.80 / 4.95 | 9.55 / 7.50 |
| onSoon on soon (tape) | 10.98 | 10.32 |
| soonText on surface | 5.87 | 12.02 |
| onToday on today (tape) | 5.30 | 6.45 |
| todayText on surface / canvas / todaySoft | 6.31 / 5.72 / 5.15 | 7.49 / 8.27 / 6.86 |
| past on surface | 7.58 | 8.16 |
| frost on surface / canvas | 5.93 / 5.37 | 9.72 / 10.73 |
| category onFill on fill (all 11) | 5.01 – 9.09 | 6.84 – 8.58 |
| category deep on soft (all 11) | 4.91 – 5.78 | 4.93 – 6.50 |

### 2.8 Swift reference (DS implements exactly this)

```swift
// DesignSystem/Theme.swift
import SwiftUI
import UIKit

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
}
```

`FoodCategory.palette` (in `DesignSystem/Food.swift`) returns `CategoryPalette(fill:onFill:soft:deep:isLightFill:)`, built with `Color(light:dark:)` from the table in §2.5. For example:

```swift
case .produce: return CategoryPalette(
    fill: Color(light: 0x237F43, dark: 0x5BD084), onFill: Color(light: 0xFFFFFF, dark: 0x0B2A12),
    soft: Color(light: 0xE2EEE7, dark: 0x2A3E35), deep: Color(light: 0x21733E, dark: 0x5BD084),
    isLightFill: false)
```

Store the 11 palettes as `static let`s in a private enum and have `palette` switch over them, so no `Color` is allocated per access.

---

## 3. Typography

Fonts are system only:

- **SF Pro** is the voice of the app.
- **SF Pro Rounded Heavy/Black** is used for every number (price-card numerals, always `.monospacedDigit()`) and for tags.
- **New York italic** is used only for the recipe headnote.
- **SF Mono** is used only for machine text: raw receipt lines, skipped lines and barcodes.

Every style is built on a Dynamic Type text style. Sizes shown are at the default "Large" setting. Navigation titles stay default SF Pro. Never touch `UINavigationBar.appearance()`.

| Swift token | SwiftUI definition | CSS (1rem = 17px) | pt | Used for |
|---|---|---|---|---|
| `Theme.Fonts.display` | `.system(.largeTitle, weight: .heavy)` | `800 2rem/1.08 var(--font-text)` | 34 | Check-in item name, recipe-detail header title |
| `Theme.Fonts.heroTitle` | `.system(.title, weight: .heavy)` | `800 1.647rem/1.12 var(--font-text)` | 28 | Tonight hero title, ticket title |
| `Theme.Fonts.titleHeavy` | `.system(.title2, weight: .heavy)` | `800 1.294rem/1.2 var(--font-text)` | 22 | Empty-state titles, name fields in editors, check-in summary title |
| `Theme.Fonts.section` | `.system(.title3, weight: .heavy)` | `800 1.176rem/1.25 var(--font-text)` | 20 | Section headers |
| `Theme.Fonts.cardTitle` | `.system(.title3, weight: .bold)` | `700 1.176rem/1.25 var(--font-text)` | 20 | Compact pick titles |
| `Theme.Fonts.tileTitle` | `.system(.headline, weight: .heavy)` | `800 1rem/1.25 var(--font-text)` | 17 | Recipe grid titles, card titles ("Weekly check-in", "Shop for this week") |
| `Theme.Fonts.rowTitle` | `.system(.body, weight: .semibold)` | `600 1rem/1.3 var(--font-text)` | 17 | Food, recipe, and shopping row names; ingredient names |
| `Theme.Fonts.body` | `.body` | `400 1rem/1.42 var(--font-text)` | 17 | Steps, chat, descriptions |
| `Theme.Fonts.detail` | `.subheadline` | `400 .882rem/1.35 var(--font-text)` | 15 | "qty · location", reasons, subtitles |
| `Theme.Fonts.detailStrong` | `.subheadline.weight(.semibold)` | `600 .882rem/1.35 var(--font-text)` | 15 | Date line, quiet buttons, legend labels |
| `Theme.Fonts.button` | `.system(.body, weight: .bold)` | `700 1rem var(--font-text)` | 17 | Regular buttons |
| `Theme.Fonts.buttonCompact` | `.system(.subheadline, weight: .bold)` | `700 .882rem var(--font-text)` | 15 | Compact buttons |
| `Theme.Fonts.chip` | `.system(.subheadline, weight: .semibold)` (`.bold` when selected) | `600 .882rem var(--font-text)` | 15 | Chips |
| `Theme.Fonts.tag` | `.system(.footnote, design: .rounded, weight: .bold).monospacedDigit()` | `700 .765rem/1 var(--font-rounded); font-variant-numeric: tabular-nums` | 13 | Freshness tags, stickers, counts in headers |
| `Theme.Fonts.eyebrow` | `.system(.caption, weight: .heavy)` + `.eyebrowStyle()` | `800 .706rem var(--font-text); text-transform: uppercase; letter-spacing: .08em` | 12 | "TOP PICK", "ON FOR TONIGHT", slot labels, check-in location. At most one per block. |
| `Theme.Fonts.number` | `.system(.headline, design: .rounded, weight: .heavy).monospacedDigit()` | `800 1rem var(--font-rounded)` | 17 | "35" in "35 min", "5/7", quantities, legend counts |
| `Theme.Fonts.numberLarge` | `.system(.title2, design: .rounded, weight: .black).monospacedDigit()` | `900 1.294rem/1 var(--font-rounded)` | 22 | Step numbers, plan day numbers, time sticker, numbered empty-state steps |
| `Theme.Fonts.weekNumber` | `.system(.title3, design: .rounded, weight: .black).monospacedDigit()` | `900 1.176rem/1 var(--font-rounded)` | 20 | Week-strip day numbers |
| `Theme.Fonts.displayNumber` | `.system(.largeTitle, design: .rounded, weight: .black).monospacedDigit()` | `900 2rem/1 var(--font-rounded)` | 34 | Dial center, stat tiles, servings, receipt totals |
| `Theme.Fonts.headnote` | `.system(.title3, design: .serif).italic()` | `italic 400 1.176rem/1.4 var(--font-serif)` | 20 | **Only** the recipe summary on Recipe detail and in the recipe editor |
| `Theme.Fonts.footnote` | `.footnote` | `400 .765rem/1.38 var(--font-text)` | 13 | Section footers, explanations (`text3`) |
| `Theme.Fonts.caption` | `.caption.weight(.semibold)` | `600 .706rem var(--font-text)` | 12 | Category labels in the editor grid |
| `Theme.Fonts.mono` | `.system(.caption, design: .monospaced)` | `400 .706rem var(--font-mono)` | 12 | Raw receipt lines, skipped lines, barcode, API key field |

`View.eyebrowStyle()` applies `.textCase(.uppercase)` and `.tracking(1.0)`.

**Composing numbers with units.** Use `Theme.numberText("35", unit: "min")`. It returns `Text("35").font(Theme.Fonts.number) + Text(" min").font(Theme.Fonts.detail)`, which reads as one accessibility string.

Rules:

- The minimum text size is 12pt.
- Never write `.font(.system(size:))` for text. The only exception is SF Symbol glyphs sized from an `@ScaledMetric` (tiles, dial ticks).
- Numbers are always tabular.

---

## 4. Spacing, radius, size, elevation

**`Theme.Space`** (pt, and px on the web):

| Token | Value |
|---|---|
| `xxs` | 4 |
| `xs` | 8 |
| `s` | 12 |
| `m` | 16 |
| `l` | 20 |
| `xl` | 24 |
| `xxl` | 32 |
| `xxxl` | 40 |
| `gutter` | 16 (screen side margin) |
| `stack` | 12 (gap between cards) |
| `section` | 24 (gap between sections) |
| `cardPadding` | 16 |
| `heroPadding` | 20 |
| `deckPadding` | 24 |

**`Theme.Radius`** (always `RoundedRectangle(cornerRadius:style: .continuous)`):

| Token | Value | Use |
|---|---|---|
| `meter` | 2 | Coverage meter segments |
| `strip` | 3 | Freshness strip segments |
| `tag` | 4 | Past outline tag |
| `tileSmall` | 8 | 28pt tiles |
| `tile` | 11 | 40pt tiles |
| `tileLarge` | 16 | 56pt tiles |
| `tileXL` | 18 | 64pt tiles |
| `input` | 14 | Action tiles, text-editor cards, location tiles, dashed placeholders |
| `card` | 22 | Surface cards, recipe grid tiles, check-in entry, stat tiles |
| `hero` | 28 | Tonight hero, ticket, recipe-detail header |
| `deck` | 32 | Check-in card, sheet corners |

Capsules are used for buttons, chips, stickers and the composer.

**`Theme.Metrics`:**

| Token | Value |
|---|---|
| `minTap` | 44 |
| `button` | 50 |
| `buttonCompact` | 44 |
| `foodRowMin` | 60 |
| `shoppingRowMin` | 52 |
| `stripHeight` | 12 |
| `dialLarge` | 168 |
| `dialSmall` | 64 |

**Elevation: exactly three levels. There are no other shadows.**

| Level | Treatment | Only on |
|---|---|---|
| Flat (default) | `surface` on `canvas`, no shadow, no border. With Increase Contrast, cards get a 1pt `separator` border. | Every card, row, tile and block |
| Sticker lift | `.shadow(color: Theme.Colors.stickerShadow, radius: 1.5, x: 0, y: 1)` | Stickers, the time sticker, the check-in stamp |
| Bar | `.background(.bar)` plus a 0.5pt `separator` top hairline | Bottom action bars and the chef composer (the system handles Reduce Transparency) |

**Lists.** Apply `.listChrome()` to the List. It sets hidden scroll background, `canvas`, and `.listSectionSpacing(.compact)`. On each section's content apply:

- `.listRowBackground(Theme.Colors.surface)`
- `.listRowSeparatorTint(Theme.Colors.separator)`

Separators align with text, not tiles: put `.alignmentGuide(.listRowSeparatorLeading) { $0[.leading] }` on the row's text stack. `FoodRow` already does this.

---

## 5. Iconography

SF Symbols only, using filled variants in tiles and monochrome rendering, colored by context token.

### 5.1 Runtime guard (mandatory for every category, location and tone glyph)

A misspelled or unavailable symbol renders blank with no build error. So:

```swift
extension Theme {
    /// Returns `name` if this OS has it, otherwise `fallback`.
    static func symbol(_ name: String, fallback: String) -> String {
        UIImage(systemName: name) != nil ? name : fallback
    }
}
```

The DS properties `FoodCategory.symbol`, `StorageLocation.glyph` and `FreshTone.symbol` already return guarded names. Screen code uses those properties and never hard-codes category glyphs.

### 5.2 Locations (`StorageLocation.glyph`, DS extension; the model's existing `symbol` is unchanged)

| Location | Glyph | Fallback |
|---|---|---|
| fridge | `refrigerator.fill` | `square.fill` |
| freezer | `snowflake` | `snowflake` |
| pantry | `cabinet.fill` | `archivebox.fill` |

### 5.3 Food categories (`FoodCategory.symbol`)

| Category | Title (`FoodCategory.title`) | Glyph | Fallback |
|---|---|---|---|
| produce | Produce | `carrot.fill` | `leaf.fill` |
| dairy | Dairy & eggs | `drop.fill` | `circle.fill` |
| meat | Meat | `flame.fill` | `circle.fill` |
| seafood | Seafood | `fish.fill` | `drop.fill` |
| bakery | Bakery | `birthday.cake.fill` | `square.fill` |
| frozen | Frozen | `thermometer.snowflake` | `snowflake` |
| grains | Grains & dry goods | `bag.fill` | `square.fill` |
| condiments | Sauces & spices | `waterbottle.fill` | `drop.fill` |
| beverages | Drinks | `mug.fill` | `cup.and.saucer.fill` |
| snacks | Snacks | `popcorn.fill` | `star.fill` |
| other | Other | `shippingbox.fill` | `square.fill` |

Heat glyphs never use `flame`, so the meat flame (a grill) is never mistaken for urgency.

**Inference rule.** Free text goes to a category through `FoodCategory.guess(category:name:)` in FridgeCore (§6.1). An explicit category wins. Otherwise the name is matched against keywords, with whole-word matching.

### 5.4 Freshness tones (`FreshTone.symbol`)

| Tone | Glyph |
|---|---|
| today | `alarm.fill` |
| soon | `hourglass` |
| fresh | `leaf.fill` |
| paused | `snowflake` |
| past | `exclamationmark.triangle` |

### 5.5 Actions and states

| Meaning | Glyph |
|---|---|
| Use soon (section) | `timer` |
| Past date (section) | `exclamationmark.triangle` |
| Ready | `checkmark.circle.fill` |
| Missing / add to list / shopping | `basket` / `basket.fill` (fallback `cart` / `cart.fill`) |
| Cook this | `fork.knife` |
| I cooked it | `frying.pan.fill` |
| Chef | `sparkles` |
| Scan receipt / barcode / photo / type it | `doc.text.viewfinder` / `barcode.viewfinder` / `camera.viewfinder` / `square.and.pencil` |
| Take photo / library | `camera.fill` / `photo.on.rectangle` |
| Check-in | `checklist` |
| Still have it / Used it / Tossed it | `checkmark` / `fork.knife` / `trash` |
| Undo / Skip | `arrow.uturn.backward` / `forward.end` |
| Plan it | `calendar.badge.plus` |
| Change dinner | `arrow.triangle.2.circlepath` |
| Put away | `refrigerator.fill` |
| Save as recipe | `book.closed.fill` |
| Settings | `gearshape` |
| Share | `square.and.arrow.up` |
| More | `ellipsis.circle` |
| Send | `arrow.up` |
| Include / check | `checkmark.circle.fill` / `circle` |
| Missing ingredient | `circle.dashed` |
| Favorite | `heart` / `heart.fill` |
| Servings | `person.2.fill` |
| Time | `clock` |
| Inline confirmation | `checkmark` |

### 5.6 Tabs (the system fills them when selected)

| Tab | Glyph |
|---|---|
| Tonight | `fork.knife` |
| Fridge | `refrigerator` |
| Recipes | `book.closed` |
| Plan | `calendar` |
| Shopping | `Theme.symbol("basket", fallback: "cart")` |

---

## 6. FridgeCore additions (pure logic, owned by DS, unit-tested in CI)

These need no SwiftUI. They go in `ios/Packages/FridgeCore/Sources/FridgeCore/` with tests in `Tests/FridgeCoreTests/`. They are run by `swift test --package-path ios/Packages/FridgeCore`.

### 6.1 `FoodCategory.swift`

```swift
public enum FoodCategory: String, CaseIterable, Identifiable, Sendable {
    case produce, dairy, meat, seafood, bakery, frozen, grains, condiments, beverages, snacks, other
    public var id: String { rawValue }
    public var title: String            // table §5.3
    public init(category: String, name: String) { self = Self.guess(category: category, name: name) }
    public static func guess(category: String, name: String) -> FoodCategory
    /// First non-optional, non-staple ingredient whose guess isn't `.other`; else `.other`.
    public static func lead(ingredients: [String], staples: [String]) -> FoodCategory
    /// Shopping aisle order.
    public static let aisleOrder: [FoodCategory] = [.produce, .bakery, .meat, .seafood, .dairy, .frozen, .grains, .condiments, .snacks, .beverages, .other]
}
```

**Tokenizing.** Lowercase the string, split on `CharacterSet.letters.inverted`, drop empties, and map through `IngredientName.singularize`. That function is internal to the module and usable here. Do **not** remove descriptors: "frozen" must survive. Build `joined = " " + words.joined(separator: " ") + " "`. A key `k`, which may be several words and is always written in singular form, matches when `joined.contains(" " + k + " ")`. This is whole-word matching, so "eggplant" never matches "egg".

**`guess(category:name:)`** works in this order:

1. **Category string.**
   1. Trim it and lowercase it. If it is a `rawValue`, return that category.
   2. If the whole string is in `categorySynonyms`, return the match.
   3. Otherwise, go through its words in order and return the first word that is a `rawValue` or a synonym. This handles titles such as "Dairy & eggs" and "Frozen foods".
2. **Category synonyms:**

   | Synonym | Category |
   |---|---|
   | vegetable, veg, veggie, fruit, herb, salad, green | produce |
   | egg, cheese, milk, yogurt | dairy |
   | poultry, deli, protein | meat |
   | fish, shellfish | seafood |
   | bread, baked, "baked goods" | bakery |
   | "frozen foods" | frozen |
   | grain, baking, pasta, rice, cereal, "dry goods", bean, legume | grains |
   | condiment, sauce, oil, spice, spread, seasoning, dressing | condiments |
   | beverage, drink, juice, soda | beverages |
   | snack, sweet, candy | snacks |
   | canned, household | other |

3. **Name exceptions**, checked first and in this order:

   | Name contains | Category |
   |---|---|
   | broth, stock, bouillon, soup | other |
   | peanut butter, almond butter, black pepper | condiments |
   | ice cream, frozen | frozen |
   | butter lettuce, green bean, green onion | produce |
   | egg noodle | grains |

4. **Name keyword lists**, checked in this order. The first hit wins.

   | Category | Keywords |
   |---|---|
   | seafood | salmon, shrimp, prawn, tuna, cod, fish, crab, scallop, tilapia, halibut, mussel, clam, lobster, sardine, anchovy |
   | meat | chicken, beef, pork, bacon, sausage, turkey, ham, lamb, steak, prosciutto, salami, chorizo, mince, duck, veal, pepperoni, meatball |
   | dairy | milk, cheese, cheddar, parmesan, mozzarella, feta, ricotta, yogurt, yoghurt, cream, butter, egg, buttermilk, kefir, ghee |
   | bakery | bread, sourdough, bagel, baguette, bun, roll, tortilla, pita, croissant, muffin, naan, brioche |
   | condiments | sauce, ketchup, mustard, mayo, mayonnaise, vinegar, oil, honey, jam, salsa, dressing, syrup, soy, pesto, spice, cumin, paprika, cinnamon, oregano, salt |
   | grains | flour, rice, pasta, spaghetti, penne, noodle, oat, quinoa, cereal, couscous, sugar, cornstarch, baking powder, baking soda, yeast, lentil, bean, chickpea, breadcrumb |
   | beverages | coffee, tea, juice, soda, water, wine, beer, kombucha, lemonade, seltzer |
   | snacks | chip, cracker, cookie, chocolate, pretzel, popcorn, nut, almond, walnut, cashew, peanut, granola, candy |
   | produce | apple, avocado, banana, basil, berry, blueberry, strawberry, raspberry, broccoli, cabbage, carrot, cauliflower, celery, cilantro, cucumber, eggplant, garlic, ginger, grape, kale, lemon, lettuce, lime, mango, mushroom, onion, orange, parsley, pea, peach, pear, pepper, potato, scallion, shallot, spinach, squash, sweet potato, thyme, rosemary, tomato, zucchini, corn, arugula, asparagus, jalapeno, herb, salad, green |

5. Otherwise, `.other`.

**`lead(ingredients:staples:)`** skips any name whose `IngredientName.normalize` equals a normalized staple. The caller passes only non-optional ingredient names, in recipe order.

**Tests** (`FoodCategoryTests.swift`):

| Input | Expected |
|---|---|
| `("", "Baby spinach")` | produce |
| `("", "Eggplant")` | produce |
| `("", "Eggs")` | dairy |
| `("baking", "Flour")` | grains |
| `("canned", "Chicken broth")` | other |
| `("", "Chicken broth")` | other |
| `("", "Peanut butter")` | condiments |
| `("", "Frozen peas")` | frozen |
| `("produce", "Frozen peas")` | produce |
| `("Dairy & eggs", "Thing")` | dairy |
| `("", "Salmon fillet")` | seafood |
| `("", "Sourdough bread")` | bakery |
| `("", "Rice vinegar")` | condiments |
| `("", "Green beans")` | produce |
| `("", "Mystery item")` | other |
| `lead(["salt", "olive oil", "chicken thighs", "lemon"], staples: RecipeMatcher.defaultStaples)` | meat |
| `lead(["flour", "milk", "eggs"], staples: [])` | grains |
| `lead([], staples: [])` | other |

### 6.2 `Freshness.swift`

```swift
public enum FreshTone: String, CaseIterable, Sendable { case past, today, soon, fresh, paused, none }

extension ExpiryStatus {
    public func tone(inFreezer: Bool = false) -> FreshTone {
        switch self {
        case .unknown: return .none
        case .expired: return .past
        case .expiringSoon(let d): return d <= 1 ? .today : .soon
        case .fresh: return inFreezer ? .paused : .fresh
        }
    }

    /// Visible tag text.
    public var shortLabel: String {
        switch self {
        case .unknown: return "No date"
        case .expired(let d): return d <= 1 ? "1 day past" : "\(d) days past"
        case .expiringSoon(0): return "Today"
        case .expiringSoon(1): return "Tomorrow"
        case .expiringSoon(let d), .fresh(let d): return Self.span(d, short: true)
        }
    }

    /// VoiceOver phrase.
    public func spokenLabel(inFreezer: Bool = false) -> String {
        switch self {
        case .unknown: return "No expiration date"
        case .expired(let d): return d <= 1 ? "Expired yesterday" : "Expired \(d) days ago"
        case .expiringSoon(0): return "Expires today"
        case .expiringSoon(1): return "Expires tomorrow"
        case .expiringSoon(let d): return "Expires in \(d) days"
        case .fresh(let d): return (inFreezer ? "Frozen, " : "Fresh, ") + Self.span(d, short: false) + " left"
        }
    }

    /// 14-day kitchen-timer arc. Today = a nub, past/unknown = no arc.
    public var dialFraction: Double {
        switch self {
        case .unknown, .expired: return 0
        case .expiringSoon(let d), .fresh(let d): return d <= 0 ? 0.04 : min(Double(d) / 14, 1)
        }
    }

    /// Dial center: big value and a unit line.
    public var dialParts: (value: String, unit: String) {
        switch self {
        case .unknown: return ("–", "no date")
        case .expired(let d): return ("\(d)", d == 1 ? "day past" : "days past")
        case .expiringSoon(0): return ("0", "use today")
        case .expiringSoon(let d), .fresh(let d):
            if d == 1 { return ("1", "day left") }
            if d < 14 { return ("\(d)", "days left") }
            if d < 60 { return ("\(d / 7)", "weeks left") }
            return ("\(d / 30)", "months left")
        }
    }

    static func span(_ d: Int, short: Bool) -> String {
        if d == 1 { return "1 day" }
        if d < 14 { return "\(d) days" }
        if d < 60 { return short ? "\(d / 7) wks" : "\(d / 7) weeks" }
        return short ? "\(d / 30) mo" : "\(d / 30) months"
    }
}

/// Counts for the Fridge freshness strip and the Tonight date line.
public struct FreshnessCounts: Equatable, Sendable {
    public var past = 0, today = 0, tomorrow = 0, soon = 0, fresh = 0, paused = 0, noDate = 0
    public init() {}
    public init(_ items: [(status: ExpiryStatus, inFreezer: Bool)]) { for i in items { add(i.status, inFreezer: i.inFreezer) } }
    public mutating func add(_ status: ExpiryStatus, inFreezer: Bool)   // .expiringSoon(0) → today, (1) → tomorrow
    public var byTomorrow: Int { today + tomorrow }
    public var total: Int { past + today + tomorrow + soon + fresh + paused + noDate }
    /// .today returns byTomorrow; .none returns noDate.
    public func count(for tone: FreshTone) -> Int
    /// "2 to use today", "1 to use by tomorrow", "4 to use this week", "1 past its date" / "3 past their date",
    /// "Everything's fresh", or "Nothing here yet" when total == 0. Checked in that order.
    public var headline: String
    /// "Freshness: 1 past date, 2 by tomorrow, 4 this week, 23 fresh, 3 frozen, 2 no date". Zero buckets are omitted.
    public var spokenSummary: String
}
```

Legend labels, used by the DS and shared with the web, per tone:

| Tone | Legend label |
|---|---|
| past | "past date" |
| today | "by tomorrow" |
| soon | "this week" |
| fresh | "fresh" |
| paused | "frozen" |
| none | "no date" |

### 6.3 `Rescue.swift`

```swift
public struct RescueItem: Equatable, Sendable { public var name: String; public var status: ExpiryStatus }

public enum Rescue {
    /// Stock that is `.expiringSoon` and matches a non-optional requirement, most urgent first,
    /// de-duplicated by normalized name. Expired food is excluded (it can't be rescued).
    public static func items(requirements: [IngredientRequirement], stock: [StockItem], now: Date = .now,
                             soonThresholdDays: Int = 3, calendar: Calendar = .current) -> [RescueItem]
}
```

It is used by the Recipes rows ("uses spinach, milk"), the Plan week dots, and urgent ingredient tags on Recipe detail.

**Tests** cover:
- `shortLabel`, `spokenLabel` and `dialParts` for 0, 1, 3, 13, 20 and 90 days, expired 1 and 4, and unknown.
- `tone` with the freezer flag for fresh 30 → paused, and soon 2 in the freezer → soon.
- `dialFraction` for 0 → 0.04, 7 → 0.5, 30 → 1, and expired → 0.
- `FreshnessCounts.headline` precedence.
- `Rescue.items` ordering and de-duplication.

---

## 7. Design system API

Folder: `ios/RefrigeratorRecipes/DesignSystem/`. It is in the app target; XcodeGen picks it up automatically. All types are `internal`. Every view takes the existing semantic types: `ExpiryStatus`, `RecipeMatch`, `StorageLocation`, plus the new `FoodCategory` and `FreshTone`.

| File | Contents |
|---|---|
| `Theme.swift` | `Color(light:dark:…)`, `Theme.Colors`, `Theme.Fonts`, `Theme.Space`, `Theme.Radius`, `Theme.Metrics`, `Theme.symbol`, `Theme.numberText`, `eyebrowStyle()` |
| `Motion.swift` | `Theme.Motion`, `motionAnimation`, `AnyTransition.reducible`, haptic helpers |
| `Food.swift` | `CategoryPalette`, `FoodCategory` UI extension, `StorageLocation.glyph`, model conveniences, `CategoryTile`, `TileFan`, `FoodRow`, `FoodChip` |
| `Freshness.swift` | `FreshTone` UI extension, `TapeShape`, `FreshnessTag`, `ToneDot`, `FreshnessStrip`, `FreshnessDial`, `ExpiryBadge` shim |
| `Coverage.swift` | `CoverageBadge`, `CoverageMeter` |
| `Buttons.swift` | `ButtonSize`, `CapsuleButtonStyle` + five named styles, `QuietButtonStyle`, `IconCircleButtonStyle`, `InlineConfirmButton` |
| `Chips.swift` | `Chip`, `ChipOption`, `ChipPicker` |
| `Containers.swift` | `surfaceCard`, `crateBlock`, `listChrome`, `sheetChrome`, `actionBar`, `SectionHeader`, `SheetLede`, `EmptyStateView`, `EmptyAction`, `ActionTile`, `Sticker`, `TimeSticker`, `TicketCard`, `TicketHalf`, `CheckToggle`, `ServingsStepper`, `SettingsIconTile` |

### 7.1 Theme helpers

```swift
extension Theme {
    enum Space { static let xxs: CGFloat = 4, xs: CGFloat = 8, s: CGFloat = 12, m: CGFloat = 16, l: CGFloat = 20, xl: CGFloat = 24, xxl: CGFloat = 32, xxxl: CGFloat = 40
                 static let gutter: CGFloat = 16, stack: CGFloat = 12, section: CGFloat = 24, cardPadding: CGFloat = 16, heroPadding: CGFloat = 20, deckPadding: CGFloat = 24 }
    enum Radius { static let meter: CGFloat = 2, strip: CGFloat = 3, tag: CGFloat = 4, tileSmall: CGFloat = 8, tile: CGFloat = 11, tileLarge: CGFloat = 16, tileXL: CGFloat = 18,
                  input: CGFloat = 14, card: CGFloat = 22, hero: CGFloat = 28, deck: CGFloat = 32 }
    enum Metrics { static let minTap: CGFloat = 44, button: CGFloat = 50, buttonCompact: CGFloat = 44, foodRowMin: CGFloat = 60, shoppingRowMin: CGFloat = 52,
                   stripHeight: CGFloat = 12, dialLarge: CGFloat = 168, dialSmall: CGFloat = 64 }
    enum Fonts { /* every token in §3 as `static let name = Font…` */ }
    static func symbol(_ name: String, fallback: String) -> String
    /// `Text(value)` in `Fonts.number` + `Text(" " + unit)` in `Fonts.detail`.
    static func numberText(_ value: String, unit: String) -> Text
}
extension View { func eyebrowStyle() -> some View }   // .font(Theme.Fonts.eyebrow).textCase(.uppercase).tracking(1)
```

### 7.2 Food

```swift
struct CategoryPalette { let fill: Color; let onFill: Color; let soft: Color; let deep: Color; let isLightFill: Bool }

extension FoodCategory {
    var symbol: String            // guarded, §5.3
    var palette: CategoryPalette  // §2.5
}
extension StorageLocation { var glyph: String }   // guarded, §5.2
extension PantryItem {
    var foodCategory: FoodCategory { FoodCategory(category: category, name: name) }
    var inFreezer: Bool { location == .freezer }
}
extension Recipe {
    /// FoodCategory.lead over non-optional ingredient names in order.
    func leadCategory(staples: [String]) -> FoodCategory
}
```

**`CategoryTile`** draws a rounded square with the category glyph.

```swift
struct CategoryTile: View {
    enum Size { case small, row, large, xlarge }   // 28 / 40 / 56 / 64pt; radius 8 / 11 / 16 / 18
    enum Style { case soft, crate }
    init(_ category: FoodCategory, size: Size = .row, style: Style = .soft)
}
```

- `.soft` is a `soft` fill with a `deep` glyph. `.crate` is a `fill` fill with an `onFill` glyph; light-fill crates also get a 0.5pt `tapeEdge` inner stroke in light mode.
- Glyph size is `.system(size: side * 0.45, weight: .semibold)`.
- `side = base * min(scale, 1.5)` with `@ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1`.
- The tile is always `.accessibilityHidden(true)`.
- The glyph uses `.contentTransition(.symbolEffect(.replace))`, so the editor can animate category changes.

**`TileFan`** shows up to 3 crate tiles fanned out (decorative, `.accessibilityHidden(true)`). Rotations are −8°, 4°, 12°; x offsets are 0, 0.69×side, 1.38×side; they overlap left to right.

```swift
struct TileFan: View { init(_ categories: [FoodCategory], size: CategoryTile.Size = .xlarge) }
```

**`FoodRow`** is the standard inventory row content. The screen adds the Button, swipes and context menu around it.

```swift
struct FoodRow: View {
    init(name: String, detail: String, category: FoodCategory, status: ExpiryStatus,
         location: StorageLocation? = nil, estimated: Bool = false, isDimmed: Bool = false,
         rawText: String? = nil)
}
```

- Layout: `HStack(spacing: 12)` containing a soft `CategoryTile(.row)`, then a text `VStack(alignment: .leading, spacing: 2)` with:
  - `name` in `rowTitle`, ink, max 2 lines
  - `rawText`, if present, in `mono`, `text3`, 1 line
  - `detail` in `detail`, `text2`
- Then `Spacer(minLength: 8)` and `FreshnessTag(status:location:estimated:)`.
- Min height 60, vertical padding 8. The separator guard sits on the text stack.
- `isDimmed` (excluded review rows): name and detail switch to `text2`, the tile to opacity 0.5, and the tag is hidden.
- At `dynamicTypeSize.isAccessibilitySize` the tag moves under the detail (`AnyLayout(VStackLayout(alignment: .leading, spacing: 6))`).
- Accessibility: `.accessibilityElement(children: .combine)` with the label `"\(name), \(detail), \(category.title)"` and the value `status.spokenLabel(inFreezer:)` (prefixed "about" when estimated).

**`FoodChip`** is used on the Tonight Use-soon strip and the Chef empty state.

```swift
struct FoodChip: View { init(name: String, category: FoodCategory, status: ExpiryStatus, location: StorageLocation? = nil) }
```

- Layout: a capsule with `surface` fill, padding 6 leading, 12 trailing and 6 vertical, min height 44. Contents: `HStack(spacing: 8)` of a soft `CategoryTile(.small)`, the name in `detailStrong` ink (1 line), and `FreshnessTag(size: .small)`.
- There is no shadow.
- Accessibility label: "Chicken breast, expires today".

### 7.3 Freshness

```swift
extension FreshTone {
    var symbol: String        // §5.4, guarded
    var foreground: Color     // tag text: onToday / onSoon / fresh / frost / past / text3
    var fill: Color?          // today / soon; nil otherwise
    var mark: Color           // today / soon / fresh / frost / past / fillStrong
    var dialMark: Color       // dialToday / dialSoon / dialFresh / dialFrost / dialPast / dialTrack
    var legendLabel: String   // §6.2
}
```

**`TapeShape`** is a rectangle with 3 zig-zag notches on each short end.

```swift
struct TapeShape: Shape {
    var notch: CGFloat = 3
    var teeth = 3
    func path(in r: CGRect) -> Path {
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
```

The fallback is `RoundedRectangle(cornerRadius: 3)`; color and text carry the meaning.

**`FreshnessTag`** is the expiry indicator.

```swift
struct FreshnessTag: View {
    enum Size { case regular, small }
    init(status: ExpiryStatus, location: StorageLocation? = nil, estimated: Bool = false,
         size: Size = .regular, showsNoDate: Bool = false)
}
```

- Content: `HStack(spacing: 4) { Image(systemName: tone.symbol).imageScale(.small); Text((estimated ? "~" : "") + status.shortLabel) }` in `Theme.Fonts.tag`.
- Padding:
  - Filled and past tags: horizontal 10 (small: 8), vertical 5 (small: 3).
  - Text-only tones: horizontal 0.
- Always `.fixedSize()` and `.lineLimit(1)`.
- Background by tone (§2.3):
  - Today/soon: `TapeShape().fill(fill)`. Soon in light mode adds an overlay `TapeShape().stroke(Theme.Colors.tapeEdge, lineWidth: 0.5)`.
  - Past: `RoundedRectangle(cornerRadius: Theme.Radius.tag).strokeBorder(Theme.Colors.past, lineWidth: 1.25)`.
- `.none` renders nothing, unless `showsNoDate` is set, in which case it shows "No date" in `text3`.
- Increase Contrast (`@Environment(\.colorSchemeContrast) == .increased`): filled tags add a 1pt `ink` stroke.
- Accessibility: `.accessibilityElement(children: .ignore)` and `.accessibilityLabel((estimated ? "About: " : "") + status.spokenLabel(inFreezer: location == .freezer))`.

**`ToneDot`** is a filled circle in `tone.mark`. For `.past` it is a 1.5pt stroked circle. It is `.accessibilityHidden(true)`.

```swift
struct ToneDot: View { init(_ tone: FreshTone, size: CGFloat = 8) }
```

**`FreshnessStrip`** is the one-glance signal on the Fridge (and in mini form on receipt review).

```swift
struct FreshnessStrip: View {
    init(counts: FreshnessCounts, filter: Binding<FreshTone?>, showsHeadline: Bool = true,
         onHeadlineTap: (() -> Void)? = nil)
}
```

- A surface card (radius 22, padding 16), `VStack(alignment: .leading, spacing: 12)`.
- **Headline:** `counts.headline` in `Theme.Fonts.section`. When everything is fresh it gets a leading `leaf.fill` in `fresh`. If `onHeadlineTap` is set, the headline is a plain Button with the hint "Shows items to use soon".
- **Bar:** height `Theme.Metrics.stripHeight`, clipped with `Capsule()`.
  - Segments are in the order past, today, soon, fresh, paused, none, and only non-zero buckets are shown.
  - Segments are separated by 3pt gaps. Width is proportional, with a minimum of 10pt.
  - Each segment is a `RoundedRectangle(cornerRadius: Theme.Radius.strip)` filled with `tone.mark`, except `.past`, which is a 1.5pt `strokeBorder` in `past` (hollow).
  - When a filter is active, the non-selected segments drop to opacity 0.35.
  - The bar is `.accessibilityHidden(true)`.

  ```swift
  GeometryReader { geo in
      let total = CGFloat(max(segments.reduce(0) { $0 + $1.count }, 1))
      let gaps = CGFloat(max(segments.count - 1, 0)) * 3
      HStack(spacing: 3) {
          ForEach(segments, id: \.tone) { s in
              segmentShape(s.tone)
                  .frame(width: max(10, (geo.size.width - gaps) * CGFloat(s.count) / total))
          }
      }
  }
  .frame(height: Theme.Metrics.stripHeight)
  .clipShape(Capsule())
  ```

- **Legend:** `ViewThatFits(in: .horizontal) { HStack(spacing: 6) { entries } ; Grid-2-columns { entries } }`.
  - Each entry is a Button, min height 44, with capsule padding 10×6: `ToneDot`, the count in `Theme.Fonts.number`, and `legendLabel` in `detail` `text2`.
  - Tapping an entry toggles `filter` between that tone and nil.
  - A selected entry gets a `fill` capsule background and the `.isSelected` trait.
  - Accessibility: label "2 by tomorrow", hint "Filters the list".
- Counts animate with `.contentTransition(.numericText())`, and segment widths with `motionAnimation(Theme.Motion.smooth, value: counts)`.
- Under `accessibilityDifferentiateWithoutColor` nothing changes: the legend carries words, and past is already hollow.

**`FreshnessDial`** is the kitchen timer.

```swift
struct FreshnessDial: View {
    enum Size { case small, large }   // 64 / 168pt × min(@ScaledMetric scale, 1.4)
    init(status: ExpiryStatus, location: StorageLocation? = nil, size: Size = .large, animatesIn: Bool = true)
}
```

It is drawn in layers, back to front:

1. **Face:** `Circle().fill(Theme.Colors.dialFace)`. The small size adds a 1pt `separator` ring.
2. **Ticks (large only):** 14 of `Capsule().fill(Theme.Colors.dialTick).frame(width: 3, height: 8)`, each offset to the rim and rotated by `i / 14 × 360°`.
3. **Track:** `Circle().inset(by: inset).stroke(Theme.Colors.dialTrack, lineWidth: w)`.
   - `w` = 12 (large) or 6 (small).
   - `inset` = 26 (large) or 8 (small).
   - For `.past` the track is dashed instead: `StrokeStyle(lineWidth: w * 0.5, dash: [4, 5])` in `dialPast`.
4. **Arc:** `Circle().inset(by: inset).trim(from: 0, to: shownFraction).stroke(tone.dialMark, style: StrokeStyle(lineWidth: w, lineCap: .round)).rotationEffect(.degrees(-90))`.
   - The arc is hidden when the fraction is 0.
   - `shownFraction` animates from 0 to `status.dialFraction` on appear with `.smooth(duration: 0.7)`, unless Reduce Motion is on or `animatesIn` is false.
5. **Center:** `VStack(spacing: 0)`:
   - The value in `displayNumber` (small size: `number`), white.
   - The unit in `footnote`, white @ 75% (large only).
   - Paused items show a `snowflake` glyph above the value (large only).
   - Text uses `.minimumScaleFactor(0.6)` and `.lineLimit(1)`.

The dial is `.accessibilityHidden(true)`; the container that holds it carries the spoken label.

### 7.4 Coverage

```swift
struct CoverageBadge: View { init(match: RecipeMatch) }        // same name/signature as today
struct CoverageMeter: View { init(have: Int, total: Int) }
```

- **`canMake`:** a capsule with `freshSoft` fill containing `checkmark.circle.fill` and "Ready" in `Theme.Fonts.tag`, in `fresh`. Padding 8×4.
- **Otherwise:** `HStack(spacing: 6) { CoverageMeter; Text("\(have)/\(total)").font(Theme.Fonts.tag) }` in `ink`, with no fill.
- **`CoverageMeter`:**
  - Up to 12 segments: one `RoundedRectangle(cornerRadius: 2)` of 6×12 per requirement (`@ScaledMetric`), spacing 2. Have segments are `fresh`; missing segments are `fillStrong`.
  - Above 12: a 48×6 capsule track in `fillStrong` with a `fresh` proportional fill.
  - `.accessibilityHidden(true)`.
- **Accessibility:** a combined element. When ready: "Ready to cook, you have everything". Otherwise: "Have 5 of 7 ingredients".

### 7.5 Buttons

```swift
enum ButtonSize { case regular, compact }   // min height 50 / 44

struct CapsuleButtonStyle: ButtonStyle {
    enum Kind { case primary, secondary, neutral, destructiveSoft, inverted }
    init(_ kind: Kind = .primary, size: ButtonSize = .regular, fullWidth: Bool = false)
}
struct PrimaryButtonStyle: ButtonStyle         { init(size: ButtonSize = .regular, fullWidth: Bool = false) }
struct SecondaryButtonStyle: ButtonStyle       { init(size: ButtonSize = .regular, fullWidth: Bool = false) }
struct NeutralButtonStyle: ButtonStyle         { init(size: ButtonSize = .regular, fullWidth: Bool = false) }
struct DestructiveSoftButtonStyle: ButtonStyle { init(size: ButtonSize = .regular, fullWidth: Bool = false) }
struct InvertedButtonStyle: ButtonStyle        { init(size: ButtonSize = .regular, fullWidth: Bool = false) }   // on the ticket
struct QuietButtonStyle: ButtonStyle           { init(color: Color = Theme.Colors.text2) }
struct IconCircleButtonStyle: ButtonStyle {
    enum Kind { case neutral, beet, beetSoft }
    init(_ kind: Kind = .neutral, diameter: CGFloat = 44)
}
```

| Kind | Background → pressed | Label |
|---|---|---|
| primary | `beet` → `beetPressed` | `onBeet` |
| secondary | `beetSoft` → `beetSoft` @ 80% | `beetStrong` |
| neutral | `fill` → `fillStrong` | `ink` |
| destructiveSoft | `todaySoft` → `todaySoft` @ 80% | `todayText` |
| inverted | `ticketButton` → `ticketButton` @ 90% | `onTicketButton` |
| disabled (any kind) | `fill` | `text3` |

Reference body. Environment values are read inside a View, not in the ButtonStyle:

```swift
struct CapsuleButtonStyle: ButtonStyle {
    var kind: Kind = .primary
    var size: ButtonSize = .regular
    var fullWidth = false
    init(_ kind: Kind = .primary, size: ButtonSize = .regular, fullWidth: Bool = false) {
        self.kind = kind; self.size = size; self.fullWidth = fullWidth
    }
    func makeBody(configuration: Configuration) -> some View {
        CapsuleButtonBody(configuration: configuration, kind: kind, size: size, fullWidth: fullWidth)
    }
}

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
            .foregroundStyle(isEnabled ? foreground : Theme.Colors.text3)
            .padding(.horizontal, size == .regular ? 20 : 16)
            .padding(.vertical, 8)
            .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: size == .regular ? Theme.Metrics.button : Theme.Metrics.buttonCompact)
            .background(isEnabled ? (configuration.isPressed ? pressed : background) : Theme.Colors.fill, in: Capsule())
            .contentShape(Capsule())
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }
    private var background: Color { /* table above */ }
    private var pressed: Color { /* table above */ }
    private var foreground: Color { /* table above */ }
}
```

Each named style's `makeBody` returns `CapsuleButtonBody(configuration:kind:size:fullWidth:)` with its kind.

- **`QuietButtonStyle`:** `detailStrong` in `color`, `.frame(minWidth: 44, minHeight: 44)`, `.contentShape(Rectangle())`, opacity 0.6 when pressed.
- **`IconCircleButtonStyle`:** a circle of `diameter` (minimum 44).
  - `.neutral` is a `fill` circle with an `ink` glyph; `.beet` is `beet` with `onBeet`; `.beetSoft` is `beetSoft` with `beetStrong`.
  - Glyph is `.body.weight(.bold)`. When disabled, the fill is `fillStrong` and the glyph `text3`.
  - Call sites must add `.accessibilityLabel`.
- Labels use `Label(title, systemImage:)`. The styles do not force a label style.

**`InlineConfirmButton`** replaces the success alerts.

```swift
struct InlineConfirmButton: View {
    init(_ title: String, systemImage: String, kind: CapsuleButtonStyle.Kind = .secondary,
         size: ButtonSize = .regular, fullWidth: Bool = false,
         action: @escaping () -> String?)   // return the confirmation ("Added 2", "On your list") or nil
}
```

- On tap it runs `action`. If the result is non-nil, then:
  - the label becomes `Label(result, systemImage: "checkmark")` using `.contentTransition(.symbolEffect(.replace))` and a text crossfade,
  - `.sensoryFeedback(.success, trigger:)` fires,
  - `AccessibilityNotification.Announcement(result).post()` is posted,
  - after 2 s (`.task(id: confirmation)` with `try? await Task.sleep(for: .seconds(2))`) it reverts to the original label.
- It is disabled while the confirmation is showing.

**Ban:** `.borderedProminent` and `.bordered` must not appear anywhere (see the review checklist in §15).

### 7.6 Chips

```swift
struct Chip: View {
    init(_ title: String, systemImage: String? = nil, count: Int? = nil,
         isSelected: Bool, accessibilityLabel: String? = nil, action: @escaping () -> Void)
}
struct ChipOption<Value: Hashable>: Identifiable {
    let value: Value; let title: String; var systemImage: String? = nil; var count: Int? = nil; var accessibilityLabel: String? = nil
    var id: Value { value }
    init(_ value: Value, _ title: String, systemImage: String? = nil, count: Int? = nil, accessibilityLabel: String? = nil)
}
struct ChipPicker<Value: Hashable>: View {
    init(_ label: String, selection: Binding<Value>, options: [ChipOption<Value>], contentInset: CGFloat = Theme.Space.gutter)
}
```

- **`Chip`:** a capsule with visual height about 36 (padding 14×8), plus an extra 4pt vertical padding outside so the hit area is 44.
  - Content: `HStack(spacing: 6)` of the symbol, the title, and the count in `Theme.Fonts.tag`.
  - Selected: `beet` fill, `onBeet` text, bold. Unselected: `fill` fill, `ink` text, semibold.
  - `.buttonStyle(.plain)`, `.accessibilityAddTraits(isSelected ? .isSelected : [])`.
- **`ChipPicker`:** `ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 8) { chips } .padding(.horizontal, contentInset) }`.
  - `.scrollBounceBehavior(.basedOnSize, axes: .horizontal)`.
  - Selecting a chip runs `withAnimation(Theme.Motion.snappy)`.
  - `.sensoryFeedback(.selection, trigger: selection)`.
  - `.accessibilityElement(children: .contain)` with `.accessibilityLabel(label)`.
  - Inside a List row, use `.listRowInsets(EdgeInsets())` and `.listRowBackground(Color.clear)`.
- **One-line revert:** any `ChipPicker` can be swapped back to `Picker(label, selection:) { … }.pickerStyle(.segmented)` if it misbehaves.

### 7.7 Containers and structure

```swift
extension View {
    func surfaceCard(padding: CGFloat = Theme.Space.cardPadding, radius: CGFloat = Theme.Radius.card) -> some View
    func crateBlock(_ category: FoodCategory, radius: CGFloat = Theme.Radius.hero) -> some View
    func listChrome() -> some View
    func sheetChrome() -> some View
    func actionBar<Content: View>(@ViewBuilder _ content: () -> Content) -> some View
}
```

- **`surfaceCard`:** `.padding(padding).background(Theme.Colors.surface, in: RoundedRectangle(cornerRadius: radius, style: .continuous))`. Under Increase Contrast it adds an overlay `strokeBorder(Theme.Colors.separator, lineWidth: 1)`. No shadow.
- **`crateBlock`:** `.background(category.palette.fill, in: RoundedRectangle(cornerRadius: radius, style: .continuous))`, `.foregroundStyle(category.palette.onFill)`, and `.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`. Padding is the caller's job.
- **`listChrome`:** `.scrollContentBackground(.hidden).background(Theme.Colors.canvas).listSectionSpacing(.compact)`.
- **`sheetChrome`:** `.presentationDragIndicator(.visible).presentationCornerRadius(Theme.Radius.deck).presentationBackground(Theme.Colors.canvas)`.
- **`actionBar`:** `.safeAreaInset(edge: .bottom, spacing: 0) { VStack(spacing: 8) { content() }.padding(.horizontal, 16).padding(.top, 10).padding(.bottom, 8).frame(maxWidth: .infinity).background(.bar).overlay(alignment: .top) { Rectangle().fill(Theme.Colors.separator).frame(height: 0.5) } }`.

**`SectionHeader`:**

```swift
struct SectionHeader: View {
    init(_ title: String, count: Int? = nil, systemImage: String? = nil, symbolColor: Color = Theme.Colors.text2,
         tile: FoodCategory? = nil, actionTitle: String? = nil, action: (() -> Void)? = nil)
}
```

- Layout: `HStack(alignment: .firstTextBaseline, spacing: 8)` of:
  - either a glyph (`.headline`, `symbolColor`) or a soft `CategoryTile(tile, size: .small)`,
  - the title in `Theme.Fonts.section` `ink` with `.accessibilityAddTraits(.isHeader)`,
  - the count in `Theme.Fonts.tag` `text2`,
  - `Spacer()`,
  - an optional action button (`QuietButtonStyle(color: Theme.Colors.beetText)`, 44pt).
- Always `.textCase(nil)`. Padding top 8, bottom 4.
- Wrapped in `ViewThatFits`, so the action drops to its own line when space runs out.
- Inside a List: `Section { … } header: { SectionHeader(…) }`.
- Fallback if list header insets misbehave: `Section { … } header: { Text(title) }.headerProminence(.increased)`.

**`SheetLede`:** `HStack(spacing: 12)` of a 44pt `beetSoft` rounded tile (r12) with the glyph in `beetText`, and `text` in `detail` `text2`. It is the first content row of a sheet and never repeats the nav title.

```swift
struct SheetLede: View { init(systemImage: String, text: String) }
```

**`EmptyStateView`:**

```swift
struct EmptyAction: Identifiable {
    let id = UUID()
    let title: String                 // button label
    var systemImage: String? = nil
    var step: String? = nil           // non-nil → numbered to-do row ("Scan your last grocery receipt")
    let action: () -> Void
}
struct EmptyStateView: View {
    init(tiles: [FoodCategory], title: String, message: String, actions: [EmptyAction] = [])
}
```

- **Left-aligned.** `VStack(alignment: .leading, spacing: 16)` with padding 24:
  - `TileFan(tiles)`
  - title in `titleHeavy`
  - message in `body` `text2`
  - actions
- **Actions:**
  - If any action has a `step`, the actions render as numbered rows. Each row is `HStack(alignment: .center, spacing: 12)`: the number in `numberLarge` `beetText` (min width 24), the step text in `body`, a `Spacer`, then a compact button. The first button is `PrimaryButtonStyle(size: .compact)`, the rest `SecondaryButtonStyle(size: .compact)`. Rows are separated by 0.5pt separators. At AX sizes the button moves under the text.
  - Otherwise the first action is a full-width primary and the second a full-width secondary.
- `ContentUnavailableView.search(text:)` stays for search misses.

**`ActionTile`:** a surface tile (r14, min height 76, padding 12) with a `.title3` glyph in `beetText` above a `caption` label in `ink`, left-aligned, as a plain button.

```swift
struct ActionTile: View { init(_ title: String, systemImage: String, action: @escaping () -> Void) }
```

**`Sticker`:** a capsule with `surface` fill, padding 12×7, and `HStack(spacing: 6)` content: a `ToneDot` or glyph (in `symbolColor`), then text in `Theme.Fonts.tag` `ink`. It has the sticker lift and `.rotationEffect(rotation)`. Rotation is forced to 0 at AX sizes.

```swift
struct Sticker: View {
    init(_ text: String, tone: FreshTone? = nil, systemImage: String? = nil,
         symbolColor: Color = Theme.Colors.text2, rotation: Angle = .zero)
}
```

**`TimeSticker`:** a `surface` circle, 64pt (`@ScaledMetric`, capped at 88), with the sticker lift, rotated.

- Contents: `VStack(spacing: -2)` of the minutes in `numberLarge` `ink` and "min" in `tag` `text2`, with `.minimumScaleFactor(0.7)`.
- Accessibility label: "35 minutes".
- It renders nothing when `minutes <= 0`.

```swift
struct TimeSticker: View { init(minutes: Int, rotation: Angle = .degrees(6)) }
```

**`TicketCard`:** the order ticket for tonight's dinner.

```swift
struct TicketCard<Top: View, Bottom: View>: View {
    init(@ViewBuilder top: () -> Top, @ViewBuilder bottom: () -> Bottom)
}
struct TicketHalf: Shape {
    enum NotchedEdge { case top, bottom }
    var notchedEdge: NotchedEdge
    var cornerRadius: CGFloat = Theme.Radius.hero
    var notchRadius: CGFloat = 10
}
```

Structure:

```swift
VStack(spacing: 0) {
    top.padding(Theme.Space.heroPadding).frame(maxWidth: .infinity, alignment: .leading)
        .background(TicketHalf(notchedEdge: .bottom).fill(Theme.Colors.beet).padding(.bottom, -1)) // 1pt overlap hides any seam
    bottom.padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 20).frame(maxWidth: .infinity, alignment: .leading)
        .background(TicketHalf(notchedEdge: .top).fill(Theme.Colors.beet))
        .overlay(alignment: .top) {
            DashedRule().stroke(Theme.Colors.onBeet.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [5, 5]))
                .frame(height: 1.5).padding(.horizontal, 18)
        }
}
.foregroundStyle(Theme.Colors.onBeet)
```

`DashedRule` is a `Shape` whose path is a single horizontal line through `midY`.

`TicketHalf.path(in:)` goes clockwise. Convex corners (radius `c = min(cornerRadius, h/2, w/2)`) and concave notches (radius `n = min(notchRadius, h/2)`) are cubic curves with `k = 0.5523`. There is no `addArc`, so there is no clockwise ambiguity. Concave corners sit on the `notchedEdge`.

| Corner | Convex: start → end (control 1, control 2) | Concave notch: start → end (control 1, control 2) |
|---|---|---|
| top-left | (minX, minY+c) → (minX+c, minY) (minX, minY+c−kc), (minX+c−kc, minY) | (minX, minY+n) → (minX+n, minY) (minX+kn, minY+n), (minX+n, minY+kn) |
| top-right | (maxX−c, minY) → (maxX, minY+c) (maxX−c+kc, minY), (maxX, minY+c−kc) | (maxX−n, minY) → (maxX, minY+n) (maxX−n, minY+kn), (maxX−kn, minY+n) |
| bottom-right | (maxX, maxY−c) → (maxX−c, maxY) (maxX, maxY−c+kc), (maxX−c+kc, maxY) | (maxX, maxY−n) → (maxX−n, maxY) (maxX−kn, maxY−n), (maxX−n, maxY−kn) |
| bottom-left | (minX+c, maxY) → (minX, maxY−c) (minX+c−kc, maxY), (minX, maxY−c+kc) | (minX+n, maxY) → (minX, maxY−n) (minX+n, maxY−kn), (minX+kn, maxY−n) |

Move to the top-left start point, then join the corners with `addLine`, and close.

**Fallback:** `RoundedRectangle(cornerRadius: 28).fill(beet)` behind the whole VStack, plus the dashed rule, with no notches.

**`CheckToggle`:** include/check circle.

```swift
struct CheckToggle: View { init(isOn: Binding<Bool>, accessibilityLabel: String, tint: Color = Theme.Colors.beet) }
```

- `Image(systemName: isOn ? "checkmark.circle.fill" : "circle")` at `.title2`. The glyph is `tint` when on and `text3` when off.
- `.contentTransition(.symbolEffect(.replace))`, framed at 44×44 with `.contentShape(Rectangle())`.
- `.sensoryFeedback(.selection, trigger: isOn)`.
- `.accessibilityLabel(accessibilityLabel)`, `.accessibilityAddTraits(.isToggle)`, `.accessibilityValue(isOn ? "On" : "Off")`.
- Existing labels stay: "Add Chicken breast" / "Don't add Chicken breast".

**`ServingsStepper`:**

```swift
struct ServingsStepper: View { init(value: Binding<Int>, range: ClosedRange<Int>, unit: String = "servings") }
```

- `HStack(spacing: 16)` of a minus button (`IconCircleButtonStyle(.neutral)`), then `VStack { Text("\(value)").font(displayNumber); Text(unit).font(detail) text2 }`, then a plus button.
- The value uses `.contentTransition(.numericText(value: Double(value)))`.
- `.sensoryFeedback(.increase / .decrease, trigger: value)`, chosen by comparing old and new values.
- The whole control is `.accessibilityElement(children: .ignore)` with the label "Servings", the value "\(value)", and `.accessibilityAdjustableAction`.

**`SettingsIconTile`:** 29pt, r7, `beetSoft` fill, glyph `.footnote.weight(.semibold)` in `beetText`, `.accessibilityHidden(true)`.

```swift
struct SettingsIconTile: View { init(systemImage: String) }
```

### 7.8 Motion

```swift
extension Theme {
    enum Motion {
        static let snappy = Animation.snappy(duration: 0.28)          // toggles, chips, check marks
        static let smooth = Animation.smooth(duration: 0.4)           // layout, strip, picks reflow
        static let bouncy = Animation.bouncy(duration: 0.45, extraBounce: 0.1) // stickers, stamps, confirmations
        static func adaptive(_ a: Animation, reduceMotion: Bool) -> Animation { reduceMotion ? .easeInOut(duration: 0.2) : a }
    }
}
extension View {
    /// `.animation(_:value:)` that switches to a 0.2 s ease under Reduce Motion (reads the environment inside a ViewModifier).
    func motionAnimation<V: Equatable>(_ animation: Animation, value: V) -> some View
    func hapticSelection<T: Equatable>(trigger: T) -> some View        // .sensoryFeedback(.selection, trigger:)
    func hapticSuccess<T: Equatable>(trigger: T) -> some View          // .sensoryFeedback(.success, trigger:)
    func hapticImpact<T: Equatable>(_ weight: SensoryFeedback.Weight = .light, trigger: T) -> some View
}
extension AnyTransition {
    /// Returns `.opacity` when reduceMotion is true.
    static func reducible(_ t: AnyTransition, reduceMotion: Bool) -> AnyTransition
}
```

Views that run `withAnimation` read `@Environment(\.accessibilityReduceMotion)` and use `Theme.Motion.adaptive(_:reduceMotion:)`.

### 7.9 Migration shims (DS keeps them until every screen is migrated)

- `struct ExpiryBadge: View { init(status: ExpiryStatus) }` wraps `FreshnessTag(status: status)`. It is deprecated with `@available(*, deprecated, message: "Use FreshnessTag")`.
- `CoverageBadge(match:)` keeps its name and signature and gets the new look.
- `Shared/Components.swift` keeps `KitchenPreferences`, `Double.editableString` and `String.doubleValue`. Only the two badge structs move.

---

## 8. Screens

Common to every screen:

- `canvas` background, 16pt gutters.
- Root tabs use the system large title (`.navigationTitle`, default display mode). Detail screens and sheets use inline titles.
- Every sheet root is a `NavigationStack` with `.sheetChrome()`, and it keeps its existing Cancel/Done placements.
- Sheets whose whole purpose is one commit put that commit in `.actionBar { }`, and the toolbar keeps only Cancel.
- Copy tone is in §9. Motion and haptics are in §10. Accessibility is in §11.

### 8.1 Tab bar and app shell (Shell)

- `AppRouter` gains:
  - `enum AppTab: Hashable { case tonight, fridge, recipes, plan, shopping }`, defined at file scope in `AppRouter.swift`.
  - `@Published var tab: AppTab = .tonight`.
- RootView:
  - Uses `TabView(selection: $router.tab)` with `.tag(AppTab.x)` and deletes its private `Tab` enum.
  - `checkInRequested` still switches to `.fridge`.
  - Keeps `.tabItem` (it does **not** migrate to the iOS 18 `Tab` API). Symbols are listed in §5.6.
  - Applies `.tint(Theme.Colors.beetText)`.
  - The Fridge tab gets `.badge(nowCount)`, where `nowCount` is the number of pantry items whose status is `.expiringSoon(0 or 1)`, computed with the soon threshold. `badge(0)` hides the badge. This is the "use this tonight" signal visible from every tab.
- The system tab bar background stays as it is.
- Update `AccentColor.colorset` (DS) and `AppIcon.png` (Shell; §12).

### 8.2 Tonight (Tonight)

Switch `List` to `ScrollViewReader { ScrollView { LazyVStack(alignment: .leading, spacing: Theme.Space.stack) { … }.padding(.horizontal, 16).padding(.bottom, 24) } }` with `.background(Theme.Colors.canvas)`. Keep the existing `.navigationDestination`, sheets and state. Add `@Namespace private var zoom`.

Top to bottom:

1. **Toolbar (trailing): Chef capsule.**
   - `Button { chefPrompt = ChefPrompt(text: nil) } label: { Label("Chef", systemImage: "sparkles").font(Theme.Fonts.buttonCompact).padding(.horizontal, 12).padding(.vertical, 6).background(Theme.Colors.beetSoft, in: Capsule()).foregroundStyle(Theme.Colors.beetStrong) }`.
   - Accessibility label "Ask the chef".
   - Fallback: an icon-only `sparkles` button.
2. **Date line** (id `"top"`):
   - `Text(.now, format: .dateTime.weekday(.wide).month(.wide).day())` in `detailStrong` `text2`.
   - When there is urgent food, append `Text(" · " + counts.headline)`. Use `todayText` when `byTomorrow > 0`, otherwise `soonText`.
   - `counts` is `FreshnessCounts` over the pantry.
3. **Ticket** (if `tonightEntry` exists). Built with `TicketCard`.
   - Top:
     - Eyebrow "ON FOR TONIGHT · SERVES 4" in `onBeet2`.
     - Title in `heroTitle` `onBeet`, with no line limit.
     - Meta line in `detail` `onBeet2`: "35 min · uses chicken, celery". The rescue names come from `Rescue.items` for the recipe (at most 2 names). Omit the part if there are none.
   - Bottom: `ViewThatFits` over:
     - `HStack { Button("I cooked it", systemImage: "frying.pan.fill").buttonStyle(InvertedButtonStyle()); Button("Recipe").buttonStyle(QuietButtonStyle(color: Theme.Colors.onBeet)); Spacer(); Button("Change", systemImage: "arrow.triangle.2.circlepath").buttonStyle(QuietButtonStyle(color: Theme.Colors.onBeet2)) }`
     - a `VStack` in which the inverted button is full width and the two quiet buttons sit in an HStack underneath.
   - Actions are unchanged: open `CookedSheet`, push the recipe, delete the entry.
   - Accessibility: "Change" gets the label "Change tonight's dinner".
4. **Use soon.**
   - Header: `SectionHeader("Use soon", count: urgent.count, systemImage: "timer", symbolColor: Theme.Colors.todayText, actionTitle: "Fridge") { AppRouter.shared.tab = .fridge }`.
   - Strip: `ScrollView(.horizontal) { LazyHStack(spacing: 8) { FoodChip… } .scrollTargetLayout() }.scrollTargetBehavior(.viewAligned).contentMargins(.horizontal, 16).scrollClipDisabled()`. Use padding −16 on the ScrollView so the strip runs edge to edge.
   - Order: `.expiringSoon` items by days ascending, then `.expired` items last.
   - At most 10 chips. After that, a "+N more" chip (`Chip("+\(n) more", isSelected: false)`) sets `AppRouter.shared.tab = .fridge`.
   - Tapping a chip opens `PantryItemEditor(draft: .init(item: item), item: item)` as a sheet. Hint: "Edit".
   - `.contextMenu`:
     - "Used up" (`basket`): adds the item to Shopping and deletes it, as the Fridge swipe does.
     - "Ask the chef about this" (`sparkles`): opens the Chef with "What can I make tonight with the \(name) before it goes bad?".
     - "Edit".
   - `.scrollTransition(.interactive, axis: .horizontal) { c, p in c.scaleEffect(p.isIdentity ? 1 : 0.94).opacity(p.isIdentity ? 1 : 0.75) }`. Omit it under Reduce Motion.
   - **Calm state** (no urgent items, but some dated items): one row instead of the strip: `Label { Text("Nothing on the clock. Next up: \(name) in \(shortLabel.lowercased()).") } icon: { Image(systemName: "leaf.fill").foregroundStyle(Theme.Colors.fresh) }` in `detail` `text2`. If there are no dated items at all, hide the section.
5. **Picks header.** `SectionHeader(tonightEntry == nil ? "Tonight's picks" : "Other ideas")`, followed by `ChipPicker("Time", selection: $maxMinutes, options:)`:
   - `[ChipOption(0, "Any time", systemImage: "timer"), ChipOption(30, "≤ 30 min", accessibilityLabel: "Up to 30 minutes"), ChipOption(45, "≤ 45 min", accessibilityLabel: "Up to 45 minutes")]`.
6. **Picks.** Pick 1 is the **hero** (below). Picks 2–3 are **compact**. When a dinner is already chosen, all three are compact.
   - Identity: `ForEach(picks, id: \.recipeIndex)`.
   - The container uses `motionAnimation(Theme.Motion.smooth, value: picks.map(\.recipeIndex))`.
7. **Empty states.** `EmptyStateView` replaces the picks block, with the copy unchanged:
   - No recipes: tiles `[.grains, .dairy, .produce]`, "No recipes yet", action "Add sample recipes".
   - Empty fridge: tiles `[.produce, .dairy, .seafood]`, "Your fridge is empty", "Scan your last grocery receipt so Tonight knows what you have.", action "Scan a receipt".
   - Nothing fits: tiles `[.produce, .meat, .other]`, "Nothing fits tonight", with the existing reason text. Actions: "Show skipped recipes" (if any), then "Ask the chef".
8. **Ask-the-chef card.** A button styled as `surfaceCard`:
   - Content: `HStack(spacing: 12)` of a 44pt `beetSoft` circle with `sparkles` in `beetText`, then `VStack(alignment: .leading) { Text("Nothing grabbing you?").font(tileTitle); Text("Ask the chef for something new with what's expiring.").font(detail) text2 }`, a `Spacer`, and a `chevron.right` in `text3`.
   - It uses the existing prompt.
   - Below it, the existing explanation footer in `footnote` `text3`, left-aligned.

**Hero pick card** (pick #1):

```
┌──────────────────────────────────────────────┐ r28, clipped, no shadow
│ CRATE BLOCK .crateBlock(heroCategory), pad 20│
│ TOP PICK                          ╭────╮      │ eyebrow (onFill) · TimeSticker (top-trailing, +6°)
│ Beef and Broccoli Stir Fry        │ 35 │      │ heroTitle, onFill, no line limit
│                                   ╰min─╯      │
│ (● Broccoli · Today) (● Garlic · 2 days)      │ Stickers: −2°, +1.5°, −1°
├──────────────────────────────────────────────┤
│ SURFACE, pad 20, spacing 12                   │
│ 🍃 Uses broccoli before it goes bad            │ Label(reason), glyph fresh, text text2 (detail)
│ ▮▮▮▮▮▯▯ 5/7 · need bay leaves, thyme      ♥   │ CoverageBadge + missing (detail text2, 2 lines) + heart.fill beetText
│ [ Cook this ][ Add 2 to list ]   Not tonight  │ action row
└──────────────────────────────────────────────┘
```

- `heroCategory` = the `foodCategory` of the pantry item named by `pick.rescues.first`. Fall back to `recipe.leadCategory(staples:)`.
- **Block content:** `HStack(alignment: .top) { VStack(alignment: .leading, spacing: 8) { Text("Top pick").eyebrowStyle(); Text(title).font(heroTitle) }; Spacer(minLength: 12); TimeSticker(minutes: recipe.totalMinutes) }`, followed by the stickers row.
- **Stickers:** `Sticker("\(name) · \(status.shortLabel)", tone: .today/.soon)` for up to 3 rescues. More than 3 adds `Sticker("+\(n)")`. Layout: `ViewThatFits(in: .horizontal) { HStack(spacing: 6) { all }; HStack(spacing: 6) { first; "+n" } }`.
- The whole block is `.matchedTransitionSource(id: recipe.persistentModelID, in: zoom)`. Tapping it pushes the detail.
- At AX sizes the TimeSticker moves into the meta row as `Theme.numberText("35", unit: "min")`, without rotation.
- **Actions** use a three-step `ViewThatFits(in: .horizontal)`:
  - A: `HStack(spacing: 10) { Primary "Cook this" (fork.knife) flex; InlineConfirmButton("Add \(n) to list", systemImage: "basket") if missing; Spacer(minLength: 0); Quiet "Not tonight" }`.
  - B: `VStack(alignment: .leading, spacing: 8) { HStack { Primary flex; InlineConfirm }; Quiet trailing }`.
  - C: every button full width, stacked.
  - Also `if dynamicTypeSize.isAccessibilitySize { C } else { ViewThatFits { A; B; C } }`.
  - `InlineConfirmButton` returns "Added \(count)" or "On your list", which replaces the old alert.
- **VoiceOver:** the card is `.accessibilityElement(children: .contain)`. The title is a header labeled "Top pick: \(title)". Stickers read "Uses broccoli, expires today". The buttons are labeled "Cook \(title) tonight", "Add \(n) missing ingredients to shopping list", and "Not tonight, hide \(title) for today".

**Compact pick card** (picks 2–3):

- `surfaceCard()`: `HStack(alignment: .top, spacing: 12) { CategoryTile(heroCategory, size: .large, style: .crate).matchedTransitionSource(…); VStack(alignment: .leading, spacing: 6) { title (cardTitle) + heart; reason (detail text2, 2 lines, leaf glyph in fresh when it rescues); HStack { Theme.numberText("\(min)", unit: "min"); CoverageBadge } ; missing line (footnote text2) } }`.
- Then the same action `ViewThatFits`, using `size: .compact` buttons.
- VoiceOver announces "Option 2 of 3", but the rank is not drawn.

The destination is `.navigationDestination(for: PersistentIdentifier.self) { id in RecipeDetailView(recipe:).navigationTransition(.zoom(sourceID: id, in: zoom)) }`. The fallback is to delete both zoom modifiers.

### 8.3 Fridge (Fridge)

`List` inside `ScrollViewReader`, with `.listChrome()`, `.searchable(text:prompt: "Search items")`, and the large title "Fridge".

- **Toolbar:**
  - Leading: `gearshape` (Settings, labeled).
  - Trailing: the **Add menu**. Its label is `Image(systemName: "plus").font(.body.weight(.bold)).foregroundStyle(Theme.Colors.onBeet).frame(width: 32, height: 32).background(Theme.Colors.beet, in: Circle()).frame(minWidth: 44, minHeight: 44)`, labeled "Add". Fallback: a plain `plus`.
  - Menu order: Scan receipt, Photo of groceries, Scan barcode (if supported), Add by hand (`square.and.pencil`), divider, Check what's still here.

Rows and sections from the top:

1. **FreshnessStrip** (clear row, zero insets, horizontal padding 16). Arguments: `counts` over the current location filter, `filter: $toneFilter`, and `onHeadlineTap: { proxy.scrollTo("useSoon", anchor: .top) }`.
2. **Location chips:** `ChipPicker("Location", selection: $filter, options:)` with `[ChipOption(nil, "All", count: total), ChipOption(.fridge, "Fridge", systemImage: StorageLocation.fridge.glyph, count: n), …]`. Clear row, zero insets.
3. **Check-in entry card**, when `checkInDue && checkInCount > 0`. A `surfaceCard` button:
   - `HStack(spacing: 12) { TileFan(first 3 queued items' categories, size: .small); VStack(alignment: .leading) { Text("Weekly check-in").font(tileTitle); Text("\(n) items · about 2 minutes").font(detail) text2 }; Spacer; Text("Start") styled as compact primary }`.
   - It sets `AppRouter.shared.checkInRequested = true`.
   - Accessibility label: "Weekly check-in, 10 items, about 2 minutes".
4. **Tone filter active:**
   - A clear row with `Chip("Showing: \(tone.legendLabel)", systemImage: "xmark", isSelected: true) { toneFilter = nil }`.
   - One section, `SectionHeader(tone.legendLabel.capitalized, count:)`, listing the matching items with detail "qty · location". All other sections are hidden.
5. **Use soon** (id `"useSoon"`).
   - `SectionHeader("Use soon", count:, systemImage: "timer", symbolColor: Theme.Colors.todayText)`.
   - Rows are the `.expiringSoon` items, fewest days first.
   - Detail is "qty · Location title".
6. **Past date.**
   - `SectionHeader("Past date", count:, systemImage: "exclamationmark.triangle", symbolColor: Theme.Colors.past, actionTitle: "Check them") { AppRouter.shared.checkInRequested = true }`.
   - Rows are the `.expired` items, most recent first.
   - Footer (`footnote` `text3`): "Check these before using. The weekly check-in can clear them out."
7. **Fridge / Freezer / Pantry.** `SectionHeader(location.title, count:, systemImage: location.glyph)`. Rows are the non-urgent items sorted by urgency, with detail "qty · Category title". Freezer rows show the frost "frozen" tags.
8. **Stock up.** `SectionHeader("Stock up")` plus a grid of `ActionTile`s: Receipt, Barcode (if supported), Photo, Type it. Layout: `ViewThatFits { 4 across ; 2×2 Grid }`. When the pantry has fewer than 5 items, this block moves directly under the strip.

**Rows:**

- Built as `Button { editingItem = item } label: { FoodRow(name:, detail:, category: item.foodCategory, status:, location: item.location) }`.
- Swipe leading: **Used up** (`basket.fill`, `.tint(Theme.Colors.fresh)`), same behavior as today.
- Swipe trailing: **Delete** (destructive).
- `.contextMenu`: Edit, Used up, Ask the chef about this. The last one opens `ChefView(initialPrompt: "What can I make with the \(name)?", showsDone: true)` as a sheet.

**Empty** (no items at all): `EmptyStateView(tiles: [.produce, .dairy, .seafood], title: "Your fridge is empty", message: "Fill it in one go from your last grocery receipt, or add things as you unpack.", actions:)` with numbered steps:

1. "Scan your last grocery receipt" → Scan
2. "Or snap a photo of your groceries" → Photo
3. "Or add items one at a time" → Add

A search with no results keeps `ContentUnavailableView.search(text:)`.

### 8.4 Item editor (Fridge: `PantryItemEditor`)

`Form` with `.scrollContentBackground(.hidden)`, `canvas`, `.sheetChrome()`, the inline title "Add item" / "Edit item", and Cancel / **Save** (bold). The fields and save logic are unchanged.

1. **Header row** (clear background):
   - `HStack(spacing: 12) { CategoryTile(category, size: .large, style: .crate); TextField("Name", text:).font(Theme.Fonts.titleHeavy) }`.
   - `category` is the chosen category or, if none is chosen, `FoodCategory.guess(category: "", name: draft.name)`. The tile animates with `Theme.Motion.snappy`.
2. **Amount:**
   - `HStack { TextField("Qty").font(Theme.Fonts.number).keyboardType(.decimalPad).frame(minWidth: 72); TextField("Unit") }`.
   - A row of unit chips: pcs, lb, oz, cups, bag, bunch, loaf, bottle. Tapping one sets `unit`.
3. **Stored in:**
   - Three equal location tiles in `HStack(spacing: 8)`. Each is min height 64 and r14, with the glyph (`.title3`) above the title (`detailStrong`).
   - Selected: `beet` fill, `onBeet` content. Unselected: `fill` fill, `ink` content.
   - Each tile gets the `.isSelected` trait, and selection fires `.hapticSelection`.
4. **Category:**
   - `LazyVGrid(columns: [GridItem(.adaptive(minimum: 76), spacing: 10)], spacing: 10)` of the 11 categories. Each option is a `VStack(spacing: 6) { CategoryTile(c, size: .row, style: selected ? .crate : .soft); Text(c.title).font(Theme.Fonts.caption).lineLimit(2) }`.
   - Selected: a 2.5pt `beet` ring around a radius-16 container, plus the `.isSelected` trait.
   - Selecting writes `c.rawValue` into `draft.category`.
   - An existing free-text value is preselected via `FoodCategory.guess`.
5. **Expires:**
   - `Toggle("Has an expiration date")`.
   - When on:
     - A row `HStack(spacing: 14) { FreshnessDial(status: live, location: draft.location, size: .small); VStack(alignment: .leading, spacing: 4) { FreshnessTag(status: live, location: draft.location); Text(draft.expiresAt, format: .dateTime.weekday(.wide).month().day()).font(detail) text2 } }`. It has an accessibility label combining both.
     - Quick chips: Tomorrow, 3 days, 1 week, 2 weeks, 1 month. These replace the "3d/1w" buttons.
     - A compact `DatePicker`.
   - `live = ExpiryStatus.of(expiresAt: draft.expiresAt, soonThresholdDays: soonDays)`.
6. **Notes:** a multiline field. If there is a barcode: `Label(code, systemImage: "barcode")` in `mono` `text2`.
7. **Delete item** (edit only): a destructive button in `todayText`, with the confirmation unchanged.

### 8.5 Receipt scan (Capture)

The phases are unchanged: capture → reading → review.

**Capture:**

- `SheetLede(systemImage: "doc.text.viewfinder", text: "Add a whole shop at once. Expiry dates are estimated from the day you shopped.")`.
- "Scan with camera" (`PrimaryButtonStyle(fullWidth: true)`, shown only if the document camera is supported). The `PhotosPicker` "Choose receipt photos" label uses `SecondaryButtonStyle(fullWidth: true)`.
- Three tips, each a row with a 28pt `fill` rounded tile and glyph:
  - "Lay it flat in good light" (`sun.max.fill`)
  - "Long receipt? Capture it top to bottom in pages" (`doc.on.doc.fill`)
  - "Photos are sent to Claude to read the items" (`sparkles`)
- Errors appear in a `surfaceCard` with a `todaySoft` background and `todayText` text, with a leading `exclamationmark.triangle.fill`.

**Reading:**

- Page thumbnails are stacked like receipts: r12, a 6pt white frame, rotations −3°, 2°, −1°, and `.accessibilityIgnoresInvertColors()`.
- A **scan band** runs over the top thumbnail: a 3pt `LinearGradient(colors: [beet.opacity(0), beet, beet.opacity(0)], startPoint: .leading, endPoint: .trailing)` offset from the top to the bottom with `.easeInOut(duration: 1.6).repeatForever(autoreverses: true)`.
- Beside it: "Reading 2 pages…" in `rowTitle`, with `doc.text.viewfinder` using `.symbolEffect(.variableColor.iterative, options: .repeating)`.
- Reduce Motion: no band, and a `ProgressView().tint(Theme.Colors.beet)` instead.

**Review:** List, `.listChrome()`.

1. **Summary card** (clear row, `surfaceCard`):
   - The store name in `section`.
   - A "Purchased" `DatePicker` (unchanged range).
   - `HStack(spacing: 24)` of two figures: `Text("\(n)").font(displayNumber)` with "items" in footnote, and the price total (sum of known prices, as currency) with "spent", shown only when known.
   - A mini `FreshnessStrip(counts: estimates, filter: .constant(nil), showsHeadline: false)`.
   - Footnote: "Expiry dates are estimated from the purchase date. Tap an item to change it."
2. **Sections per location:** `SectionHeader(location.title, count:, systemImage: location.glyph)`.
   - Rows: `HStack(spacing: 8) { CheckToggle(isOn: $item.include, accessibilityLabel: …); Button { edit } label: { FoodRow(name:, detail: "1 bag · $3.49", category: FoodCategory(category: item.category, name: item.name), status: estimatedStatus, location: item.location, estimated: item.manualExpiry == nil, isDimmed: !item.include, rawText: item.rawText) } }`.
   - **Add `var rawText: String = ""` to `ReviewItem`** and set it from `$0.raw_text` where `ReviewItem`s are built. Hide the line when it is empty.
3. **Shopping check-off card:** a `surfaceCard` with `HStack(spacing: 12) { 44pt beetSoft rounded tile (r12) with basket.fill in beetText; Toggle("Check off \(n) items on your shopping list", isOn:).tint(Theme.Colors.beet) }`, with the names listed below in `footnote` `text2`.
4. **Skipped lines:** `DisclosureGroup("Skipped \(n) non-food lines")` containing the lines in `mono` `text2`.
5. `Button("Scan a different receipt").buttonStyle(NeutralButtonStyle(fullWidth: true))`.
6. **Action bar:** `Button("Add \(includedCount) to Fridge", systemImage: "refrigerator.fill").buttonStyle(PrimaryButtonStyle(fullWidth: true))`. It is disabled at 0, and the count uses `.contentTransition(.numericText())`. The toolbar "Add N" button is removed; Cancel stays.
   - On success: `.hapticSuccess`, then dismiss.
   - Rows appear with `.transition(.reducible(.opacity.combined(with: .offset(y: 8)), reduceMotion:))`, staggered by 0.03 s × min(index, 12).

The receipt item editor sheet gets `.sheetChrome()`. It uses location tiles and quick chips as in §8.4, plus a footnote "Estimated: keeps about 7 days".

### 8.6 Photo scan (Capture)

- **Choice:**
  - `SheetLede(systemImage: "camera.viewfinder", text: "Snap a fridge shelf or a grocery bag.")`.
  - Two big tiles side by side (`surfaceCard`, min height 120, left-aligned):
    - `IconCircle(beetSoft)` with `camera.fill`, and "Take photo" in `tileTitle` (camera only).
    - A `PhotosPicker` with `photo.on.rectangle` and "Choose from library".
  - The existing explanation in `footnote` `text3`, including the copy about receipts and Claude.
- **Identifying:**
  - The chosen photo: r22, max height 280, `.scaledToFill().clipped()`, `.accessibilityIgnoresInvertColors()`.
  - The same scan band runs over it.
  - "Identifying groceries…" with `sparkles` using `.symbolEffect(.pulse)`.
- **Results:**
  - `SectionHeader("Found \(n) items")`.
  - Rows: `CheckToggle`, then `FoodRow(detail: "Fridge · keeps ~7 days", estimated: true, …)`.
  - Action bar: "Add \(n) to Fridge".

### 8.7 Barcode (Fridge)

- The DataScanner is unchanged. Add `.sheetChrome()`.
- Add a bottom overlay: a capsule on `.regularMaterial` with `barcode.viewfinder` and "Point at a barcode", in `detailStrong`, padded 16 from the safe area.
- The lookup result flow is unchanged.

### 8.8 Check-in (Check-in)

Sheet, `.sheetChrome()`, inline title "Weekly check-in".

- **Toolbar:** Close, and Finish once there are answers.
- **Dismiss guard:** `.interactiveDismissDisabled(!answers.isEmpty)`. Close shows a `confirmationDialog` ("Stop the check-in?" with "Save answers so far" / "Discard" / Cancel) when there are answers.

**Progress:**

- 20 items or fewer: `HStack(spacing: 3)` of 4pt-tall capsules, one per item. Answered segments are colored by answer: kept is `fresh`, used is `text2`, tossed is `today`. The current segment is `beet`, and the rest are `fillStrong`.
- More than 20: `ProgressView(value:).tint(Theme.Colors.beet)`.
- Trailing counter "3 of 10" in `tag`, with `.contentTransition(.numericText())`.

**Card** (content left-aligned): `VStack(alignment: .leading, spacing: 14)` with `.padding(24)`, `.frame(maxWidth: .infinity, minHeight: 300, alignment: .topLeading)` and `.crateBlock(item.foodCategory, radius: Theme.Radius.deck)`. Inside:

1. `Label(location.title, systemImage: location.glyph).eyebrowStyle()` in `onFill`.
2. The name in `display` `onFill`.
3. The quantity: `Theme.numberText(qty, unit: unit)` in `onFill`.
4. `HStack(alignment: .center, spacing: 16) { FreshnessDial(status:, location:, size: .large); VStack(alignment: .leading, spacing: 8) { Sticker(status.shortLabel, tone: tone); Text("Added 3 days ago").font(footnote) } }`, all in `onFill`. At AX sizes the dial goes above.
5. "Last confirmed 2 weeks ago" or "Never confirmed" in `footnote` `onFill`.

- **Deck peeks** sit behind the card: the next two items' crate fills, `.scaleEffect(0.95 / 0.90)`, `.offset(y: 10 / 20)`, `.accessibilityHidden(true)`. They are drawn in `.background` so they size with the card. Fallback: omit them.
- **Stamp:** when an answer is chosen, a stamp is overlaid on the card, top-trailing:
  - A capsule with `surface` fill, a 3pt border and `section` text: "STILL HERE" (`fresh`), "USED" (`ink`) or "TOSSED" (`todayText`).
  - It is rotated −8° and animates in (scale 1.3 → 1, opacity 0 → 1, `Theme.Motion.bouncy`).

**Answers** (unchanged behavior):

- Row 1: `Button("Still have it", systemImage: "checkmark")`, `PrimaryButtonStyle(fullWidth: true)`.
- Row 2: `HStack(spacing: 10)` of "Used it" (`fork.knife`, `NeutralButtonStyle(fullWidth: true)`) and "Tossed it" (`trash`, `DestructiveSoftButtonStyle(fullWidth: true)`).
- Row 3: `HStack` of Quiet "Undo" (`arrow.uturn.backward`, disabled at 0), `Spacer`, Quiet "Skip".

**Answer sequence** (guards against double taps):

1. Set `isAnswering = true`, which disables all answer buttons.
2. Set `stamp = answer` and `exitEdge` (kept → `.trailing`, used → `.top`, tossed → `.leading`).
3. Fire the haptic: kept `.selection`, used `.impact(weight: .light)`, tossed `.impact(weight: .medium)`.
4. Wait 150 ms (`try? await Task.sleep(for: .milliseconds(150))`).
5. Inside `withAnimation(Theme.Motion.adaptive(.snappy, reduceMotion:))`, record the answer and advance.
6. Set `isAnswering = false`.

The card has `.id(item.id)` and `.transition(.reducible(.asymmetric(insertion: .scale(scale: 0.95).combined(with: .opacity), removal: .move(edge: exitEdge).combined(with: .opacity)), reduceMotion:))`.

**VoiceOver:**

- On each new card, `AccessibilityNotification.Announcement("\(name), \(status.spokenLabel(inFreezer:))").post()`.
- The card has `.accessibilityAction(named: "Still have it")`, "Used it", "Tossed it" and "Undo".

**Optional swipe (ship buttons first):**

- Drag right for "Still have it", left for "Used it". Tossing is button-only, so waste is never logged by accident.
- Only horizontal drags count: `abs(dx) > abs(dy)`, threshold 120pt.
- While dragging, the card rotates `dx / 20` degrees (none under Reduce Motion) and the stamp fades in with distance.
- Crossing the threshold fires `.impact(weight: .light)` once.

**Summary:**

- `Text("Check-in done").font(titleHeavy)`, left-aligned.
- A `Grid` of three stat tiles (r22, padding 16). Each shows a `displayNumber` that counts up with `.numericText` and a `detailStrong` label:
  - Still here: `freshSoft` background, `fresh` number.
  - Used: `fill` background, `ink` number.
  - Tossed: `todaySoft` background, `todayText` number, plus "$3.49" when known.
- **Waste line:** "Last 30 days: 3 of 21 tossed · 14% · about $9" in `detail`, above a 6pt capsule split between `fresh` (used) and `today` (tossed).
- **Buy again?:** `SectionHeader("Buy again?")`. Rows are a soft tile, the name, and a Toggle (tinted beet). "Already on your list" rows are disabled and carry that footnote.
- Action bar: "Save check-in" (Primary). It fires `.hapticSuccess`.

**All caught up:** `EmptyStateView(tiles: [.produce], title: "All caught up", message: "Nothing in your kitchen needs checking right now.", actions: [Done])`.

### 8.9 Recipes list (Recipes)

`ScrollView { LazyVStack(alignment: .leading, spacing: 12) }`, gutters 16, `canvas`, `.searchable(text:prompt: "Search recipes or tags")`, the large title "Recipes", and `@Namespace zoom`.

- **Toolbar:** the same beet `+` Menu as Fridge, containing New recipe, Import with AI (`sparkles`), and Add sample recipes.
- **Mode chips:** `ChipPicker("Show", selection: $mode, options: [Can make, All, Favorites (heart.fill)])`.

**Can make mode:**

- **Ready to cook:** `SectionHeader("Ready to cook", count:, systemImage: "checkmark.circle.fill", symbolColor: Theme.Colors.fresh)`, then `LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible())], spacing: 12)`. The grid is one column at AX sizes.
  - **Grid tile:** `VStack(alignment: .leading, spacing: 8)` with `.padding(14)`, `.frame(maxWidth: .infinity, minHeight: 150, alignment: .topLeading)`, `.crateBlock(recipe.leadCategory(staples:), radius: Theme.Radius.card)`. Contents:
    - A top row with the glyph (`.title3.weight(.bold)`) and `heart.fill` if it is a favorite.
    - `Spacer(minLength: 12)`.
    - The title in `tileTitle`, up to 3 lines.
    - `Theme.numberText("25", unit: "min")`.
    - When `match.usesExpiringCount > 0`: `Sticker("Uses \(n) soon", systemImage: "alarm.fill", symbolColor: Theme.Colors.todayText)`.
  - The tile is `.matchedTransitionSource(id:in:)`. Accessibility label: "\(title), 25 minutes, ready to cook, uses 2 expiring".
- **Missing 1–2 items** and **Needs shopping:** a `SectionHeader` (`basket`, `text2`) and a `surfaceCard(padding: 0)` holding rows separated by hairlines. Each row is:
  - `HStack(spacing: 12) { CategoryTile(lead, size: .row); VStack(alignment: .leading, spacing: 3) { title (rowTitle, 2 lines) + heart; subtitle (detail text2, 1 line) }; Spacer; CoverageBadge(match:) }`, with padding 12×16 and min height 64.
  - The subtitle is "30 min · need bay leaves, thyme". When the recipe rescues food, prefix it with `Image(systemName: "alarm.fill")` in `todayText` and "uses spinach, milk · ". The names come from `Rescue.items`, up to 2; otherwise "uses 2 expiring".

**All** and **Favorites** modes: the same row card, alphabetical.

**Context menu** on tiles and rows:

- Cook tonight (`fork.knife`): inserts tonight's dinner entry, as Tonight does.
- Add to meal plan (`calendar.badge.plus`): `AddToPlanSheet`.
- Add missing to list (`basket`): only shown when something is missing.
- Favorite / Unfavorite.

**Empty:** `EmptyStateView(tiles: [.bakery, .meat, .produce], title: "No recipes yet", message: "Add your own, import one with AI, or start with 20 sample recipes.", actions: [Load sample recipes, New recipe])`.

### 8.10 Import with AI (Recipes: `RecipeImportView`)

- `.sheetChrome()` and `SheetLede(systemImage: "sparkles", text: "Paste a recipe from anywhere, or describe a dish.")`.
- A `TextEditor` inside a `surfaceCard` (r22, min height 200). When empty, a placeholder overlay in `body` `text3`: "Paste a recipe, or describe what you'd like to cook…".
- Example chips below. Tapping one fills the editor: "A quick weeknight curry with the chicken I have", "Grandma's banana bread".
- **Action bar:** `Button("Import", systemImage: "sparkles")` (Primary, full width), disabled when the editor is empty.
  - While working: `HStack { ProgressView(); Text("Reading recipe…") }` with `sparkles` using `.symbolEffect(.pulse)`.
- Errors appear in a `todaySoft` card with `todayText`.
- The toolbar keeps Cancel.

### 8.11 Recipe detail (Detail)

`ScrollView { VStack(alignment: .leading, spacing: 20) }`, gutters 16, `canvas`, `.navigationBarTitleDisplayMode(.inline)`.

- **Toolbar:** a heart (`heart` / `heart.fill` in `beetText`, `.symbolEffect(.bounce, value: isFavorite)`, `.hapticImpact`) and "Edit".

Content:

1. **Header block:** `VStack(alignment: .leading, spacing: 10)`, padding 20, `.crateBlock(recipe.leadCategory(staples:))`.
   - An eyebrow with the cuisine (or "Recipe").
   - The title in `display`.
   - A row of meta stickers (no rotation): `Sticker("18 min", systemImage: "clock")`, `Sticker("Serves 2", systemImage: "person.2.fill")`, and `Sticker(match.canMake ? "Ready" : "\(have)/\(total)", systemImage: match.canMake ? "checkmark.circle.fill" : "basket")`.
   - When zooming from a source, this block is where the zoom lands (the whole view has `.navigationTransition(.zoom)` set by the presenter).
2. **Headnote:** the summary in `Theme.Fonts.headnote`, `ink`. Tags follow in a horizontal `ScrollView` of `fill` capsules (`footnote.weight(.semibold)` `text2`, no "#").
3. **Ingredients:** `SectionHeader("Ingredients", count:)` with `CoverageBadge` as the trailing element, then a `surfaceCard(padding: 0)` of rows. Row layout is `HStack(alignment: .firstTextBaseline, spacing: 12)`:
   - Status glyph (`.title3`):
     - Have: `checkmark.circle.fill` in `fresh`.
     - Missing: `circle.dashed` in `text2`, plus the word "Missing" in `footnote` `todayText`.
     - Optional: `circle` in `text3` plus "(optional)".
     - Staple: `checkmark.circle` in `text2` plus "staple".
   - The name in `rowTitle` and the note in `detail` `text2`.
   - The quantity, trailing, in `number` `text2`.
   - If the matched pantry item is urgent (from `Rescue.items`), a `FreshnessTag(size: .small)` sits under the quantity.
   - **Tapping a missing row** adds that one item to Shopping. The row's trailing slot then shows a `checkmark` with "Added" for 2 s, with a success haptic and an announcement. Hint: "Adds to shopping list".
   - After the card: `InlineConfirmButton("Add \(n) missing to list", systemImage: "basket", kind: .secondary, fullWidth: true)`.
4. **Steps:** `SectionHeader("Steps", count:)`, then a `surfaceCard(padding: 0)` of rows. Each row is `HStack(alignment: .firstTextBaseline, spacing: 14)` of the number in `numberLarge` `beetText` (min width 28, `@ScaledMetric`) and the text in `body` with `.lineSpacing(3)`. Padding is 14×16, with hairlines between rows.
5. **History:** "Cooked 3 times · last on Sep 12" in `footnote` `text3` when `cookCount > 0`.
6. `Button("Delete recipe", role: .destructive)` with `QuietButtonStyle(color: Theme.Colors.todayText)`. The confirmation is unchanged.

**Action bar:** `HStack(spacing: 10)` of:

- `Button("I cooked this", systemImage: "frying.pan.fill")` with `PrimaryButtonStyle(fullWidth: true)`.
- `Button { showPlanner = true } label: { Image(systemName: "calendar.badge.plus") }` with `IconCircleButtonStyle(.beetSoft, diameter: 50)` and the label "Add to meal plan".

**AddToPlanSheet:**

- `.presentationDetents([.medium, .large])`, `.sheetChrome()`.
- A `DatePicker`, then `ChipPicker("Meal", selection: $slot, options: MealSlot.allCases…)`. The rest of the fields are unchanged.
- Confirm "Add" in the toolbar, with `.hapticSuccess` on insert.

### 8.12 Cooked: "Update your fridge" sheet (Detail: `CookedSheet`)

`.presentationDetents([.medium, .large])`, `.sheetChrome()`, inline title "Update your fridge". The toolbar keeps Cancel only.

1. `SheetLede(systemImage: "frying.pan.fill", text: recipe.title)`.
2. **Servings card** (`surfaceCard`):
   - "Made" in `rowTitle`, then `ServingsStepper(value: $servings, range: 1...48)`.
   - Footnote "The recipe serves \(n); amounts are scaled." when the value differs from the recipe.
3. **From your fridge:** `SectionHeader("From your fridge", count:)`, then rows:
   - `HStack(alignment: .top, spacing: 8) { CheckToggle(isOn:, accessibilityLabel: "Update \(name)"); CategoryTile(size: .row); VStack(alignment: .leading, spacing: 6) { name (rowTitle); changeLine } }`.
   - `changeLine` depends on the change:
     - **`.reduce`, a correction in pen:**
       - Content: `HStack(spacing: 6) { Text("4 cups").font(number).foregroundStyle(text2).strikethrough(true, color: Theme.Colors.beetText); Image(systemName: "arrow.right").foregroundStyle(text3); Text("2¼ cups").font(number).foregroundStyle(ink) }`.
       - Beneath it, a 64×6 capsule level bar: `fillStrong` track with a `fresh` fill at new/old.
       - Values use `.contentTransition(.numericText())` when servings change.
       - Accessibility: "4 cups, becomes 2¼ cups".
     - **`.remove`:** `Sticker("Used up", systemImage: "checkmark")` plus "had 2" in `detail` `text2`.
     - **`.unknown`:** "Recipe uses 1 tbsp · you have 2" in `detail` `text2`, then `ChipPicker("Anything left?", selection:, options: [Some left, Used it all], contentInset: 0)`.
   - Excluded rows: content in `text2`, and the change line replaced by "Unchanged".
4. Footer in `text3`: "Staples like salt and oil aren't tracked. Untick anything you didn't use."
5. `Toggle("Add used-up items to shopping list")`, tinted beet, shown only when something is removed.
6. If nothing matched, an explanatory `surfaceCard`.
7. **Action bar:** "Update fridge" (Primary, full width), or "Mark cooked" when nothing matched. It fires `.hapticSuccess`, then dismisses.

### 8.13 Recipe editor (Recipes: `RecipeEditor`)

`Form`, `canvas`, `.sheetChrome()`, with Cancel / **Save** (disabled while the title is empty). The logic is unchanged.

1. **Title:** `TextField("Recipe name")` in `titleHeavy`, with no row label. **Summary:** `TextField("A line about it", axis: .vertical)` in `headnote`.
2. **Numbers:**
   - Servings uses `ServingsStepper(range: 1...48)`.
   - Prep and Cook are minute fields in `number` with "min" suffixes (`.numberPad`).
   - A live "Total 35 min" in `detail` `text2`.
3. Cuisine. Tags (comma-separated), previewed below as `fill` capsules.
4. **Ingredients:**
   - Each row: `HStack { CategoryTile(FoodCategory.guess(category: "", name: name), size: .small); qty (number, 56pt); unit (64pt); name (flexible) }`. A second line holds the note field and an "Optional" `Chip`.
   - "Add ingredient" uses `plus.circle.fill` in `beetText`.
   - `onDelete` and `onMove` are unchanged.
5. **Steps:** the number in `numberLarge` `beetText`, then a vertical-axis `TextField`. "Add step" works the same way.

### 8.14 Plan (Plan+Shop: `MealPlanView`)

`List` inside `ScrollViewReader`, `.listChrome()`, title "Meal plan".

- **Toolbar:**
  - Leading: "Today", shown only when viewing another week.
  - Trailing: `Button { shopWeek } label: { Image(systemName: Theme.symbol("basket", fallback: "cart")) }`, labeled "Shop for week", disabled when the week is empty.

Rows:

1. **Week header** (clear row): `HStack` of a `chevron.left` icon button (44, labeled "Previous week"), a centered `VStack` ("Sep 21 – 27" in `tileTitle` with rounded digits, and "5 meals planned" in `footnote` `text2`), and a `chevron.right` icon button (labeled "Next week").
2. **Week strip** (clear row): 7 equal columns in `HStack(spacing: 6)`. Each column is a button, min 44 wide and 64 tall, r14, `surface` fill:
   - The weekday initial as an eyebrow in `text2`.
   - The day number in `weekNumber`.
   - Up to 3 6pt dots, one per meal. A meal's dot is `ToneDot(tone)` for the most urgent item it rescues (from `Rescue.items`), otherwise a `text3` dot.
   - **Today:** `beet` fill with `onBeet` content.
   - Tapping scrolls to that day (`proxy.scrollTo(day)`; `.id(day)` sits on each day's first row) and fires `.hapticSelection`.
   - Accessibility: "Saturday 26, 1 meal, uses expiring food".
   - At AX3 and above, the strip becomes a horizontal `ScrollView` of 56pt columns.
3. **Shop for this week card** (only when the week has meals): `beetSoft` background, r22, padding 16.
   - Contents: `HStack(spacing: 12) { 44pt beet rounded tile with basket.fill onBeet; VStack(alignment: .leading) { Text("Shop for this week").font(tileTitle).foregroundStyle(beetStrong); Text("Adds what \(n) meals need, minus what you have").font(detail) text2 } }`.
   - Then `InlineConfirmButton("Add to list", systemImage: "basket", kind: .primary, size: .compact)`, which returns "Added \(n)" or "Nothing new". It runs the same action as today.
4. **Day sections:**
   - Header: `HStack(alignment: .firstTextBaseline, spacing: 8) { Text(dayNumber).font(numberLarge); Text(weekday).font(section); if today { Text("Today").font(tag) as beet capsule, onBeet } }`. Past days use `text3`.
   - **Meal rows:** `HStack(spacing: 12) { CategoryTile(lead, size: .row); VStack(alignment: .leading) { Text(slot.title).eyebrowStyle() text2; Text(title).font(rowTitle) }; Spacer; Text("×\(servings)").font(tag) text2 }`. It is a NavigationLink to the recipe.
     - Leading swipe: "Cooked" (`frying.pan.fill`, `.tint(Theme.Colors.beet)`) opens `CookedSheet`.
     - Trailing swipe: "Remove".
   - **Empty day:** one row: a dashed placeholder `RoundedRectangle(cornerRadius: Theme.Radius.input).strokeBorder(Theme.Colors.fillStrong, style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))`, min height 48, containing `Label("Add meal", systemImage: "plus")` in `detailStrong` `text2`. It has a clear row background.
   - Days with meals end with a quiet "+ Add" row.

**RecipePickerSheet:**

- `.sheetChrome()`, with the title as the day.
- `ChipPicker("Meal", selection: $slot, …)`, then `.searchable`.
- Rows: a soft tile, the title (`rowTitle`), "30 min" (`number` + unit), a `CoverageBadge`, and a trailing alarm glyph when it rescues food.
- Tapping inserts the meal with `.hapticSuccess` and dismisses.

### 8.15 Shopping (Plan+Shop: `ShoppingListView`)

`List`, `.listChrome()`, title "Shopping".

- **Toolbar:**
  - Leading: `ShareLink` (`square.and.arrow.up`) when something is left to buy.
  - Trailing: an `ellipsis.circle` Menu with Scan receipt, Put checked items away, and Clear checked (destructive). This is unchanged.

Content:

1. **Add row** (first section):
   - `HStack(spacing: 12) { 40pt beet rounded tile with plus in onBeet; TextField("Add an item").submitLabel(.done); trailing CategoryTile(guess, size: .small) when the typed name guesses to something other than .other }`.
   - Focus stays after submit (unchanged), with `.hapticImpact(.light)` on insert.
2. **To buy, grouped by aisle.** Group by `FoodCategory.guess(category: "", name: item.name)` in `FoodCategory.aisleOrder`.
   - Header: `SectionHeader(category.title, count:, tile: category)`.
   - Rows (min height 52): `HStack(spacing: 12) { CheckToggle(isOn:, accessibilityLabel: "Bought \(name)"); VStack(alignment: .leading, spacing: 2) { Text(name).font(rowTitle); reason ("For Pancakes, French Toast", "Used up", "Tossed") in footnote text2 }; Spacer; qty in tag text2 }`.
   - Swipe: Delete.
   - **Checking** fills the circle and strikes the name through (`withAnimation(Theme.Motion.snappy)`). After **0.35 s** the row moves to "In the basket" with `Theme.Motion.smooth`. Unchecking within that window cancels the move.
   - If grouping misbehaves, fall back to one "To buy" section.
3. **In the basket:** `SectionHeader("In the basket", count:)`. Rows are checked items with the name struck through in `text2`.
4. **Action bar**, shown only when something is in the basket:
   - `InlineConfirmButton("Put \(n) away in Fridge", systemImage: "refrigerator.fill", kind: .primary, fullWidth: true)`, which returns "\(n) in your Fridge".
   - Next to it, `Button { showReceiptScan = true } label: { Image(systemName: "doc.text.viewfinder") }` with `IconCircleButtonStyle(.beetSoft, diameter: 50)`, labeled "Scan receipt instead".
   - The bar collapses when the basket empties (`motionAnimation(Theme.Motion.smooth, value: inCart.isEmpty)`).
5. **Empty:** `EmptyStateView(tiles: [.condiments, .snacks, .beverages], title: "Nothing to buy", message: "Your list fills itself as you cook and plan.", actions:)` with numbered steps:
   1. "Type an item above" → a Focus button that focuses the field.
   2. "Add what a recipe is missing" → Recipes (`AppRouter.shared.tab = .recipes`).
   3. "Shop for your week in Plan" → Plan (`.plan`).

### 8.16 Chef (Chef+Settings: `ChefView`)

Sheet from Tonight (and Fridge), `.sheetChrome()`, inline title "Chef". Toolbar: Done, and New chat once there are turns.

- **Context line**, the first row: `Label { Text("Sees \(pantry.count) items · \(urgent) to use soon · \(recipes.count) recipes · \(planned) planned") } icon: { Image(systemName: "sparkles").foregroundStyle(beetText) }` in `footnote` `text2`. It shows what the chef is grounded in.
- **Empty conversation** (left-aligned):
  - "What's for dinner?" in `titleHeavy`.
  - "I can see your fridge, recipes, and meal plan." in `detail` `text2`.
  - A "Using soon" row of up to 3 `FoodChip`s.
  - **Prompt rows:** the existing suggestions as full-width `surfaceCard(padding: 12, radius: Theme.Radius.input)` buttons, min height 52. Each has a 28pt `beetSoft` glyph tile (`fork.knife`, `timer`, `calendar`, `bolt.fill`), the text in `body`, and a trailing `arrow.up.right` in `text3`. Tapping sends it.
- **Bubbles:**
  - User: trailing, max width 85%, `beet` fill, `onBeet` `body`, `UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 20, bottomTrailingRadius: 6, topTrailingRadius: 20, style: .continuous)`, padding 14×10.
  - Chef: leading, `surface` fill, `ink` text with the mirrored corner, and `.textSelection(.enabled)`. The first chef bubble of a reply has a 28pt `beetSoft` circle avatar with `sparkles` in `beetText`.
  - Under chef replies: `Button("Save as recipe", systemImage: "book.closed.fill").buttonStyle(SecondaryButtonStyle(size: .compact))`. While saving, it shows a ProgressView. When saved, the label becomes "Saved · Open" (`checkmark`), and tapping opens the recipe (existing `savedRecipe` flow).
- **Thinking:** the avatar with `sparkles` using `.symbolEffect(.pulse)`, plus `Image(systemName: "ellipsis").symbolEffect(.variableColor.iterative, options: .repeating)` and "Thinking…" in `detail` `text2`. Under Reduce Motion, only the static text.
- **Errors:** a `todaySoft` card with `todayText` and a Quiet "Try again".
- **Composer:** `.actionBar { HStack(alignment: .bottom, spacing: 10) { TextField("Ask the chef…", text:, axis: .vertical).lineLimit(1...5).padding(.horizontal, 16).padding(.vertical, 11).background(Theme.Colors.fill, in: RoundedRectangle(cornerRadius: 22, style: .continuous)); Button(send) { Image(systemName: "arrow.up") }.buttonStyle(IconCircleButtonStyle(.beet)).disabled(empty).accessibilityLabel("Send") } }`. Sending fires `.hapticImpact(.light)`.
- **No API key:** `EmptyStateView(tiles: [.beverages], title: "Set up your chef", message: <existing copy>, actions:)` with steps:
  1. "Create a key at console.anthropic.com"
  2. "Paste it in Settings" → Open Settings

### 8.17 Settings (Chef+Settings: `SettingsView`)

`Form`, `canvas`, `.sheetChrome()`, inline "Settings", Done.

- Section headers are `Label { Text(title) } icon: { SettingsIconTile(systemImage:) }` with `.textCase(nil)`. The sections keep their existing order and contents:
  - Claude (`sparkles`): SecureField in `mono`, Save/Update key, and Remove (destructive, `todayText`). A status row shows `checkmark.seal.fill` in `fresh` with "Key saved", or "No key" in `text3`.
  - Expiration reminders (`bell.fill`)
  - Weekly check-in (`checklist`)
  - Always in stock (`basket.fill`): below the field, a live preview of the parsed staples as `fill` capsules.
  - Data (`tray.full.fill`)
  - Advanced (`slider.horizontal.3`): the model field in `mono`.
- **New last section, "How freshness tags work"** (read-only, `leaf.fill`). Each row pairs a real `FreshnessTag` with a meaning in `detail` `text2`:

  | Status shown | Meaning |
  |---|---|
  | `.expiringSoon(0)` | "Cook it tonight." |
  | `.expiringSoon(1)` | "Use it tomorrow at the latest." |
  | `.expiringSoon(soonDays)` | "Use it this week." |
  | `.fresh(9)` | "Fresh. Nothing to do." |
  | `.fresh(90)` with location `.freezer` | "Frozen. The clock is paused." |
  | `.expired(2)` | "Past its date. Check it before using." |

  Footer: "'Use soon' means within \(soonDays) days. Change it under Expiration reminders."

---

## 9. Copy tone

- Plain kitchen talk, sentence case, verbs first: "Cook this", "Add 2 to list", "Put 4 away in Fridge".
- Numbers are digits. Units are short in tags ("3 days", "2 wks", "3 mo") and spoken in full for VoiceOver.
- No exclamation marks, no emoji, no "Oops". Errors say what happened and what to do: "Couldn't read the receipt. Try again in better light."
- Name the food: "Uses broccoli before it goes bad" beats "Uses 1 expiring item".
- Confirmations are 1–3 words plus a checkmark: "Added 2", "On your list", "4 in your Fridge".
- Keep every existing string that §8 doesn't change. The smoke test and users both depend on them.

---

## 10. Motion and haptics

Global rules:

- Every animation goes through `Theme.Motion` (§7.8).
- Under Reduce Motion, every move, scale, offset or rotation becomes opacity, and looping motion stops.
- Haptics stay on under Reduce Motion.

| Moment | Animation | Haptic | Reduce Motion |
|---|---|---|---|
| Chip or filter change | Background `snappy`. The list diff uses `motionAnimation(smooth)`. | `.selection` | Fade |
| Time filter changes picks | Picks container `smooth`. Counts use `.contentTransition(.numericText())`. | `.selection` | Fade |
| **Cook this** | Ticket inserts with `.scale(scale: 0.96, anchor: .top).combined(with: .opacity)`. `proxy.scrollTo("top")`. | `.success` (trigger: `tonightEntry?.persistentModelID`) | Opacity |
| **Not tonight** | Card removal: `.asymmetric(insertion: .opacity, removal: .move(edge: .leading).combined(with: .opacity))`. The rest reflow `smooth`. | `.impact(weight: .light)` (trigger: `skippedRaw`) | Opacity |
| Hero stickers appear | Scale 0.8 → 1 with `bouncy`, staggered by 0.05 s, on first appear only | — | None |
| Use-soon strip scroll | `scrollTransition` scale 0.94 / opacity 0.75 at the edges | — | Not applied |
| Inline confirmation | Symbol `.replace` plus a text crossfade | `.success` | Same |
| Freshness strip | Segment widths `smooth`. Numbers `.numericText`. | — | Instant |
| Dial | Arc 0 → fraction, `.smooth(duration: 0.7)` on appear. Value changes use `smooth`. | — | Static |
| Favorite | `.symbolEffect(.bounce, value:)` | `.impact(weight: .light)` | No bounce |
| Check toggle | `.contentTransition(.symbolEffect(.replace))` | `.selection` | Instant |
| Shopping check → basket | Strike `snappy`, then move to the basket after 0.35 s with `smooth` | `.selection` | Instant move |
| Put away / Update fridge / Save check-in / Add N to Fridge / plan insert | — | `.success` | Same |
| Servings ± | `.contentTransition(.numericText(value:))` on the servings value and on the new amounts | `.increase` / `.decrease` | Same |
| Receipt/photo reading | Scan band `.repeatForever`. `doc.text.viewfinder` uses `.variableColor.iterative`. | — | `ProgressView` |
| Review rows arrive | `.opacity` + `.offset(y: 8)`, staggered by 0.03 s × min(i, 12) | `.success` when done, `.error` on failure | Opacity, no stagger |
| Check-in answer | Stamp `bouncy` (150 ms), then exit toward `exitEdge` while the next card scales 0.95 → 1 | Kept `.selection`, used `.impact(.light)`, tossed `.impact(.medium)`; summary `.success` | Stamp fades, then cards cross-fade |
| Check-in drag (optional) | `rotationEffect(dx / 20)`; the stamp fades with distance | `.impact(.light)` once, at the threshold | No rotation |
| Chef thinking | `sparkles` `.pulse`; `ellipsis` `.variableColor.iterative` | — | Static text |
| Chat send | New bubble `.move(edge: .bottom).combined(with: .opacity)`; `scrollTo` in `smooth` | `.impact(.light)` | Opacity |
| Category tile change (editors) | Glyph `.replace`; fill `snappy` | — | Instant |
| Open a recipe | `.navigationTransition(.zoom(sourceID:in:))` | — | The system reduces it |
| Button press | Scale 0.97 with `.snappy(duration: 0.2)` | — | No scale |

Nothing else moves on its own. There is no ambient animation, and the TODAY tape never pulses.

---

## 11. Accessibility rules

- **Contrast:** every text pair is AA (§2.7). `text3` is never on `fillStrong`. Text on crate blocks uses only `onFill`, and text on beet only `onBeet`/`onBeet2`.
- **Color is never the only signal:**
  - Tags always carry a glyph and words.
  - Past is hollow and outlined, while today/soon are filled tape.
  - Coverage shows "Ready" or "5/7".
  - The strip has a text legend with counts.
  - Categories are spoken in row labels and titled in the editor grid.
  - Check-in progress has a text counter.
  - Week dots are included in the column label.
- **Increase Contrast:** tokens switch through their HC values. Filled tags and stickers add a 1pt `ink` border. Cards add a 1pt `separator` border.
- **Dynamic Type:**
  - Text is never given a fixed-height container; use `minHeight` only.
  - Fixed sizes apply only to graphics (tiles, dots, meters, dial), scaled through `@ScaledMetric` and capped.
  - At `dynamicTypeSize.isAccessibilitySize`:
    - Row tags move under the text.
    - Action rows fall through to full-width stacks.
    - The recipe grid becomes 1 column.
    - Sticker and time-sticker rotation drops to 0, and the time sticker goes inline.
    - The strip legend becomes a 2-column Grid.
    - The week strip scrolls.
    - The check-in dial moves above the text.
    - Numbered empty-state buttons drop under their text.
- **VoiceOver:**
  - Section and card titles get `.isHeader`.
  - Tiles, fans, dial, meters, dots, deck peeks, the scan band and the tear line are `.accessibilityHidden(true)`.
  - Rows are combined elements that read as full sentences.
  - Tags use `spokenLabel`.
  - Buttons get specific labels ("Cook Beef and Broccoli Stir Fry tonight").
  - Chips and toggles expose `.isSelected` / `.isToggle`.
  - The servings stepper is adjustable.
  - The check-in card has custom actions and announces each new card.
  - Inline confirmations post announcements.
  - Every icon-only button has a label: Settings, Add, Chef, Send, Share, More, Previous/Next week, Add to meal plan, Scan receipt instead, Favorite.
  - Swipe actions are exposed automatically. Context-menu items duplicate existing actions, so nothing lives only in a context menu.
- **44pt targets** everywhere:
  - Chips (via padding)
  - Check toggles
  - Quiet buttons
  - Toolbar buttons
  - Stepper circles
  - Week columns
  - Legend entries
  - FoodChips
  - The time chips
- **Other settings:**
  - Reduce Motion: §10.
  - Reduce Transparency: only `.bar` and `.regularMaterial` are used, and they adapt.
  - Smart Invert: `.accessibilityIgnoresInvertColors()` on receipt and grocery photos.
  - Bold Text: already heavy, and the system handles it.

---

## 12. App icon: "Fridge magnets"

A white fridge on a beet field, tilted −6°. Three round produce magnets (citrus, herb and tomato, which are the heat colors) sit on the door, and a strip of citrus date tape is stuck to the freezer door. It reads as "fridge + colorful food" at 29pt and uses the brand beet without being green.

Render it at 1024×1024 with **no rounding and no alpha** (iOS applies the mask) and replace `AppIcon.png`. For example: `npx playwright`, or `node -e` with Playwright's `page.setContent` + `screenshot` (the preview tooling already has it).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="0.3" cy="0.2" r="0.95">
      <stop offset="0" stop-color="#C42277"/><stop offset="0.6" stop-color="#A3145C"/><stop offset="1" stop-color="#7E0C47"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="rotate(-6 512 512)">
    <rect x="292" y="140" width="440" height="744" rx="104" fill="#FFFFFF"/>
    <rect x="292" y="372" width="440" height="22" fill="#A3145C"/>
    <rect x="348" y="214" width="32" height="104" rx="16" fill="#16181D"/>
    <rect x="348" y="446" width="32" height="176" rx="16" fill="#16181D"/>
    <path d="M500 226 L652 226 L644 238 L652 250 L644 262 L652 274 L500 274 L508 262 L500 250 L508 238 Z" fill="#FFC21F"/>
    <g fill="#16181D" opacity="0.14">
      <circle cx="586" cy="578" r="70"/><circle cx="628" cy="752" r="90"/><circle cx="470" cy="778" r="68"/>
    </g>
    <circle cx="586" cy="568" r="70" fill="#FFC21F"/>
    <circle cx="564" cy="544" r="15" fill="#FFFFFF" opacity="0.6"/>
    <circle cx="628" cy="742" r="90" fill="#237F43"/>
    <circle cx="598" cy="712" r="17" fill="#FFFFFF" opacity="0.35"/>
    <circle cx="470" cy="768" r="68" fill="#C8341A"/>
    <path d="M470 702 C482 672 510 660 538 666 C528 694 502 708 470 702 Z" fill="#237F43"/>
  </g>
</svg>
```

**iOS 18 dark variant** (optional; add it as a second image in `AppIcon.appiconset/Contents.json` with `"appearances": [{"appearance": "luminosity", "value": "dark"}]`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="0.3" cy="0.2" r="0.95">
      <stop offset="0" stop-color="#4A1C3D"/><stop offset="0.55" stop-color="#231A26"/><stop offset="1" stop-color="#121014"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="rotate(-6 512 512)">
    <rect x="292" y="140" width="440" height="744" rx="104" fill="#F4F1F6"/>
    <rect x="292" y="372" width="440" height="22" fill="#C0206F"/>
    <rect x="348" y="214" width="32" height="104" rx="16" fill="#121014"/>
    <rect x="348" y="446" width="32" height="176" rx="16" fill="#121014"/>
    <path d="M500 226 L652 226 L644 238 L652 250 L644 262 L652 274 L500 274 L508 262 L500 250 L508 238 Z" fill="#FFC933"/>
    <g fill="#121014" opacity="0.22">
      <circle cx="586" cy="578" r="70"/><circle cx="628" cy="752" r="90"/><circle cx="470" cy="778" r="68"/>
    </g>
    <circle cx="586" cy="568" r="70" fill="#FFC933"/>
    <circle cx="564" cy="544" r="15" fill="#FFFFFF" opacity="0.6"/>
    <circle cx="628" cy="742" r="90" fill="#5BD084"/>
    <circle cx="598" cy="712" r="17" fill="#FFFFFF" opacity="0.35"/>
    <circle cx="470" cy="768" r="68" fill="#FF6A47"/>
    <path d="M470 702 C482 672 510 660 538 666 C528 694 502 708 470 702 Z" fill="#2E9A57"/>
  </g>
</svg>
```

- **Tinted variant:** omit it and let iOS derive one.
- **Web:** use the light SVG inline as `<link rel="icon" href="data:image/svg+xml,…">` and as the `apple-touch-icon`.

---

## 13. Web preview mapping (Web)

The preview is a single HTML file viewed in iPhone Safari. It mirrors the tokens, components and screens above.

**Keep every hook `preview/smoke.js` uses:**

- `button.tab[data-value="…"]`
- `data-action="open-recipe" | "cooked" | "open-checkin"`
- all other existing `data-action`, `data-id` and `data-value` attributes

Class names may change freely. After restyling, run `python3 preview/build.py && node preview/smoke.js` and review `preview/dist/shots/*`.

### 13.1 Base and fonts

```css
html { font: -apple-system-body; }              /* 1rem tracks iOS Text Size (17px default) */
:root {
  color-scheme: light dark;
  --font-text: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --font-rounded: ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif;
  --font-serif: ui-serif, "New York", Georgia, serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
}
body { font-family: var(--font-text); background: var(--canvas); color: var(--ink); margin: 0; }
.num { font-family: var(--font-rounded); font-weight: 800; font-variant-numeric: tabular-nums; }
```

Size everything in `rem` using the CSS column of §3. Keep the 16px side gutters and avoid horizontal page scroll.

### 13.2 Tokens

Custom property names are the kebab-case form of the Swift token names.

```css
:root {
  --canvas:#F2F4F3; --surface:#FFFFFF; --fill:#E7EBE9; --fill-strong:#D6DCD9; --separator:#D9DEDC;
  --ink:#16181D; --text-2:#4E555A; --text-3:#5F676C; --inverse:#FFFFFF;
  --beet:#A3145C; --beet-pressed:#85104B; --on-beet:#FFFFFF; --on-beet-2:#FFE3F1; --beet-text:#A3145C;
  --beet-soft:#F7DDEA; --beet-strong:#8E0F50; --ticket-button:#FFFFFF; --on-ticket-button:#A3145C;
  --fresh:#1B7440; --fresh-soft:#DDF2E4; --soon:#FFC21F; --on-soon:#16181D; --soon-text:#8A5B00; --soon-soft:#FFF1C7;
  --today:#C8341A; --on-today:#FFFFFF; --today-text:#B42D14; --today-soft:#FBE3DD;
  --past:#4E555A; --frost:#236A91; --frost-soft:#E3F0F7;
  --dial-face:#16181D; --dial-track:#3A3D44; --dial-tick:rgba(255,255,255,.35);
  --dial-fresh:#6CD697; --dial-soon:#FFC933; --dial-today:#FF6A47; --dial-frost:#8FCBEB; --dial-past:#978F9D;
  --tape-edge:rgba(0,0,0,.10); --sticker-shadow:0 1px 3px rgba(0,0,0,.12); --light-fill-stroke:inset 0 0 0 .5px rgba(0,0,0,.10);
  /* category: crate fill / on / soft / deep */
  --c-produce:#237F43; --on-produce:#FFFFFF; --soft-produce:#E2EEE7; --deep-produce:#21733E;
  --c-dairy:#2A64D6; --on-dairy:#FFFFFF; --soft-dairy:#E3EBFA; --deep-dairy:#285EC7;
  --c-meat:#F28A70; --on-meat:#43100A; --soft-meat:#F9E9E5; --deep-meat:#A54633;
  --c-seafood:#0B7872; --on-seafood:#FFFFFF; --soft-seafood:#DFEDED; --deep-seafood:#0C706B;
  --c-bakery:#9A5520; --on-bakery:#FFFFFF; --soft-bakery:#F2E9E2; --deep-bakery:#955320;
  --c-frozen:#A8DDF4; --on-frozen:#0A3346; --soft-frozen:#E4EFF5; --deep-frozen:#296C8F;
  --c-grains:#E4C487; --on-grains:#3F2C05; --soft-grains:#F4EEE2; --deep-grains:#82611E;
  --c-condiments:#5F6E17; --on-condiments:#FFFFFF; --soft-condiments:#EAECE1; --deep-condiments:#5C6B17;
  --c-beverages:#7338B5; --on-beverages:#FFFFFF; --soft-beverages:#EDE5F5; --deep-beverages:#7338B5;
  --c-snacks:#F7A03A; --on-snacks:#3A1800; --soft-snacks:#FAEDE1; --deep-snacks:#97561B;
  --c-other:#5E666D; --on-other:#FFFFFF; --soft-other:#EAEBEC; --deep-other:#5D646B;
}
/* Dark: the same block twice — system dark unless forced light, and forced dark. */
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* DARK */ } }
:root[data-theme="dark"] { /* DARK */ }
/* DARK:
  --canvas:#121014; --surface:#1E1A21; --fill:#2B2630; --fill-strong:#36313B; --separator:#3A343F;
  --ink:#F4F1F6; --text-2:#B8B0BE; --text-3:#978F9D; --inverse:#16181D;
  --beet:#C0206F; --beet-pressed:#A51A60; --beet-text:#F58ACB; --beet-soft:#3B1831; --beet-strong:#FFB0DC;
  --fresh:#6CD697; --fresh-soft:#1F3327; --soon:#FFC933; --on-soon:#2E2000; --soon-text:#FFD35C; --soon-soft:#3A2E0C;
  --today:#FF6A47; --on-today:#2B0A03; --today-text:#FF8B70; --today-soft:#3A1A14;
  --past:#B8B0BE; --frost:#8FCBEB; --frost-soft:#1C2A33; --dial-face:#0E0C10; --dial-track:#3A3540;
  --tape-edge:transparent; --sticker-shadow:0 1px 3px rgba(0,0,0,.5); --light-fill-stroke:none;
  --c-produce:#5BD084; --on-produce:#0B2A12; --soft-produce:#2A3E35; --deep-produce:#5BD084;
  --c-dairy:#6FA3FF; --on-dairy:#061A3D; --soft-dairy:#2E354D; --deep-dairy:#72A5FF;
  --c-meat:#F5977F; --on-meat:#43100A; --soft-meat:#493334; --deep-meat:#F5977F;
  --c-seafood:#3CC7BC; --on-seafood:#032A28; --soft-seafood:#243D40; --deep-seafood:#3CC7BC;
  --c-bakery:#D99557; --on-bakery:#2E1504; --soft-bakery:#43332C; --deep-bakery:#DB995E;
  --c-frozen:#8FD3F2; --on-frozen:#0A3346; --soft-frozen:#353F4B; --deep-frozen:#8FD3F2;
  --c-grains:#DDBB78; --on-grains:#3F2C05; --soft-grains:#443A32; --deep-grains:#DDBB78;
  --c-condiments:#B5C74A; --on-condiments:#1E2404; --soft-condiments:#3C3D29; --deep-condiments:#B5C74A;
  --c-beverages:#B98CF2; --on-beverages:#22083F; --soft-beverages:#3D314B; --deep-beverages:#BD93F3;
  --c-snacks:#F5A84E; --on-snacks:#3A1800; --soft-snacks:#49362A; --deep-snacks:#F5A84E;
  --c-other:#A7B0B8; --on-other:#15181B; --soft-other:#39383F; --deep-other:#A7B0B8; */
@media (prefers-contrast: more) {
  :root { --text-2:#3A4045; --text-3:#4E555A; --separator:#A9B1AD; --past:#3A4045; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --text-2:#D6D0DA; --text-3:#B8B0BE; --separator:#5A5360; --past:#D6D0DA; } }
}
```

`build.py` may template the duplicated dark block. Otherwise paste it twice.

### 13.3 Components

| Swift | HTML / CSS |
|---|---|
| `FreshnessTag` | `<span class="tag today" aria-label="Expires today"><svg class="i">…</svg>Today</span>`. `.tag{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;font:700 .765rem/1 var(--font-rounded);font-variant-numeric:tabular-nums;white-space:nowrap}` |
| — tape (today/soon) | `.tag.today,.tag.soon{clip-path:polygon(0 0,100% 0,calc(100% - 3px) 16.6%,100% 33.3%,calc(100% - 3px) 50%,100% 66.6%,calc(100% - 3px) 83.3%,100% 100%,0 100%,3px 83.3%,0 66.6%,3px 50%,0 33.3%,3px 16.6%)}` `.tag.today{background:var(--today);color:var(--on-today)}` `.tag.soon{background:var(--soon);color:var(--on-soon)}` |
| — fresh / paused / past | `.tag.fresh{color:var(--fresh);padding-inline:0}` `.tag.paused{color:var(--frost);padding-inline:0}` `.tag.past{color:var(--past);box-shadow:inset 0 0 0 1.25px var(--past);border-radius:4px}` |
| `CategoryTile` | `<span class="tile soft" style="--t:var(--soft-produce);--g:var(--deep-produce)">`. `.tile{display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:var(--t);color:var(--g)}`. `.tile.crate` uses `--c-x`/`--on-x` and `box-shadow:var(--light-fill-stroke)` for light-fill categories. Sizes `.s` 28/8, `.l` 56/16, `.xl` 64/18. |
| `FoodRow` | `<button class="row" data-action="edit-item">` containing a grid `40px 1fr auto` with gap 12px, min-height 60px, and a hairline `border-bottom:.5px solid var(--separator)` starting at the text column. |
| `FreshnessStrip` | `.strip{display:flex;gap:3px;height:12px;border-radius:999px;overflow:hidden}`. Segments are `<i style="flex:<count> 0 10px;background:var(--today)">`; past is `background:none;box-shadow:inset 0 0 0 1.5px var(--past)`. Legend entries are `<button class="legend" aria-pressed>`. |
| `FreshnessDial` | Inline SVG `viewBox="0 0 168 168"`: `<circle r="84" fill="var(--dial-face)">`, 14 ticks, track `r="62" stroke="var(--dial-track)" stroke-width="12"`, and an arc with the same radius, `pathLength="100" stroke-dasharray="{fraction*100} 100" stroke-linecap="round" transform="rotate(-90 84 84)"`, then the center `<text>`. Past gets `stroke-dasharray:4 5` on the track. |
| `CoverageBadge` | `.ready{background:var(--fresh-soft);color:var(--fresh)}`. Meter: `.meter{display:inline-flex;gap:2px}.meter i{width:6px;height:12px;border-radius:2px;background:var(--fill-strong)}.meter i.on{background:var(--fresh)}` |
| Buttons | `.btn{min-height:50px;padding:0 20px;border-radius:999px;font:700 1rem var(--font-text);border:0}` `.btn.compact{min-height:44px;font-size:.882rem}` `.primary{background:var(--beet);color:var(--on-beet)}` `.primary:active{background:var(--beet-pressed)}` `.secondary{background:var(--beet-soft);color:var(--beet-strong)}` `.neutral{background:var(--fill);color:var(--ink)}` `.danger{background:var(--today-soft);color:var(--today-text)}` `.inverted{background:var(--ticket-button);color:var(--on-ticket-button)}` `.quiet{background:none;color:var(--text-2);min-height:44px;font-weight:600}` `.btn:active{transform:scale(.97)}` `.full{width:100%}` |
| `InlineConfirmButton` | Swap the label to "✓ Added 2" (checkmark SVG) for 2 s, set `aria-live="polite"` on the label. |
| `Chip` / `ChipPicker` | `<div class="chips" role="group" aria-label="Time">` (flex, gap 8px, `overflow-x:auto`, 16px inline padding) of `<button class="chip" aria-pressed="true">`. `.chip{min-height:44px;padding:4px 14px;background:var(--fill) content-box;border-radius:999px;font:600 .882rem var(--font-text)}` `.chip[aria-pressed=true]{background:var(--beet) content-box;color:var(--on-beet);font-weight:700}`. This replaces the `.seg` segmented controls; keep their `data-action`/`data-value`. |
| `surfaceCard` / `crateBlock` | `.card{background:var(--surface);border-radius:22px;padding:16px}` `.crate{background:var(--c-x);color:var(--on-x);border-radius:28px;padding:20px}` |
| `SectionHeader` | `<h3 class="sh"><svg/>Use soon<span class="count num">4</span><button class="quiet">Fridge</button></h3>` `.sh{display:flex;align-items:baseline;gap:8px;font:800 1.176rem var(--font-text);margin:24px 0 8px}` |
| `Sticker` / `TimeSticker` | `.sticker{background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 12px;box-shadow:var(--sticker-shadow);font:700 .765rem var(--font-rounded);transform:rotate(var(--r,0))}` `.time-sticker{width:64px;height:64px;border-radius:50%;display:grid;place-content:center;text-align:center}` |
| `TicketCard` | Two blocks with `background:var(--beet)`. Top: `border-radius:28px 28px 0 0`. Bottom: `border-radius:0 0 28px 28px`. Notches via `-webkit-mask`/`mask`: top `radial-gradient(circle 10px at 0 100%,transparent 98%,#000) left/51% 100% no-repeat, radial-gradient(circle 10px at 100% 100%,transparent 98%,#000) right/51% 100% no-repeat`; bottom the same `at 0 0` / `at 100% 0`. The tear line is `border-top:1.5px dashed rgba(255,255,255,.55)` inset 18px. |
| `EmptyStateView` | Left-aligned `.empty` with a `.fan` of three `.tile.crate.xl` rotated −8°/4°/12° and overlapping by −20px. Numbered steps are `<ol class="steps">` rows with a `.num` beet digit and a compact button. |
| `actionBar` | `position:sticky;bottom:0;padding:10px 16px calc(8px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--canvas) 82%,transparent);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-top:.5px solid var(--separator)`, with a solid `var(--canvas)` fallback when `backdrop-filter` is unsupported. |
| Tab bar | Restyle `button.tab`. Selected uses `var(--beet-text)` with the filled icon; unselected `var(--text-2)`. The Fridge badge is a 18px `var(--today)` circle with `var(--on-today)` count. |

### 13.4 Icons

Extend the existing `ICONS` map. Use a 24×24 viewBox and `fill="currentColor"` unless noted, `aria-hidden="true"`, sized `1em` in tags and 24px in toolbars. Keep the existing stroke icons (fork, book, calendar, sparkles, plus, gear, chevrons, heart, up, stop). Add the following. They were rendered and checked; the Fresh Market set is reused.

```js
alarm:    '<path fill-rule="evenodd" d="M12 4.5a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-.9 3.5v5.2l3.8 2.3.9-1.5-3-1.8V8z"/><path d="M2.9 7.4 7.4 2.9a3 3 0 0 0-4.5 4.5zM21.1 7.4 16.6 2.9a3 3 0 0 1 4.5 4.5z"/>',
hourglass:'<path d="M6 2.5h12v1.8h-1.2v1.4c0 2.4-1.6 4.4-3.6 5.8v1c2 1.4 3.6 3.4 3.6 5.8v1.4H18v1.8H6v-1.8h1.2v-1.4c0-2.4 1.6-4.4 3.6-5.8v-1C8.8 10.1 7.2 8.1 7.2 5.7V4.3H6z"/>',
leaf:     '<path d="M20.5 3.5C11.5 3.5 4 7.5 4 15c0 1.6.5 3 1.3 4.2C7 14 10.5 10.6 15 8.6c-4 2.5-7 6-8.4 11.7 1.4.7 2.8 1 4 1 6.6-.2 9.9-7.2 9.9-17.8z"/>',
snow:     '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5"/><path d="M9.3 4.4L12 6.6l2.7-2.2M9.3 19.6L12 17.4l2.7 2.2M4.4 10.9l3.3-.9-.6-3.4M19.6 13.1l-3.3.9.6 3.4M4.4 13.1l3.3.9-.6 3.4M19.6 10.9l-3.3-.9.6-3.4"/></g>',
alert:    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 3.5 2.5 20h19z"/><path d="M11 9.5h2v5.5h-2zm0 7h2v2h-2z"/>',
carrot:   '<path d="M15.3 8.7l-1.9-1.9c-.9-.9-2.3-.8-3.1.1L3.6 19.2c-.6.8.3 1.8 1.2 1.2l12.3-6.7c.9-.8 1-2.2.1-3.1z"/><path d="M14.6 6.9c-.6-1.8-.3-3.6 1-4.9.9 1.2 1 2.6.6 3.9 1.3-.4 2.8-.2 3.9.7-1.3 1.3-3.1 1.6-4.9 1z"/><path d="M16.9 9.3c1.8-.6 3.7-.3 5 .9-1.3 1.2-3.2 1.4-5 .8z"/>',
drop:     '<path d="M12 2.5C9 7 5.5 10.4 5.5 14.6a6.5 6.5 0 0 0 13 0c0-4.2-3.5-7.6-6.5-12.1z"/>',
flame:    '<path d="M12 1.8c1 3.6 5.8 5.8 5.8 11.2a5.8 5.8 0 0 1-11.6 0c0-2.3 1.1-4 2.5-5.2.1 1.8.9 2.9 2 3.4.3-3.6-.3-6.5 1.3-9.4z"/>',
fish:     '<path fill-rule="evenodd" d="M2.5 12c2.6-4.4 8.8-6.2 13.2-2.8L21 5.5v13l-5.3-3.7C11.3 18.2 5.1 16.4 2.5 12zm5.5-1.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/>',
cake:     '<rect x="3.5" y="13" width="17" height="8" rx="2"/><rect x="5.5" y="9.5" width="13" height="4.5" rx="1.5"/><rect x="11.2" y="5.5" width="1.6" height="4.5" rx=".8"/><path d="M12 1.8c1 1 1.3 1.9.7 2.6-.4.4-1 .4-1.4 0-.6-.7-.2-1.6.7-2.6z"/>',
bag:      '<path d="M5.5 8.5h13l-1.1 12.1a1.5 1.5 0 0 1-1.5 1.4H8.1a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="2"/>',
bottle:   '<path d="M10 2h4v3.2l1.8 2.6c.5.7.7 1.4.7 2.2V20a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V10c0-.8.2-1.5.7-2.2L10 5.2z"/>',
mug:      '<path d="M3.5 7h12.5v8.5A4.5 4.5 0 0 1 11.5 20h-3.5A4.5 4.5 0 0 1 3.5 15.5z"/><path d="M16 9h1.5a3 3 0 0 1 0 6H16" fill="none" stroke="currentColor" stroke-width="2"/>',
popcorn:  '<path d="M4.5 10.5h15L17.4 21.2a1 1 0 0 1-1 .8H7.6a1 1 0 0 1-1-.8z"/><circle cx="7.6" cy="8.4" r="2.7"/><circle cx="12" cy="6.6" r="3.1"/><circle cx="16.4" cy="8.4" r="2.7"/>',
box:      '<path fill-rule="evenodd" d="M12 2.5l8.5 4.3v10.4L12 21.5l-8.5-4.3V6.8zM6.4 7.4L12 10.2l5.6-2.8L12 4.6zM11 12v7l-5.5-2.8V9.3z"/>',
fridgeFill:'<path fill-rule="evenodd" d="M8.5 2h7A2.5 2.5 0 0 1 18 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19.5v-15A2.5 2.5 0 0 1 8.5 2zM6 9.2h12v1.3H6zM8.4 4.8h1.3v3H8.4zm0 7.4h1.3v4.4H8.4z"/>',
cabinet:  '<path fill-rule="evenodd" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm6.35 1.8v14.4h1.3V4.8zM9 10.5h1.2v3H9zm4.8 0H15v3h-1.2z"/>',
timer:    '<path fill-rule="evenodd" d="M10 1.5h4V3h-1.2v1.1a8.5 8.5 0 1 1-1.6 0V3H10zM12 7.2a6.3 6.3 0 1 0 0 12.6 6.3 6.3 0 0 0 0-12.6zm-.8 1.8h1.6v5.4h-1.6z"/>',
basket:   '<path fill-rule="evenodd" d="M8.6 3.2l1.6.8L7.6 9h8.8l-2.6-5 1.6-.8L18.3 9H22v2h-1.2l-1.6 8.5A2 2 0 0 1 17.2 21H6.8a2 2 0 0 1-2-1.5L3.2 11H2V9h3.7zM8 13v5h1.6v-5zm3.2 0v5h1.6v-5zm3.2 0v5H16v-5z"/>',
pan:      '<path d="M2 11.5h14a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5z"/><rect x="15.5" y="10.4" width="7" height="2.2" rx="1.1"/>',
checkFill:'<path fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm4.3 6.3l-5.6 5.6-2.9-2.9-1.4 1.4 4.3 4.3 7-7z"/>',
```

Web glyph mapping by category:

| Category | Icon |
|---|---|
| produce | carrot |
| dairy | drop |
| meat | flame |
| seafood | fish |
| bakery | cake |
| frozen | snow |
| grains | bag |
| condiments | bottle |
| beverages | mug |
| snacks | popcorn |
| other | box |

Tones use alarm, hourglass, leaf, snow and alert.

### 13.5 Motion and haptics on the web

- Cards and chips: `transition: transform .28s cubic-bezier(.2,.9,.3,1.2), opacity .2s`.
- Removal: add a class for `transform:translateX(-24px);opacity:0`, then remove the node after 220ms.
- The scan band and the check-in stamp use `@keyframes`.
- `@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation:none!important; transition:opacity .2s!important } }`.
- No haptics.

---

## 14. Risks and fallbacks

| Risk | Why it matters without a compiler | Built-in fallback |
|---|---|---|
| SF Symbol names | Missing names render blank and the build still passes | `Theme.symbol(_:fallback:)` guards every category, location, tone and basket glyph (§5.1) |
| `TicketHalf` curve math | Custom path | Cubic curves only, no `addArc` direction. Fallback: a `RoundedRectangle` with the dashed rule and no notches. |
| Ticket seam between halves | Sub-pixel gap | 1pt background overlap (`.padding(.bottom, -1)`) with the tear line on top |
| `TapeShape` | Custom path | `RoundedRectangle(cornerRadius: 3)`, which still carries color and words |
| `FreshnessStrip` geometry | `GeometryReader` plus minimum widths can overflow by a few points | Clipped by `Capsule()`. Fallback: equal-width segments. |
| Zoom transition | Needs a shared namespace between source and destination | Both live in the same view (`TonightView`, `RecipesView`). Fallback: delete `.matchedTransitionSource` and `.navigationTransition`. |
| Tonight and Recipes move from `List` to `ScrollView` | Lose automatic insets and row separators | Neither screen needs swipes; context menus replace them. If needed, wrap cards in List rows with `.listRowInsets(EdgeInsets())` and a clear background. |
| `ViewThatFits` action rows | Rarely picks an unexpected layout | Explicit `isAccessibilitySize` branch to the stacked layout |
| Custom List section headers | Header insets vary across 18.x | `.headerProminence(.increased)` with plain `Text` |
| `ChipPicker` replacing segmented Pickers | Selection bugs | A one-line revert to `Picker(...).pickerStyle(.segmented)` |
| Check-in stamp and the 150 ms delay | Double taps, state races | `isAnswering` disables the buttons. Fallback: no stamp, opacity transition only. |
| Check-in drag gesture | Conflicts with sheet swipe-down | Optional. Horizontal-only threshold. Cut it entirely if it misbehaves. |
| Deck peeks | ZStack sizing with Dynamic Type | Drawn in `.background` of the card. Fallback: omit them. |
| Shopping 0.35 s delayed move | Timing and state | A `Task` keyed by item ID, cancelled on uncheck. Fallback: move immediately. |
| Aisle grouping and lead colors | Keyword heuristics mislabel some items | Pure FridgeCore with tests; only affects presentation. Fallback: `.other` and an ungrouped list. |
| `Color(uiColor:)` providers | None known | Asset-catalog colorsets with the same hexes |
| `.borderedProminent` left behind | White on pink in dark mode | Review checklist below |
| Web drift | Hand-written mirror | One token block (§13.2), verified icons, and screenshot review after every change |

---

## 15. Review checklist (every PR)

- [ ] `grep -rn "borderedProminent\|\.bordered)" ios/RefrigeratorRecipes` returns nothing.
- [ ] No `Color(red:`, `Color(hex`, `0x` color literals, `.font(.system(size:` for text, `.foregroundStyle(.green/.orange/.red/.pink)`, or `.accentColor` outside `DesignSystem/`.
- [ ] No `.alert` used for a *successful* action. Alerts are for errors only.
- [ ] Every icon-only button has `.accessibilityLabel`. Every interactive element has a 44pt target.
- [ ] Dense lists use `CategoryTile(style: .soft)`. `.crate` appears only in the places listed in §2.6.
- [ ] Beet appears only on pressable or selected things, the ticket, and step numbers.
- [ ] Layouts are checked at the AX5 text size (Xcode Previews/Environment Overrides, once available) and in dark mode.
- [ ] Reduce Motion paths exist for every `withAnimation`, transition and repeating effect.
- [ ] Existing user-facing strings and all `data-action` hooks are preserved.
- [ ] `swift test --package-path ios/Packages/FridgeCore` passes, including the new FoodCategory, Freshness and Rescue tests.
