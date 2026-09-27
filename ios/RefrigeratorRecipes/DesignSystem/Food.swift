import SwiftUI
import SwiftData
import FridgeCore

// Color = food. Category crates, soft tiles, and the standard inventory row
// (DESIGN.md §2.5, §2.6, §5.2, §5.3, §7.2).

struct CategoryPalette {
    /// Full crate color, for hero objects only (§2.6).
    let fill: Color
    /// Text and glyphs on `fill`.
    let onFill: Color
    /// Soft tile fill, for every list.
    let soft: Color
    /// Glyph on `soft`.
    let deep: Color
    /// Light crate fills get a 0.5pt `tapeEdge` inner stroke in light mode.
    let isLightFill: Bool
}

extension FoodCategory {
    /// Guarded SF Symbol name (§5.3).
    var symbol: String {
        switch self {
        case .produce: return Theme.symbol("carrot.fill", fallback: "leaf.fill")
        case .dairy: return Theme.symbol("drop.fill", fallback: "circle.fill")
        case .meat: return Theme.symbol("flame.fill", fallback: "circle.fill")
        case .seafood: return Theme.symbol("fish.fill", fallback: "drop.fill")
        case .bakery: return Theme.symbol("birthday.cake.fill", fallback: "square.fill")
        case .frozen: return Theme.symbol("thermometer.snowflake", fallback: "snowflake")
        case .grains: return Theme.symbol("bag.fill", fallback: "square.fill")
        case .condiments: return Theme.symbol("waterbottle.fill", fallback: "drop.fill")
        case .beverages: return Theme.symbol("mug.fill", fallback: "cup.and.saucer.fill")
        case .snacks: return Theme.symbol("popcorn.fill", fallback: "star.fill")
        case .other: return Theme.symbol("shippingbox.fill", fallback: "square.fill")
        }
    }

    /// Crate and soft colors (§2.5).
    var palette: CategoryPalette {
        switch self {
        case .produce: return CategoryPalettes.produce
        case .dairy: return CategoryPalettes.dairy
        case .meat: return CategoryPalettes.meat
        case .seafood: return CategoryPalettes.seafood
        case .bakery: return CategoryPalettes.bakery
        case .frozen: return CategoryPalettes.frozen
        case .grains: return CategoryPalettes.grains
        case .condiments: return CategoryPalettes.condiments
        case .beverages: return CategoryPalettes.beverages
        case .snacks: return CategoryPalettes.snacks
        case .other: return CategoryPalettes.other
        }
    }
}

/// Stored once, so no `Color` is allocated per access.
private enum CategoryPalettes {
    static let produce = CategoryPalette(
        fill: Color(light: 0x237F43, dark: 0x5BD084), onFill: Color(light: 0xFFFFFF, dark: 0x0B2A12),
        soft: Color(light: 0xE2EEE7, dark: 0x2A3E35), deep: Color(light: 0x21733E, dark: 0x5BD084),
        isLightFill: false)
    static let dairy = CategoryPalette(
        fill: Color(light: 0x2A64D6, dark: 0x6FA3FF), onFill: Color(light: 0xFFFFFF, dark: 0x061A3D),
        soft: Color(light: 0xE3EBFA, dark: 0x2E354D), deep: Color(light: 0x285EC7, dark: 0x72A5FF),
        isLightFill: false)
    static let meat = CategoryPalette(
        fill: Color(light: 0xF28A70, dark: 0xF5977F), onFill: Color(light: 0x43100A, dark: 0x43100A),
        soft: Color(light: 0xF9E9E5, dark: 0x493334), deep: Color(light: 0xA54633, dark: 0xF5977F),
        isLightFill: true)
    static let seafood = CategoryPalette(
        fill: Color(light: 0x0B7872, dark: 0x3CC7BC), onFill: Color(light: 0xFFFFFF, dark: 0x032A28),
        soft: Color(light: 0xDFEDED, dark: 0x243D40), deep: Color(light: 0x0C706B, dark: 0x3CC7BC),
        isLightFill: false)
    static let bakery = CategoryPalette(
        fill: Color(light: 0x9A5520, dark: 0xD99557), onFill: Color(light: 0xFFFFFF, dark: 0x2E1504),
        soft: Color(light: 0xF2E9E2, dark: 0x43332C), deep: Color(light: 0x955320, dark: 0xDB995E),
        isLightFill: false)
    static let frozen = CategoryPalette(
        fill: Color(light: 0xA8DDF4, dark: 0x8FD3F2), onFill: Color(light: 0x0A3346, dark: 0x0A3346),
        soft: Color(light: 0xE4EFF5, dark: 0x353F4B), deep: Color(light: 0x296C8F, dark: 0x8FD3F2),
        isLightFill: true)
    static let grains = CategoryPalette(
        fill: Color(light: 0xE4C487, dark: 0xDDBB78), onFill: Color(light: 0x3F2C05, dark: 0x3F2C05),
        soft: Color(light: 0xF4EEE2, dark: 0x443A32), deep: Color(light: 0x82611E, dark: 0xDDBB78),
        isLightFill: true)
    static let condiments = CategoryPalette(
        fill: Color(light: 0x5F6E17, dark: 0xB5C74A), onFill: Color(light: 0xFFFFFF, dark: 0x1E2404),
        soft: Color(light: 0xEAECE1, dark: 0x3C3D29), deep: Color(light: 0x5C6B17, dark: 0xB5C74A),
        isLightFill: false)
    static let beverages = CategoryPalette(
        fill: Color(light: 0x7338B5, dark: 0xB98CF2), onFill: Color(light: 0xFFFFFF, dark: 0x22083F),
        soft: Color(light: 0xEDE5F5, dark: 0x3D314B), deep: Color(light: 0x7338B5, dark: 0xBD93F3),
        isLightFill: false)
    static let snacks = CategoryPalette(
        fill: Color(light: 0xF7A03A, dark: 0xF5A84E), onFill: Color(light: 0x3A1800, dark: 0x3A1800),
        soft: Color(light: 0xFAEDE1, dark: 0x49362A), deep: Color(light: 0x97561B, dark: 0xF5A84E),
        isLightFill: true)
    static let other = CategoryPalette(
        fill: Color(light: 0x5E666D, dark: 0xA7B0B8), onFill: Color(light: 0xFFFFFF, dark: 0x15181B),
        soft: Color(light: 0xEAEBEC, dark: 0x39383F), deep: Color(light: 0x5D646B, dark: 0xA7B0B8),
        isLightFill: false)
}

