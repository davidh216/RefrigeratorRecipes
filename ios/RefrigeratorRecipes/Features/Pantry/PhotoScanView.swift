import SwiftUI
import SwiftData
import PhotosUI

/// Photograph groceries (or a receipt), let Claude list them, review, then add.
struct PhotoScanView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var pickerItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var image: UIImage?
    @State private var results: [ScannedGrocery] = []
    @State private var selected: Set<UUID> = []
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if let image {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 220)
                            .frame(maxWidth: .infinity)
                    }
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button { showCamera = true } label: { Label("Take photo", systemImage: "camera") }
                    }
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label("Choose from library", systemImage: "photo")
                    }
                } footer: {
                    Text("Works with fridge shelves and grocery bags. For receipts, use Scan receipt. The photo is sent to Claude to identify items.")
                }

                if isWorking {
                    Section { HStack { ProgressView(); Text("Identifying groceries…").foregroundStyle(.secondary) } }
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }

                if !results.isEmpty {
                    Section("Found \(results.count) items") {
                        ForEach(results) { item in
                            Button { toggle(item) } label: {
                                HStack {
                                    Image(systemName: selected.contains(item.id) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selected.contains(item.id) ? Color.accentColor : .secondary)
                                    VStack(alignment: .leading) {
                                        Text(item.name).foregroundStyle(.primary)
                                        Text("\(item.location.capitalized) · keeps ~\(item.shelf_life_days)d")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Photo of groceries")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add \(selected.count)") { addSelected() }
                        .disabled(selected.isEmpty)
                }
            }
            .onChange(of: pickerItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self), let picked = UIImage(data: data) {
                        await analyze(picked)
                    }
                }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { captured in
                    showCamera = false
                    if let captured { Task { await analyze(captured) } }
                }
                .ignoresSafeArea()
            }
        }
    }

    private func toggle(_ item: ScannedGrocery) {
        if selected.contains(item.id) { selected.remove(item.id) } else { selected.insert(item.id) }
    }

    private func analyze(_ picked: UIImage) async {
        image = picked
        results = []
        selected = []
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }
        do {
            guard let jpeg = picked.resized(maxDimension: 1568).jpegData(compressionQuality: 0.8) else { return }
            let client = try ClaudeClient.fromSettings()
            let found = try await client.identifyGroceries(jpegData: jpeg)
            results = found
            selected = Set(found.map(\.id))
            if found.isEmpty { errorMessage = "No groceries recognized. Try a closer, well-lit photo." }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func addSelected() {
        let calendar = Calendar.current
        for item in results where selected.contains(item.id) {
            let expires = item.shelf_life_days > 0
                ? calendar.date(byAdding: .day, value: item.shelf_life_days, to: calendar.startOfDay(for: .now))
                : nil
            context.insert(PantryItem(
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                location: StorageLocation(rawValue: item.location) ?? .fridge,
                category: item.category,
                expiresAt: expires
            ))
        }
        dismiss()
    }
}

struct CameraPicker: UIViewControllerRepresentable {
    let onFinish: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onFinish: (UIImage?) -> Void
        init(onFinish: @escaping (UIImage?) -> Void) { self.onFinish = onFinish }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            onFinish(info[.originalImage] as? UIImage)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onFinish(nil)
        }
    }
}

extension UIImage {
    /// Downscales so the longest side is at most `maxDimension` points (Claude's
    /// vision input is resized to about this size anyway).
    func resized(maxDimension: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        guard longest > maxDimension else { return self }
        let scale = maxDimension / longest
        let target = CGSize(width: size.width * scale, height: size.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
