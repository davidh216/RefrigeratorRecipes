import Foundation

/// Looks up a scanned barcode in Open Food Facts (free, no API key).
enum ProductLookup {
    struct Product {
        var name: String
        var brand: String?
        var category: String?
        var quantityText: String?
    }

    static func lookup(barcode: String) async throws -> Product? {
        guard let url = URL(string: "https://world.openfoodfacts.org/api/v2/product/\(barcode).json?fields=product_name,brands,categories_tags,quantity") else {
            return nil
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        // Open Food Facts asks clients to identify themselves.
        request.setValue("RefrigeratorRecipes-iOS/1.0 (personal use)", forHTTPHeaderField: "User-Agent")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(Response.self, from: data)
        guard response.status == 1, let product = response.product,
              let name = product.product_name, !name.isEmpty else { return nil }

        let category = product.categories_tags?
            .first { $0.hasPrefix("en:") }
            .map { $0.dropFirst(3).replacingOccurrences(of: "-", with: " ") }
        let brand = product.brands?.split(separator: ",").first.map { $0.trimmingCharacters(in: .whitespaces) }
        return Product(name: name, brand: brand, category: category, quantityText: product.quantity)
    }

    private struct Response: Decodable {
        struct Item: Decodable {
            let product_name: String?
            let brands: String?
            let categories_tags: [String]?
            let quantity: String?
        }
        let status: Int
        let product: Item?
    }
}
