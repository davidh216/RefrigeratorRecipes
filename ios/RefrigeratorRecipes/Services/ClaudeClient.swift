import Foundation

/// Calls the Claude Messages API directly over HTTPS.
///
/// There is no official Swift SDK, so this uses the documented REST shape:
/// `POST /v1/messages` with `x-api-key` and `anthropic-version` headers. The API
/// key is supplied by the user in Settings and kept in the Keychain; this is a
/// personal/household app, so there is no proxy server in between.
struct ClaudeClient {
    enum ClientError: LocalizedError {
        case missingKey
        case http(Int, String)
        case refused(String?)
        case truncated
        case emptyResponse
        case decoding(String)

        var errorDescription: String? {
            switch self {
            case .missingKey: return "Add your Anthropic API key in Settings to use the chef."
            case .http(let code, let message): return "Claude API error \(code): \(message)"
            case .refused(let why): return "Claude declined this request." + (why.map { " \($0)" } ?? "")
            case .truncated: return "The response was cut off. Try asking for something shorter."
            case .emptyResponse: return "Claude returned an empty response."
            case .decoding(let detail): return "Couldn't read Claude's response: \(detail)"
            }
        }
    }

    struct ChatTurn: Codable, Equatable {
        enum Role: String, Codable { case user, assistant }
        var role: Role
        var text: String
    }

    private static let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!

    var apiKey: String
    var model: String

    static func fromSettings() throws -> ClaudeClient {
        guard let key = KeychainStore.read(KeychainStore.anthropicAccount), !key.isEmpty else {
            throw ClientError.missingKey
        }
        let model = UserDefaults.standard.string(forKey: SettingsKey.claudeModel) ?? SettingsDefault.claudeModel
        return ClaudeClient(apiKey: key, model: model.isEmpty ? SettingsDefault.claudeModel : model)
    }

    // MARK: - High-level calls

    /// Free-form cooking conversation grounded in the user's kitchen.
    func chat(history: [ChatTurn], kitchenContext: String) async throws -> String {
        let messages: [[String: Any]] = history.map { ["role": $0.role.rawValue, "content": $0.text] }
        return try await send(
            system: Prompts.chefSystem + "\n\n" + kitchenContext,
            messages: messages,
            outputSchema: nil
        )
    }

    /// Produces a structured recipe, either invented from the kitchen context or
    /// extracted from pasted text.
    func generateRecipe(request: String, kitchenContext: String) async throws -> GeneratedRecipe {
        let text = try await send(
            system: Prompts.recipeSystem + "\n\n" + kitchenContext,
            messages: [["role": "user", "content": request]],
            outputSchema: GeneratedRecipe.jsonSchema
        )
        return try decode(GeneratedRecipe.self, from: text)
    }

    /// Identifies groceries in a photo (fridge shelf, receipt, shopping bag).
    func identifyGroceries(jpegData: Data) async throws -> [ScannedGrocery] {
        let content: [[String: Any]] = [
            [
                "type": "image",
                "source": [
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": jpegData.base64EncodedString(),
                ],
            ],
            ["type": "text", "text": Prompts.scanInstruction],
        ]
        let text = try await send(
            system: Prompts.scanSystem,
            messages: [["role": "user", "content": content]],
            outputSchema: ScannedGroceries.jsonSchema
        )
        return try decode(ScannedGroceries.self, from: text).items
    }

    // MARK: - Transport

    private func send(system: String, messages: [[String: Any]], outputSchema: [String: Any]?) async throws -> String {
        var body: [String: Any] = [
            "model": model,
            "max_tokens": 16000,
            "system": system,
            "messages": messages,
            // Retry on a fallback model if a safety classifier declines.
            "fallbacks": "default",
        ]
        var outputConfig: [String: Any] = ["effort": "medium"]
        if let outputSchema {
            outputConfig["format"] = ["type": "json_schema", "schema": outputSchema]
        }
        body["output_config"] = outputConfig

        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 180
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("server-side-fallback-2026-07-01", forHTTPHeaderField: "anthropic-beta")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else {
            throw ClientError.http(status, Self.errorMessage(from: data))
        }

        let decoded = try JSONDecoder().decode(MessageResponse.self, from: data)
        switch decoded.stop_reason {
        case "refusal": throw ClientError.refused(decoded.stop_details?.explanation)
        case "max_tokens": throw ClientError.truncated
        default: break
        }
        let text = decoded.content
            .filter { $0.type == "text" }
            .compactMap(\.text)
            .joined()
        guard !text.isEmpty else { throw ClientError.emptyResponse }
        return text
    }

    private func decode<T: Decodable>(_ type: T.Type, from text: String) throws -> T {
        do {
            return try JSONDecoder().decode(T.self, from: Data(text.utf8))
        } catch {
            throw ClientError.decoding(error.localizedDescription)
        }
    }

