import Foundation

/// One line item as read from a grocery receipt.
public struct ReceiptLine: Equatable, Sendable {
    public var rawText: String
    public var name: String
    public var quantity: Double
    public var unit: String
    /// Line total in the receipt's currency; 0 when unknown.
    public var price: Double
    public var category: String
    /// "fridge", "freezer" or "pantry".
    public var location: String
    /// Days from purchase until it typically spoils; 0 means it effectively doesn't.
    public var shelfLifeDays: Int
    public var isFood: Bool

    public init(
        rawText: String = "",
        name: String,
        quantity: Double = 1,
        unit: String = "",
        price: Double = 0,
        category: String = "",
        location: String = "fridge",
        shelfLifeDays: Int = 0,
        isFood: Bool = true
    ) {
        self.rawText = rawText
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.price = price
        self.category = category
        self.location = location
        self.shelfLifeDays = shelfLifeDays
        self.isFood = isFood
    }
}

/// A receipt line turned into something ready to put in the pantry.
public struct ReceiptItem: Equatable, Sendable {
    public var name: String
    public var quantity: Double
    public var unit: String
    public var price: Double?
    public var category: String
    public var location: String
    /// nil for items that don't meaningfully expire.
    public var shelfLifeDays: Int?
    /// Receipt lines this item was built from (duplicates are merged).
    public var rawLines: [String]

    public func expiresAt(purchasedAt: Date, calendar: Calendar = .current) -> Date? {
        guard let shelfLifeDays else { return nil }
        return calendar.date(byAdding: .day, value: shelfLifeDays, to: calendar.startOfDay(for: purchasedAt))
    }
}

public enum ReceiptImport {
    /// Keeps food lines, cleans them up, and merges repeated scans of the same
    /// product (e.g. two separate "BANANAS" lines) into one item.
    public static func items(from lines: [ReceiptLine]) -> [ReceiptItem] {
        struct Key: Hashable { let name: String; let unit: String; let location: String }
        var order: [Key] = []
        var merged: [Key: ReceiptItem] = [:]

        for line in lines where line.isFood {
            let name = line.name.trimmingCharacters(in: .whitespacesAndNewlines)
            let normalized = IngredientName.normalize(name)
            guard !normalized.isEmpty else { continue }
            let location = ["fridge", "freezer", "pantry"].contains(line.location) ? line.location : "fridge"
            let unit = line.unit.trimmingCharacters(in: .whitespaces)
            let quantity = line.quantity > 0 ? line.quantity : 1
            let shelfLife = line.shelfLifeDays > 0 ? line.shelfLifeDays : nil
            let key = Key(name: normalized, unit: unit.lowercased(), location: location)

            if var existing = merged[key] {
                existing.quantity += quantity
                if line.price > 0 { existing.price = (existing.price ?? 0) + line.price }
                // Keep the more conservative (shorter) estimate.
                if let shelfLife { existing.shelfLifeDays = min(existing.shelfLifeDays ?? shelfLife, shelfLife) }
                if !line.rawText.isEmpty { existing.rawLines.append(line.rawText) }
                merged[key] = existing
            } else {
                order.append(key)
                merged[key] = ReceiptItem(
                    name: name.prefix(1).uppercased() + name.dropFirst(),
                    quantity: quantity,
                    unit: unit,
                    price: line.price > 0 ? line.price : nil,
                    category: line.category,
                    location: location,
                    shelfLifeDays: shelfLife,
                    rawLines: line.rawText.isEmpty ? [] : [line.rawText]
                )
            }
        }
        return order.compactMap { merged[$0] }
    }

    /// The purchase date printed on the receipt, if it is plausible; otherwise `now`.
    /// Accepts "yyyy-MM-dd". Dates in the future or more than 60 days old are rejected
    /// as misreads.
    public static func purchaseDate(from text: String?, now: Date = .now, calendar: Calendar = .current) -> Date {
        guard let text, !text.isEmpty else { return now }
        let parts = text.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let date = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])) else { return now }
        let today = calendar.startOfDay(for: now)
        let days = calendar.dateComponents([.day], from: date, to: today).day ?? 0
        return (0...60).contains(days) ? date : now
    }

    /// Indexes into `shoppingList` of entries covered by what was bought.
    public static func purchasedShoppingIndexes(purchased: [String], shoppingList: [String]) -> [Int] {
        shoppingList.indices.filter { index in
            purchased.contains { IngredientName.matches($0, shoppingList[index]) }
        }
    }
}
