import SwiftUI
import UIKit

/// Hands a cooking question, with what's in the kitchen, to the ChatGPT or Claude app.
///
/// Consumer subscriptions (ChatGPT Plus, Claude Pro) can't be used from inside Fridge, but
/// people can take the question to the app they already pay for. It's one-way: the answer
/// stays in that app. The full prompt always goes on the clipboard too, because the apps
/// don't all fill in a question from a link, and long prompts don't fit in a link anyway.
enum AssistantHandoff {
    enum App: String, CaseIterable, Identifiable {
        case chatGPT, claude

        var id: String { rawValue }

        var title: String {
            switch self {
            case .chatGPT: "ChatGPT"
            case .claude: "Claude"
            }
        }

        /// Opens the app when it's installed (universal link), the website otherwise.
        func url(prefilling prompt: String?) -> URL? {
            var components: URLComponents?
            switch self {
            case .chatGPT: components = URLComponents(string: "https://chatgpt.com/")
            case .claude: components = URLComponents(string: "https://claude.ai/new")
            }
            if let prompt { components?.queryItems = [URLQueryItem(name: "q", value: prompt)] }
            return components?.url
        }
    }

    static let defaultQuestion = "What should I cook tonight with what I have? Use up anything that's expiring first."

    /// Prompts longer than this go by clipboard only; links this long get cut off or rejected.
    static let maxLinkLength = 3500

    static func prompt(question: String, kitchenContext: String) -> String {
        let asked = question.trimmingCharacters(in: .whitespacesAndNewlines)
        return """
        I'm planning meals for my household. Here's what's in my kitchen right now, from my Fridge app:

        \(kitchenContext)

        My question: \(asked.isEmpty ? defaultQuestion : asked)
        """
    }

    /// Copies the prompt, then opens the app with it filled in when it's short enough.
    static func send(_ prompt: String, to app: App, openURL: OpenURLAction) {
        UIPasteboard.general.string = prompt
        let prefill = prompt.count <= maxLinkLength ? prompt : nil
        if let url = app.url(prefilling: prefill) ?? app.url(prefilling: nil) {
            openURL(url)
        }
    }

    static func copy(_ prompt: String) {
        UIPasteboard.general.string = prompt
    }
}

extension View {
    /// The "Ask another AI" chooser: ChatGPT, Claude, or copy the prompt for any other app.
    func assistantHandoffDialog(isPresented: Binding<Bool>, prompt: @escaping () -> String,
                                openURL: OpenURLAction) -> some View {
        confirmationDialog("Ask another AI", isPresented: isPresented, titleVisibility: .visible) {
            ForEach(AssistantHandoff.App.allCases) { app in
                Button("Open in \(app.title)") { AssistantHandoff.send(prompt(), to: app, openURL: openURL) }
            }
            Button("Copy question and kitchen") { AssistantHandoff.copy(prompt()) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Sends your question and what's in your kitchen to an AI app you already use. It's also copied, so paste it if the app opens empty. Answers stay in that app.")
        }
    }
}