    private static func errorMessage(from data: Data) -> String {
        struct Envelope: Decodable { struct Inner: Decodable { let message: String }; let error: Inner }
        if let envelope = try? JSONDecoder().decode(Envelope.self, from: data) {
            return envelope.error.message
        }
        return String(data: data, encoding: .utf8) ?? "Unknown error"
    }

    // Only the fields this app reads.
    private struct MessageResponse: Decodable {
        struct Block: Decodable { let type: String; let text: String? }
        struct StopDetails: Decodable { let explanation: String? }
        let content: [Block]
        let stop_reason: String?
        let stop_details: StopDetails?
    }
}

// MARK: - Structured output types

struct GeneratedRecipe: Codable, Equatable {
    struct Ingredient: Codable, Equatable {
        var name: String
        var quantity: Double
        var unit: String
        var note: String
        var optional: Bool
    }

    var title: String
    var summary: String
    var cuisine: String
    var servings: Int
    var prep_minutes: Int
    var cook_minutes: Int
    var tags: [String]
    var ingredients: [Ingredient]
    var instructions: [String]

    static let jsonSchema: [String: Any] = [
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "summary", "cuisine", "servings", "prep_minutes", "cook_minutes", "tags", "ingredients", "instructions"],
        "properties": [
            "title": ["type": "string"],
            "summary": ["type": "string", "description": "One or two sentences."],
            "cuisine": ["type": "string"],
            "servings": ["type": "integer"],
            "prep_minutes": ["type": "integer"],
            "cook_minutes": ["type": "integer"],
            "tags": ["type": "array", "items": ["type": "string"]],
            "ingredients": [
                "type": "array",
                "items": [
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["name", "quantity", "unit", "note", "optional"],
                    "properties": [
                        "name": ["type": "string", "description": "Plain ingredient name, e.g. 'red onion'."],
                        "quantity": ["type": "number", "description": "0 if unmeasured."],
                        "unit": ["type": "string", "description": "e.g. 'cups', 'g', 'tbsp'; empty for countable items."],
                        "note": ["type": "string", "description": "Preparation note like 'diced'; may be empty."],
                        "optional": ["type": "boolean"],
                    ],
                ],
            ],
            "instructions": ["type": "array", "items": ["type": "string"], "description": "One step per entry."],
        ],
    ]
}

struct ScannedGrocery: Codable, Equatable, Identifiable {
    var id = UUID()
    var name: String
    var quantity: Double
    var unit: String
    var category: String
    var location: String
    var shelf_life_days: Int

    enum CodingKeys: String, CodingKey {
        case name, quantity, unit, category, location, shelf_life_days
    }
}

struct ScannedGroceries: Codable {
    var items: [ScannedGrocery]

    static let jsonSchema: [String: Any] = [
        "type": "object",
        "additionalProperties": false,
        "required": ["items"],
        "properties": [
            "items": [
                "type": "array",
                "items": [
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["name", "quantity", "unit", "category", "location", "shelf_life_days"],
                    "properties": [
                        "name": ["type": "string"],
                        "quantity": ["type": "number"],
                        "unit": ["type": "string"],
                        "category": ["type": "string", "description": "e.g. produce, dairy, meat, grains, condiments"],
                        "location": ["type": "string", "enum": ["fridge", "freezer", "pantry"]],
                        "shelf_life_days": ["type": "integer", "description": "Typical days until it spoils from today when stored at that location."],
                    ],
                ],
            ],
        ],
    ]
}

// MARK: - Prompts

enum Prompts {
    static let chefSystem = """
    You are the sous chef inside a household kitchen app. The user's current fridge, \
    freezer and pantry contents, their saved recipes, and this week's meal plan are \
    listed below. Suggest practical meals that use what they already have, and \
    prioritize items that are expired or expiring soon (but warn if something is \
    already past its date and may be unsafe). Keep answers short and skimmable on a \
    phone: a few sentences or a brief list. When you propose a dish, name it clearly \
    and list the main ingredients, noting which ones they would need to buy.
    """

    static let recipeSystem = """
    You write complete, cookable home recipes as structured data. If the user's \
    message contains an existing recipe (pasted text or a description of a dish they \
    were just discussing), faithfully extract that recipe. Otherwise create a new \
    recipe that makes good use of the kitchen contents listed below, especially \
    anything expiring soon. Use common US kitchen units. Keep ingredient names plain \
    (no quantities or preparation in the name; put preparation in the note).
    """

    static let scanSystem = """
    You identify groceries from photos of fridges, pantries, shopping bags, or \
    receipts for a kitchen inventory app. List each distinct food item you can \
    identify with reasonable confidence; skip non-food items and anything you can't \
    make out. Estimate quantity when visible (otherwise 1). Choose where the item \
    should be stored and estimate its typical shelf life in days from today.
    """

    static let scanInstruction = "What groceries are in this photo?"
}
