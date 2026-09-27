import Foundation

/// A stocked item that a recipe would use up before it goes bad.
public struct RescueItem: Equatable, Sendable {
    public var name: String
    public var status: ExpiryStatus

    public init(name: String, status: ExpiryStatus) {
        self.name = name
        self.status = status
    }
}

public enum Rescue {
    /// Stock that is `.expiringSoon` and matches a non-optional requirement, most urgent first,
    /// de-duplicated by normalized name. Expired food is excluded (it can't be rescued).
    public static func items(
        requirements: [IngredientRequirement],
        stock: [StockItem],
        now: Date = .now,
        soonThresholdDays: Int = 3,
        calendar: Calendar = .current
    ) -> [RescueItem] {
        let required = requirements.filter { !$0.isOptional }
        guard !required.isEmpty else { return [] }

        var candidates: [(index: Int, item: RescueItem)] = []
        for (index, stockItem) in stock.enumerated() {
            let status = ExpiryStatus.of(
                expiresAt: stockItem.expiresAt, now: now,
                soonThresholdDays: soonThresholdDays, calendar: calendar
            )
            guard case .expiringSoon = status else { continue }
            guard required.contains(where: { IngredientName.matches(stockItem.name, $0.name) }) else { continue }
            candidates.append((index, RescueItem(name: stockItem.name, status: status)))
        }

        // Most urgent first; ties keep stock order.
        candidates.sort { a, b in
            if a.item.status.urgency != b.item.status.urgency {
                return a.item.status.urgency < b.item.status.urgency
            }
            return a.index < b.index
        }

        var seen = Set<String>()
        var result: [RescueItem] = []
        for candidate in candidates {
            let key = IngredientName.normalize(candidate.item.name)
            if seen.contains(key) { continue }
            seen.insert(key)
            result.append(candidate.item)
        }
        return result
    }
}
