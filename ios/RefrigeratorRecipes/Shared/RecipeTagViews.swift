import SwiftUI
import FridgeCore

// Tags and moods from the FridgeCore vocabulary (RecipeTag), shown with their names and symbols.

extension RecipeTag {
    /// Guarded: a missing symbol renders blank with no build error (DESIGN.md §5.1).
    var safeSymbol: String { Theme.symbol(symbol, fallback: "tag") }
}

/// One recipe tag as a quiet `fill` capsule: the vocabulary name and symbol, or the text as typed
/// for a tag that isn't in the vocabulary (a user's own).
struct RecipeTagChip: View {
    let raw: String

    var body: some View {
        let tag = RecipeTag.id(for: raw).flatMap(RecipeTag.tag)
        HStack(spacing: 4) {
            if let tag {
                Image(systemName: tag.safeSymbol)
                    .imageScale(.small)
                    .accessibilityHidden(true)
            }
            Text(tag?.name ?? Self.clean(raw))
        }
        .font(Theme.Fonts.footnote.weight(.semibold))
        .foregroundStyle(Theme.Colors.text2)
        .lineLimit(1)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Theme.Colors.fill, in: Capsule())
    }

    /// The spoken or shown name for a raw tag.
    static func name(_ raw: String) -> String {
        RecipeTag.id(for: raw).flatMap(RecipeTag.tag)?.name ?? clean(raw)
    }

    static func clean(_ raw: String) -> String {
        var tag = raw.trimmingCharacters(in: .whitespaces)
        while tag.hasPrefix("#") { tag.removeFirst() }
        return tag
    }
}

/// "What are you in the mood for?" and a scrolling row of mood chips. Tapping the selected
/// mood again clears it. Bleeds to the screen edges from inside a gutter-padded stack, but its
/// own width never exceeds the container, so it can't make the page scroll sideways.
struct MoodChipRow: View {
    @Binding var selection: String?
    /// Recipes per mood, when known; moods with none are left out.
    var counts: [String: Int]? = nil
    var showsTitle = true

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var moods: [RecipeTag] {
        guard let counts else { return RecipeTag.moods }
        return RecipeTag.moods.filter { (counts[$0.id] ?? 0) > 0 || $0.id == selection }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            if showsTitle {
                Text("What are you in the mood for?")
                    .font(Theme.Fonts.detailStrong)
                    .foregroundStyle(Theme.Colors.text2)
                    .accessibilityAddTraits(.isHeader)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(moods) { mood in
                        Chip(mood.name, systemImage: mood.safeSymbol, isSelected: selection == mood.id,
                             accessibilityLabel: selection == mood.id ? "\(mood.name), tap to show all" : mood.name) {
                            toggle(mood.id)
                        }
                    }
                }
            }
            .contentMargins(.horizontal, Theme.Space.gutter, for: .scrollContent)
            .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
            .padding(.horizontal, -Theme.Space.gutter)
            .sensoryFeedback(.selection, trigger: selection)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Moods")
        }
    }

    private func toggle(_ id: String) {
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            selection = selection == id ? nil : id
        }
    }
}

/// Shown wherever the Under the weather or Easy to stomach moods are: comfort, not medical claims.
struct GentleMoodFooter: View {
    var body: some View {
        Text("Ideas for gentle, comforting meals. Not medical advice; follow your doctor's guidance.")
            .font(Theme.Fonts.footnote)
            .foregroundStyle(Theme.Colors.text3)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