extension StorageLocation {
    /// Guarded SF Symbol name (§5.2). The model's own `symbol` is unchanged.
    var glyph: String {
        switch self {
        case .fridge: return Theme.symbol("refrigerator.fill", fallback: "square.fill")
        case .freezer: return Theme.symbol("snowflake", fallback: "snowflake")
        case .pantry: return Theme.symbol("cabinet.fill", fallback: "archivebox.fill")
        }
    }
}

extension PantryItem {
    var foodCategory: FoodCategory { FoodCategory(category: category, name: name) }
    var inFreezer: Bool { location == .freezer }
}

extension Recipe {
    /// `FoodCategory.lead` over non-optional ingredient names, in recipe order.
    func leadCategory(staples: [String]) -> FoodCategory {
        let names = sortedIngredients.filter { !$0.isOptional }.map { $0.name }
        return FoodCategory.lead(ingredients: names, staples: staples)
    }
}

// MARK: - CategoryTile

/// A rounded square with the category glyph. Always decorative.
struct CategoryTile: View {
    /// 28 / 40 / 56 / 64pt; radius 8 / 11 / 16 / 18.
    enum Size { case small, row, large, xlarge }
    enum Style { case soft, crate }

    let category: FoodCategory
    var size: Size = .row
    var style: Style = .soft

    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1
    @Environment(\.colorScheme) private var colorScheme

    init(_ category: FoodCategory, size: Size = .row, style: Style = .soft) {
        self.category = category
        self.size = size
        self.style = style
    }

    var body: some View {
        let factor = min(scale, 1.5)
        let side = size.baseSide * factor
        let shape = RoundedRectangle(cornerRadius: size.baseRadius * factor, style: .continuous)
        let palette = category.palette
        let isCrate = style == .crate
        ZStack {
            shape.fill(isCrate ? palette.fill : palette.soft)
            if isCrate && palette.isLightFill && colorScheme == .light {
                shape.strokeBorder(Theme.Colors.tapeEdge, lineWidth: 0.5)
            }
            Image(systemName: category.symbol)
                .font(.system(size: side * 0.45, weight: .semibold))
                .foregroundStyle(isCrate ? palette.onFill : palette.deep)
                .contentTransition(.symbolEffect(.replace))
        }
        .frame(width: side, height: side)
        .accessibilityHidden(true)
    }
}

extension CategoryTile.Size {
    fileprivate var baseSide: CGFloat {
        switch self {
        case .small: return 28
        case .row: return 40
        case .large: return 56
        case .xlarge: return 64
        }
    }

