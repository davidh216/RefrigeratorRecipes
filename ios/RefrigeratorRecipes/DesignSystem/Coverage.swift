import SwiftUI
import FridgeCore

// How much of a recipe you already have (DESIGN.md §7.4).

/// "Ready" when you can cook it now, otherwise a have-meter and "5/7".
struct CoverageBadge: View {
    let match: RecipeMatch

    init(match: RecipeMatch) {
        self.match = match
    }

    var body: some View {
        content
            .fixedSize()
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(spokenLabel)
    }

    @ViewBuilder
    private var content: some View {
        if match.canMake {
            HStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill")
                    .imageScale(.small)
                Text("Ready")
            }
            .font(Theme.Fonts.tag)
            .foregroundStyle(Theme.Colors.fresh)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Theme.Colors.freshSoft, in: Capsule())
        } else {
            HStack(spacing: 6) {
                CoverageMeter(have: match.have.count, total: match.requiredCount)
                Text("\(match.have.count)/\(match.requiredCount)")
                    .font(Theme.Fonts.tag)
            }
            .foregroundStyle(Theme.Colors.ink)
        }
    }

    private var spokenLabel: String {
        if match.canMake { return "Ready to cook, you have everything" }
        return "Have \(match.have.count) of \(match.requiredCount) ingredients"
    }
}

/// One segment per requirement (up to 12), otherwise a proportional bar. Decorative.
struct CoverageMeter: View {
    let have: Int
    let total: Int

    @ScaledMetric(relativeTo: .footnote) private var segmentWidth: CGFloat = 6
    @ScaledMetric(relativeTo: .footnote) private var segmentHeight: CGFloat = 12

    init(have: Int, total: Int) {
        self.have = have
        self.total = total
    }

    var body: some View {
        meter
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private var meter: some View {
        let count = max(total, 0)
        if count <= 12 {
            HStack(spacing: 2) {
                ForEach(0..<count, id: \.self) { index in
                    RoundedRectangle(cornerRadius: Theme.Radius.meter, style: .continuous)
                        .fill(index < have ? Theme.Colors.fresh : Theme.Colors.fillStrong)
                        .frame(width: min(segmentWidth, 9), height: min(segmentHeight, 18))
                }
            }
        } else {
            let fraction = CGFloat(min(max(have, 0), count)) / CGFloat(count)
            Capsule()
                .fill(Theme.Colors.fillStrong)
                .frame(width: 48, height: 6)
                .overlay(alignment: .leading) {
                    Capsule()
                        .fill(Theme.Colors.fresh)
                        .frame(width: 48 * fraction, height: 6)
                }
        }
    }
}
