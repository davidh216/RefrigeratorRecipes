import Foundation
import FridgeCore

/// Calls the Claude Messages API directly over HTTPS.
///
/// There is no official Swift SDK, so this uses the documented REST shape:
/// `POST /v1/messages` with `x-api-key` and `anthropic-version` headers.
///
/// With a personal API key (Settings, kept in the Keychain) it calls Anthropic directly.
/// Without one, builds that were given a server (see `server/`) go through it instead:
/// the server holds the key and gives each install a daily allowance.
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
            case .http(401, let message), .http(429, let message), .http(403, let message), .http(502, let message), .http(503, let message): return message
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

    enum Transport {
        /// The user's own key, straight to Anthropic.
        case direct(apiKey: String)
        /// The app's shared server; it picks the model and counts requests per install.
        case shared(SharedServer)
    }

    var transport: Transport
    var model: String

    static func fromSettings() throws -> ClaudeClient {
        let model = UserDefaults.standard.string(forKey: SettingsKey.claudeModel) ?? SettingsDefault.claudeModel
        if let key = KeychainStore.read(KeychainStore.anthropicAccount), !key.isEmpty {
            return ClaudeClient(transport: .direct(apiKey: key), model: model.isEmpty ? SettingsDefault.claudeModel : model)
        }
        if let server = SharedServer.configured {
            return ClaudeClient(transport: .shared(server), model: SettingsDefault.claudeModel)
        }
        throw ClientError.missingKey
    }

    /// Whether AI features can run: a personal key, or a build that includes the shared server.
    static var isAvailable: Bool {
        KeychainStore.read(KeychainStore.anthropicAccount)?.isEmpty == false || SharedServer.configured != nil
    }

    // MARK: - High-level calls

    /// Free-form cooking conversation grounded in the user's kitchen.
    /// `mood` is a mood tag id ("feeling-spicy") the user picked, if any.
    func chat(history: [ChatTurn], kitchenContext: String, mood: String? = nil, cuisine: String? = nil) async throws -> String {
        let messages: [[String: Any]] = history.map { ["role": $0.role.rawValue, "content": $0.text] }
        return try await send(
            system: Prompts.chefSystem + Prompts.mood(mood) + Prompts.cuisine(cuisine) + Prompts.language() + "\n\n" + kitchenContext,
            messages: messages,
            outputSchema: nil
        )
    }

    /// Produces a structured recipe, either invented from the kitchen context or
    /// extracted from pasted text.
    func generateRecipe(request: String, kitchenContext: String, mood: String? = nil, cuisine: String? = nil) async throws -> GeneratedRecipe {
        let text = try await send(
            system: Prompts.recipeSystem + Prompts.mood(mood) + Prompts.cuisine(cuisine) + Prompts.units() + Prompts.language()
                + "\n\n" + kitchenContext,
            messages: [["role": "user", "content": request]],
            outputSchema: GeneratedRecipe.jsonSchema
        )
        return try decode(GeneratedRecipe.self, from: text)
    }

    /// Turns what we could read from a link or a video (page text, caption, transcript,
    /// frames) into a recipe, saying whether it was stated or had to be reconstructed.
    func importRecipe(source: String, frames: [Data] = [], kitchenContext: String) async throws -> LinkRecipe {
        var content: [[String: Any]] = frames.map { frame in
            ["type": "image", "source": ["type": "base64", "media_type": "image/jpeg", "data": frame.base64EncodedString()]]
        }
        content.append(["type": "text", "text": source])
        let text = try await send(
            system: Prompts.linkSystem + Prompts.units() + Prompts.language(forImport: true) + "\n\n" + kitchenContext,
            messages: [["role": "user", "content": content]],
            outputSchema: LinkRecipe.jsonSchema
        )
        return try decode(LinkRecipe.self, from: text)
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
            outputSchema: ScannedGroceries.jsonSchema,
            tier: .light
        )
        return try decode(ScannedGroceries.self, from: text).items
    }

    /// Reads a grocery receipt (one or more photographed pages, top to bottom).
    func readReceipt(pages: [Data]) async throws -> ReceiptScan {
        var content: [[String: Any]] = pages.map { page in
            [
                "type": "image",
                "source": ["type": "base64", "media_type": "image/jpeg", "data": page.base64EncodedString()],
            ]
        }
        let today = ISO8601DateFormatter.string(from: .now, timeZone: .current, formatOptions: [.withFullDate])
        content.append(["type": "text", "text": Prompts.receiptInstruction(pageCount: pages.count, today: today)])
        let text = try await send(
            system: Prompts.receiptSystem,
            messages: [["role": "user", "content": content]],
            outputSchema: ReceiptScan.jsonSchema,
            tier: .light
        )
        return try decode(ReceiptScan.self, from: text)
    }

    /// Estimates nutrition for ingredients the built-in table doesn't know.
    /// `unit` is how the recipe measures it ("" = by the piece), so Claude can say how much one weighs.
    func estimateNutrition(ingredients: [(name: String, unit: String)]) async throws -> [NutritionGuess] {
        let list = ingredients.map { item in
            "- \(item.name) — measured " + (item.unit.isEmpty ? "by the piece" : "in \(item.unit)")
        }.joined(separator: "\n")
        let text = try await send(
            system: Prompts.nutritionSystem,
            messages: [["role": "user", "content": "Estimate nutrition for these recipe ingredients:\n" + list]],
            outputSchema: NutritionGuesses.jsonSchema,
            tier: .light
        )
        return try decode(NutritionGuesses.self, from: text).foods
    }

    // MARK: - Transport

    /// Which model a call needs. Reading photos and receipts and estimating nutrition are
    /// well-defined extraction jobs, so they use the smaller, cheaper model; conversation,
    /// recipe writing and import use the main one.
    enum Tier {
        case main, light
    }

    static let lightModel = "claude-haiku-4-5"

    private func send(system: String, messages: [[String: Any]], outputSchema: [String: Any]?,
                      tier: Tier = .main) async throws -> String {
        var body: [String: Any] = [
            "model": tier == .light ? Self.lightModel : model,
            "max_tokens": 16000,
            "system": system,
            "messages": messages,
        ]
        var outputConfig: [String: Any] = [:]
        if tier == .main {
            // Retry on a fallback model if a safety classifier declines. The light model
            // takes neither this nor an effort level.
            body["fallbacks"] = "default"
            outputConfig["effort"] = "medium"
        }
        if let outputSchema {
            outputConfig["format"] = ["type": "json_schema", "schema": outputSchema]
        }
        if !outputConfig.isEmpty { body["output_config"] = outputConfig }

        let bodyData = try JSONSerialization.data(withJSONObject: body)
        let data: Data
        let status: Int
        switch transport {
        case .direct(let apiKey):
            var request = URLRequest(url: Self.endpoint)
            request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
            request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
            if tier == .main {
                request.setValue("server-side-fallback-2026-07-01", forHTTPHeaderField: "anthropic-beta")
            }
            request.httpMethod = "POST"
            request.timeoutInterval = 180
            request.setValue("application/json", forHTTPHeaderField: "content-type")
            request.httpBody = bodyData
            let (responseData, response) = try await URLSession.shared.data(for: request)
            data = responseData
            status = (response as? HTTPURLResponse)?.statusCode ?? 0
        case .shared(let server):
            let (responseData, response) = try await server.send(path: "v1/messages", body: bodyData, timeout: 180)
            data = responseData
            status = response.statusCode
            if let remaining = response.value(forHTTPHeaderField: "x-fridge-remaining").flatMap(Int.init) {
                SharedServer.noteRemaining(remaining)
            }
        }
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
        /// The plain English name, for allergy checks and matching when `name` is in another language.
        var canonical_name: String? = nil
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
            // Only the app's own cuisine and tag ids (FridgeCore Cuisine and RecipeTag).
            "cuisine": ["type": "string", "enum": Cuisine.ids,
                        "description": "The closest cuisine; \"other\" if none fits."],
            "servings": ["type": "integer"],
            "prep_minutes": ["type": "integer"],
            "cook_minutes": ["type": "integer"],
            "tags": ["type": "array", "items": ["type": "string", "enum": RecipeTag.ids],
                     "description": "Meal (at least one), diet tags only if every ingredient fits, and a mood only if the dish truly fits it."],
            "ingredients": [
                "type": "array",
                "items": [
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["name", "quantity", "unit", "note", "optional", "canonical_name"],
                    "properties": [
                        "name": ["type": "string", "description": "Plain ingredient name, e.g. 'red onion', in the recipe's language."],
                        "canonical_name": ["type": "string", "description": "The same ingredient's plain English name, e.g. 'shrimp' for 'camarones'; identical to name when name is English."],
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

/// A recipe read from a link or video, with how much of it came from the source.
struct LinkRecipe: Codable, Equatable {
    var is_recipe: Bool
    var found_in_source: Bool
    var recipe: GeneratedRecipe

    static let jsonSchema: [String: Any] = [
        "type": "object",
        "additionalProperties": false,
        "required": ["is_recipe", "found_in_source", "recipe"],
        "properties": [
            "is_recipe": ["type": "boolean", "description": "false if the source isn't about a dish at all."],
            "found_in_source": ["type": "boolean", "description": "true if the ingredients and steps were stated in the source; false if you reconstructed a typical version from the dish name, visuals or partial info."],
            "recipe": GeneratedRecipe.jsonSchema,
        ],
    ]
}

struct NutritionGuess: Codable, Equatable {
    var name: String
    var kcal_per_100g: Double
    var protein_g: Double
    var carbs_g: Double
    var fat_g: Double
    var fiber_g: Double
    var grams_per_unit: Double
    var grams_per_cup: Double
}

struct NutritionGuesses: Codable, Equatable {
    var foods: [NutritionGuess]

    static let jsonSchema: [String: Any] = [
        "type": "object",
        "additionalProperties": false,
        "required": ["foods"],
        "properties": [
            "foods": [
                "type": "array",
                "items": [
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["name", "kcal_per_100g", "protein_g", "carbs_g", "fat_g", "fiber_g", "grams_per_unit", "grams_per_cup"],
                    "properties": [
                        "name": ["type": "string", "description": "The ingredient name exactly as given."],
                        "kcal_per_100g": ["type": "number"],
                        "protein_g": ["type": "number", "description": "Per 100 g."],
                        "carbs_g": ["type": "number", "description": "Per 100 g."],
                        "fat_g": ["type": "number", "description": "Per 100 g."],
                        "fiber_g": ["type": "number", "description": "Per 100 g."],
                        "grams_per_unit": ["type": "number", "description": "Grams in one of the unit it's measured in (one piece if by the piece). 0 if that unit is already a weight or volume."],
                        "grams_per_cup": ["type": "number", "description": "Grams per US cup, or 0 if it isn't measured by volume."],
                    ],
                ],
            ],
        ],
    ]
}

struct ReceiptScan: Codable, Equatable {
    struct Line: Codable, Equatable {
        var raw_text: String
        var name: String
        var quantity: Double
        var unit: String
        var price: Double
        var category: String
        var location: String
        var shelf_life_days: Int
        var is_food: Bool
    }

    var store: String
    /// "YYYY-MM-DD", or "" when the date isn't legible.
    var purchase_date: String
    var items: [Line]

    static let jsonSchema: [String: Any] = [
        "type": "object",
        "additionalProperties": false,
        "required": ["store", "purchase_date", "items"],
        "properties": [
            "store": ["type": "string", "description": "Store name, or empty if not shown."],
            "purchase_date": ["type": "string", "description": "Purchase date as YYYY-MM-DD, or empty if not legible."],
            "items": [
                "type": "array",
                "items": [
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["raw_text", "name", "quantity", "unit", "price", "category", "location", "shelf_life_days", "is_food"],
                    "properties": [
                        "raw_text": ["type": "string", "description": "The line exactly as printed."],
                        "name": ["type": "string", "description": "Plain grocery name a person would say, abbreviations expanded, no brand or size."],
                        "quantity": ["type": "number"],
                        "unit": ["type": "string", "description": "e.g. 'lb', 'oz', 'gal', 'dozen'; empty for countable items."],
                        "price": ["type": "number", "description": "Line total; 0 if not shown."],
                        "category": ["type": "string", "description": "produce, dairy, meat, seafood, bakery, frozen, grains, snacks, beverages, condiments, household..."],
                        "location": ["type": "string", "enum": ["fridge", "freezer", "pantry"]],
                        "shelf_life_days": ["type": "integer", "description": "Typical days from purchase until it spoils at that location; 0 if it effectively never does."],
                        "is_food": ["type": "boolean", "description": "false for non-food: household goods, toiletries, bags, deposits."],
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

    static let linkSystem = """
    You turn food content a user shared (a recipe web page, a video's title and caption, \
    a spoken transcript, or frames from a cooking video) into one complete, cookable recipe \
    as structured data. Faithfully keep the creator's ingredients, amounts and method when \
    they're given. Where amounts or steps are missing, fill them in with sensible, typical \
    values so the recipe works, and set found_in_source to false if you had to reconstruct \
    the core ingredients or method. Write the summary and steps in your own words. Use common \
    US kitchen units; keep ingredient names plain (preparation goes in the note). Respect the \
    household dietary needs below by noting substitutions in the summary, but keep the dish \
    itself faithful to the source. If the content isn't about a dish, set is_recipe to false \
    and return an empty recipe.
    """

    static let recipeSystem = """
    You write complete, cookable home recipes as structured data. If the user's \
    message contains an existing recipe (pasted text or a description of a dish they \
    were just discussing), faithfully extract that recipe. Otherwise create a new \
    recipe that makes good use of the kitchen contents listed below, especially \
    anything expiring soon. Use common US kitchen units. Keep ingredient names plain \
    (no quantities or preparation in the name; put preparation in the note). If the \
    request or the dish names calorie or protein numbers, size the ingredients so one \
    serving lands near them, and give every ingredient a measurable quantity so the app \
    can estimate nutrition.
    """

    /// "Reply in Spanish" when the app is in a language other than English (HANDOFF §4.1). JSON keys
    /// stay English, and recipes also carry English ingredient names for allergy checks and matching.
    /// An import keeps the creator's own language unless the app's is different and not English.
    static func language(forImport: Bool = false, appLanguage: String = AppLanguage.current) -> String {
        guard appLanguage != "en" else { return "" }
        let name = AppLanguage.englishName(appLanguage)
        if forImport {
            return "\n\nWrite the title, summary, ingredient names, notes and steps in \(name), translating if the source "
                + "is in another language. Keep canonical_name in plain English. JSON keys stay in English."
        }
        return "\n\nThe user's app is in \(name). Write everything the user reads in \(name). For recipes, keep "
            + "canonical_name in plain English and the JSON keys in English."
    }

    /// Metric or US units for new and imported recipes, from the units setting.
    static func units(_ system: UnitSystem = AppSettings.unitSystem) -> String {
        switch system {
        case .us: return ""
        case .metric: return "\n\nUse metric units (g, kg, ml, L, °C) instead of US cups, ounces and °F."
        }
    }

    /// What a mood means in a sentence fragment ("warm, rich, familiar food…"); also the intro on its Explore page.
    static func moodMeaning(_ id: String) -> String {
        switch id {
        case "comfort-food": return "warm, rich, familiar food, the bowl-on-the-couch dinner"
        case "feeling-spicy": return "real chili heat on purpose; say roughly how hot it is and how to make it milder"
        case "under-the-weather": return "food that's easy to make when feeling rough and soothing to eat: warm, brothy, few ingredients and little hands-on time"
        case "easy-to-stomach": return "gentle, plain food: no chili or hot spice, nothing deep-fried, no alcohol, and low in fat and fibre"
        case "cozy-night-in": return "slow, rewarding cooking that takes 45 minutes or more"
        case "light-and-fresh": return "bright, not heavy food, around 500 kcal a serving or less"
        case "hot-day": return "little or no stove: no-cook, grilled, or under 15 minutes of cooking"
        case "date-night": return "something a bit special that's still doable at home"
        case "lazy-sunday": return "brunch or relaxed big-batch weekend cooking"
        default: return RecipeTag.tag(id)?.name.lowercased() ?? id
        }
    }

    /// What each mood means, for the chef and recipe prompts. Empty when there's no mood.
    static func mood(_ id: String?) -> String {
        guard let id, let tag = RecipeTag.tag(id), tag.kind == .mood else { return "" }
        var line = "\n\nThe user is in the mood for \(tag.name.lowercased()): \(moodMeaning(id)). Suggest dishes that fit."
        if tag.isGentleMood {
            line += " Describe food as comforting or gentle. Never say it treats, cures, heals or boosts immunity, and don't give medical advice."
        }
        return line
    }

    /// The cuisine the user asked for (from a cuisine page), for the chef and recipe prompts.
    static func cuisine(_ id: String?) -> String {
        guard let id, let cuisine = Cuisine.cuisine(id), id != Cuisine.otherID else { return "" }
        return "\n\nThe user would like \(cuisine.name) food. Suggest dishes from that cuisine, written respectfully "
            + "and adapted for a US home kitchen, using what they have where possible; name any specialist ingredient "
            + "and where to find it, with a supermarket substitute."
    }

    static let scanSystem = """
    You identify groceries from photos of fridges, pantries, or shopping bags for a \
    kitchen inventory app. List each distinct food item you can \
    identify with reasonable confidence; skip non-food items and anything you can't \
    make out. Estimate quantity when visible (otherwise 1). Choose where the item \
    should be stored and estimate its typical shelf life in days from today.
    """

    static let scanInstruction = "What groceries are in this photo?"

    static let nutritionSystem = """
    You are a nutrition reference for a home cooking app. For each ingredient, give typical \
    values per 100 g of the ingredient as home cooks buy and use it (raw unless the name says \
    cooked, canned or dried), close to USDA FoodData Central. Also say how many grams one unit \
    weighs when it's measured by the piece or by a unit like "bunch" or "can". Return one entry \
    per ingredient, in the order given, with the name copied exactly.
    """

    static let receiptSystem = """
    You read grocery store receipts for a kitchen inventory app. Return one entry per \
    purchased product line, in the order printed. Receipts use heavy abbreviations \
    (e.g. "ORG BNLS SKNLS CHKN BRST" is chicken breast, "GRN ONION" is green onions, \
    "HNY CRSP APPL" is Honeycrisp apples); expand them into the plain grocery name a \
    person would say, in English, without brand or package size, even when the receipt is in another \
    language (raw_text keeps the original). Take quantities and weights from \
    the line or the line under it ("2 @ 1.99", "1.37 lb @ 3.49/lb"). Skip subtotals, \
    totals, tax, payment, savings and coupon lines, and loyalty messages. Keep \
    non-food products (paper towels, soap, bags, bottle deposits) but mark them \
    is_food false. If a line is unreadable, skip it rather than guess.
    """

    static func receiptInstruction(pageCount: Int, today: String) -> String {
        let pages = pageCount > 1 ? "These \(pageCount) images are consecutive parts of one receipt, top to bottom; don't list an item twice where the photos overlap. " : ""
        return pages + "Today is \(today). Read this receipt."
    }
}
