import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// "Share → Fridge" from TikTok, YouTube, Instagram, Safari…
///
/// An extension can't open its app, so this leaves the link in a Keychain item the app
/// shares with it (a keychain access group needs no setup in the developer portal).
/// Fridge picks it up the next time it comes to the front and opens the importer.
@objc(ShareViewController)
final class ShareViewController: UIViewController {
    private let model = ShareModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        let host = UIHostingController(rootView: ShareView(model: model) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        })
        addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        host.didMove(toParent: self)

        let items = extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem } ?? []
        Task { await model.receive(items) }
    }
}

@MainActor
final class ShareModel: ObservableObject {
    enum State { case reading, saved(URL), noLink }
    @Published var state: State = .reading

    func receive(_ items: [NSExtensionItem]) async {
        let link = await Self.firstLink(in: items)
        if let link {
            SharedInbox.put(link)
            state = .saved(link)
        } else {
            state = .noLink
        }
    }

    /// Links first, then any text that contains one (TikTok and Instagram share "caption + link").
    private static func firstLink(in items: [NSExtensionItem]) async -> URL? {
        let providers = items.flatMap { $0.attachments ?? [] }
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            if let url = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL,
               url.scheme == "http" || url.scheme == "https" {
                return url
            }
        }
        var texts = items.compactMap { $0.attributedContentText?.string }
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                texts.append(text)
            }
        }
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        for text in texts {
            let range = NSRange(text.startIndex..., in: text)
            if let url = detector?.matches(in: text, range: range).compactMap(\.url)
                .first(where: { $0.scheme == "http" || $0.scheme == "https" }) {
                return url
            }
        }
        return nil
    }
}

struct ShareView: View {
    @ObservedObject var model: ShareModel
    var done: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                switch model.state {
                case .reading:
                    ProgressView()
                case .saved(let url):
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)
                    Text("Sent to Fridge")
                        .font(.title3.weight(.semibold))
                    Text("Open Fridge to finish importing the recipe.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Text(url.host ?? url.absoluteString)
                        .font(.footnote)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                case .noLink:
                    Image(systemName: "link.badge.plus")
                        .font(.system(size: 44))
                        .foregroundStyle(.secondary)
                    Text("No link to import")
                        .font(.title3.weight(.semibold))
                    Text("Share a recipe page or a TikTok, YouTube or Instagram post.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Fridge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: done)
                }
            }
        }
    }
}
