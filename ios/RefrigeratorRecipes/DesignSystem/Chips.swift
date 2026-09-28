import SwiftUI

// Chips and the horizontal chip picker (DESIGN.md §7.6).
// Any `ChipPicker` can be swapped back to `Picker(label, selection:) { … }.pickerStyle(.segmented)`.

/// A capsule chip: about 36pt tall visually, with a 44pt hit area.
struct Chip: View {
    let title: String
    var systemImage: String? = nil
    var count: Int? = nil
    let isSelected: Bool
    var customAccessibilityLabel: String? = nil
    let action: () -> Void

    init(_ title: String, systemImage: String? = nil, count: Int? = nil,
         isSelected: Bool, accessibilityLabel: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.count = count
        self.isSelected = isSelected
        self.customAccessibilityLabel = accessibilityLabel
        self.action = action
    }

    private static let selectedFont = Font.system(.subheadline, weight: .bold)

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .imageScale(.small)
                }
                Text(title)
                if let count {
                    Text("\(count)")
                        .font(Theme.Fonts.tag)
                        .contentTransition(.numericText())
                }
            }
            .font(isSelected ? Self.selectedFont : Theme.Fonts.chip)
            .foregroundStyle(isSelected ? Theme.Colors.onBeet : Theme.Colors.ink)
            .lineLimit(1)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Theme.Colors.beet : Theme.Colors.fill, in: Capsule())
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(spokenLabel)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var spokenLabel: String {
        if let customAccessibilityLabel { return customAccessibilityLabel }
        if let count { return "\(title), \(count)" }
        return title
    }
}

struct ChipOption<Value: Hashable>: Identifiable {
    let value: Value
    let title: String
    var systemImage: String? = nil
    var count: Int? = nil
    var accessibilityLabel: String? = nil

    var id: Value { value }

    init(_ value: Value, _ title: String, systemImage: String? = nil, count: Int? = nil,
         accessibilityLabel: String? = nil) {
        self.value = value
        self.title = title
        self.systemImage = systemImage
        self.count = count
        self.accessibilityLabel = accessibilityLabel
    }
}

/// Single selection from a horizontally scrolling row of chips.
/// Inside a List row, use `.listRowInsets(EdgeInsets())` and `.listRowBackground(Color.clear)`.
struct ChipPicker<Value: Hashable>: View {
    let label: String
    @Binding var selection: Value
    let options: [ChipOption<Value>]
    var contentInset: CGFloat = Theme.Space.gutter

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(_ label: String, selection: Binding<Value>, options: [ChipOption<Value>],
         contentInset: CGFloat = Theme.Space.gutter) {
        self.label = label
        self._selection = selection
        self.options = options
        self.contentInset = contentInset
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options) { option in
                    Chip(option.title,
                         systemImage: option.systemImage,
                         count: option.count,
                         isSelected: option.value == selection,
                         accessibilityLabel: option.accessibilityLabel) {
                        select(option.value)
                    }
                }
            }
            .padding(.horizontal, contentInset)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
        .sensoryFeedback(.selection, trigger: selection)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    private func select(_ value: Value) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            selection = value
        }
    }
}