    fileprivate var baseRadius: CGFloat {
        switch self {
        case .small: return Theme.Radius.tileSmall
        case .row: return Theme.Radius.tile
        case .large: return Theme.Radius.tileLarge
        case .xlarge: return Theme.Radius.tileXL
        }
    }
}

// MARK: - TileFan

/// Up to 3 crate tiles fanned out, overlapping left to right. Decorative.
struct TileFan: View {
    let categories: [FoodCategory]
    var size: CategoryTile.Size = .xlarge

    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1

    init(_ categories: [FoodCategory], size: CategoryTile.Size = .xlarge) {
        self.categories = categories
        self.size = size
    }

    private static let rotations: [Double] = [-8, 4, 12]

    var body: some View {
        let shown = Array(categories.prefix(3))
        let side = size.baseSide * min(scale, 1.5)
        // Each tile starts 0.69 × side after the previous one.
        HStack(spacing: side * 0.69 - side) {
            ForEach(shown.indices, id: \.self) { index in
                CategoryTile(shown[index], size: size, style: .crate)
                    .rotationEffect(.degrees(Self.rotations[index % Self.rotations.count]))
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - FoodRow

/// The standard inventory row content. The screen adds the Button, swipes and context menu.
struct FoodRow: View {
    let name: String
    let detail: String
    let category: FoodCategory
    let status: ExpiryStatus
    var location: StorageLocation? = nil
    var estimated: Bool = false
    var isDimmed: Bool = false
    var rawText: String? = nil

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(name: String, detail: String, category: FoodCategory, status: ExpiryStatus,
         location: StorageLocation? = nil, estimated: Bool = false, isDimmed: Bool = false,
         rawText: String? = nil) {
        self.name = name
        self.detail = detail
        self.category = category
        self.status = status
        self.location = location
        self.estimated = estimated
        self.isDimmed = isDimmed
        self.rawText = rawText
    }

    var body: some View {
        let isAX = dynamicTypeSize.isAccessibilitySize
        let layout = isAX
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 0))
        HStack(spacing: 12) {
            CategoryTile(category, size: .row, style: .soft)
                .opacity(isDimmed ? 0.5 : 1)
            layout {
                textStack
                if !isDimmed {
                    if !isAX {
                        Spacer(minLength: 8)
                    }
                    FreshnessTag(status: status, location: location, estimated: estimated)
                }
            }
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: Theme.Metrics.foodRowMin, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel(spokenName)
        .accessibilityValue(spokenStatus)
    }

    private var textStack: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(name)
                .font(Theme.Fonts.rowTitle)
                .foregroundStyle(isDimmed ? Theme.Colors.text2 : Theme.Colors.ink)
                .lineLimit(2)
            if let rawText, !rawText.isEmpty {
                Text(rawText)
                    .font(Theme.Fonts.mono)
                    .foregroundStyle(Theme.Colors.text3)
                    .lineLimit(1)
            }
            if !detail.isEmpty {
                Text(detail)
                    .font(Theme.Fonts.detail)
                    .foregroundStyle(Theme.Colors.text2)
            }
        }
        .multilineTextAlignment(.leading)
        .alignmentGuide(.listRowSeparatorLeading) { d in d[.leading] }
    }

    private var spokenName: String {
        [name, detail, category.title].filter { !$0.isEmpty }.joined(separator: ", ")
    }

    private var spokenStatus: String {
        (estimated ? "About: " : "") + status.spokenLabel(inFreezer: location == .freezer)
    }
}

// MARK: - FoodChip

/// Use-soon chip on Tonight and the Chef empty state.
struct FoodChip: View {
    let name: String
    let category: FoodCategory
    let status: ExpiryStatus
    var location: StorageLocation? = nil

    init(name: String, category: FoodCategory, status: ExpiryStatus, location: StorageLocation? = nil) {
        self.name = name
        self.category = category
        self.status = status
        self.location = location
    }

    var body: some View {
        HStack(spacing: 8) {
            CategoryTile(category, size: .small, style: .soft)
            Text(name)
                .font(Theme.Fonts.detailStrong)
                .foregroundStyle(Theme.Colors.ink)
                .lineLimit(1)
            FreshnessTag(status: status, location: location, size: .small)
        }
        .padding(.leading, 6)
        .padding(.trailing, 12)
        .padding(.vertical, 6)
        .frame(minHeight: Theme.Metrics.minTap)
        .background(Theme.Colors.surface, in: Capsule())
        .contentShape(Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spokenLabel)
    }

    /// "Chicken breast, expires today"
    private var spokenLabel: String {
        name + ", " + status.spokenLabel(inFreezer: location == .freezer).lowercased()
    }
}
