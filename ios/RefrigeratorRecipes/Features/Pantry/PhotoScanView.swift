import SwiftUI
import SwiftData
import PhotosUI
import FridgeCore

/// Photograph groceries (or a receipt), let Claude list them, review, then add.
struct PhotoScanView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @State private var pickerItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var image: UIImage?
    @State private var results: [ScannedGrocery] = []
    @State private var selected: Set<UUID> = []
    @State private var isWorking = false
    @State private var errorMessage: String?
    /// Result rows fade up into place once this flips on.
    @State private var rowsShown = false
    @State private var successTick = 0
    @State private var failureTick = 0

    private var cameraAvailable: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Photo of groceries")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                }
                .onChange(of: pickerItem) { _, newItem in
                    guard let newItem else { return }
                    Task {
                        if let data = try? await newItem.loadTransferable(type: Data.self), let picked = UIImage(data: data) {
                            // Clearing the selection lets the same photo be picked again later.
                            pickerItem = nil
                            await analyze(picked)
                        } else {
                            pickerItem = nil
                            errorMessage = "Couldn't open that photo. Try another one."
                            failureTick += 1
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
                .hapticSuccess(trigger: successTick)
                .sensoryFeedback(.error, trigger: failureTick)
        }
        .sheetChrome()
    }

    @ViewBuilder
    private var content: some View {
        if results.isEmpty {
            list
        } else {
            list
                .actionBar {
                    Button(action: addSelected) {
                        Label("Add \(selected.count) to Fridge", systemImage: StorageLocation.fridge.glyph)
                            .contentTransition(.numericText())
                    }
                    .buttonStyle(PrimaryButtonStyle(fullWidth: true))
                    .disabled(selected.isEmpty)
                }
                .task {
                    // Let the first rows lay out hidden, then bring them in.
                    try? await Task.sleep(for: .milliseconds(60))
                    rowsShown = true
                }
        }
    }

    private var list: some View {
        List {
            Section {
                if image == nil {
                    SheetLede(systemImage: "camera.viewfinder", text: "Snap a fridge shelf or a grocery bag.")
                        .photoClearRow()
                }
                if let image {
                    photoCard(image)
                        .photoClearRow()
                }
                if isWorking {
                    identifyingStatus
                        .photoClearRow()
                }
                if let errorMessage {
                    PhotoErrorCard(message: errorMessage)
                        .id(failureTick)
                        .photoClearRow()
                }
                if results.isEmpty && !isWorking {
                    choiceTiles
                        .photoClearRow()
                    Text("Works with fridge shelves and grocery bags. For receipts, use Scan receipt. The photo is sent to Claude to identify items.")
                        .font(Theme.Fonts.footnote)
                        .foregroundStyle(Theme.Colors.text3)
                        .fixedSize(horizontal: false, vertical: true)
                        .photoClearRow()
                }
            }

            if !results.isEmpty {
                Section {
                    ForEach(Array(results.enumerated()), id: \.element.id) { entry in
                        resultRow(entry.element, index: entry.offset)
                    }
                } header: {
                    SectionHeader("Found \(results.count) items")
                }
                .listRowBackground(Theme.Colors.surface)
                .listRowSeparatorTint(Theme.Colors.separator)

                Section {
                    retakeButtons
                        .photoClearRow()
                }
            }
        }
        .listChrome()
    }

    // MARK: - Choice

    /// Two big tiles side by side: camera (when there is one) and the photo library.
    private var choiceTiles: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: Theme.Space.s))
            : AnyLayout(HStackLayout(alignment: .top, spacing: Theme.Space.s))
        return layout {
            if cameraAvailable {
                Button { showCamera = true } label: {
                    PhotoChoiceTile(title: "Take photo", systemImage: "camera.fill")
                }
                .buttonStyle(PhotoTileButtonStyle())
            }
            PhotosPicker(selection: $pickerItem, matching: .images) {
                PhotoChoiceTile(title: "Choose from library", systemImage: "photo.on.rectangle")
            }
            .buttonStyle(PhotoTileButtonStyle())
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    /// After results, a quieter way to try another photo.
    private var retakeButtons: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Theme.Space.s) {
                retakeCamera
                retakeLibrary
            }
            VStack(spacing: Theme.Space.s) {
                retakeCamera
                retakeLibrary
            }
        }
    }

    @ViewBuilder
    private var retakeCamera: some View {
        if cameraAvailable {
            Button { showCamera = true } label: {
                Label("Take photo", systemImage: "camera.fill")
            }
            .buttonStyle(NeutralButtonStyle(size: .compact, fullWidth: true))
        }
    }

    private var retakeLibrary: some View {
        PhotosPicker(selection: $pickerItem, matching: .images) {
            Label("Choose from library", systemImage: "photo.on.rectangle")
        }
        .buttonStyle(NeutralButtonStyle(size: .compact, fullWidth: true))
    }

    // MARK: - Identifying

    /// The chosen photo, cropped to a card. The scan band sweeps it while Claude looks.
    private func photoCard(_ image: UIImage) -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        return Color.clear
            .frame(maxWidth: .infinity)
            .frame(height: isWorking ? 280 : 168)
            .overlay {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .accessibilityIgnoresInvertColors()
            }
            .overlay {
                if isWorking && !reduceMotion {
                    PhotoScanBand()
                }
            }
            .clipShape(shape)
            .background(Theme.Colors.fill, in: shape)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Selected photo")
            .accessibilityAddTraits(.isImage)
    }

    private var identifyingStatus: some View {
        HStack(spacing: Theme.Space.xs) {
            if reduceMotion {
                ProgressView()
                    .tint(Theme.Colors.plum)
            } else {
                Image(systemName: "sparkles")
                    .foregroundStyle(Theme.Colors.plumText)
                    .symbolEffect(.pulse)
                    .accessibilityHidden(true)
            }
            Text("Identifying groceries…")
                .foregroundStyle(Theme.Colors.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .font(Theme.Fonts.rowTitle)
        .padding(.vertical, Theme.Space.xxs)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Results

    private func resultRow(_ item: ScannedGrocery, index: Int) -> some View {
        let isOn = selected.contains(item.id)
        let location = StorageLocation(rawValue: item.location) ?? .fridge
        return HStack(spacing: Theme.Space.xs) {
            CheckToggle(
                isOn: selectionBinding(for: item.id),
                accessibilityLabel: "Add \(item.name)"
            )
            Button { toggle(item) } label: {
                FoodRow(
                    name: item.name,
                    detail: detail(for: item, location: location),
                    category: FoodCategory(category: item.category, name: item.name),
                    status: status(for: item),
                    location: location,
                    estimated: true,
                    isDimmed: !isOn
                )
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(isOn ? .isSelected : [])
        }
        .modifier(PhotoRowArrival(index: index, isShown: rowsShown))
        .listRowInsets(EdgeInsets(top: 0, leading: Theme.Space.xs, bottom: 0, trailing: Theme.Space.m))
    }

    /// "Fridge · keeps ~7 days"
    private func detail(for item: ScannedGrocery, location: StorageLocation) -> String {
        let days = item.shelf_life_days
        guard days > 0 else { return location.title }
        return "\(location.title) · keeps ~\(days) day\(days == 1 ? "" : "s")"
    }

    private func expiryDate(for item: ScannedGrocery) -> Date? {
        let calendar = Calendar.current
        return item.shelf_life_days > 0
            ? calendar.date(byAdding: .day, value: item.shelf_life_days, to: calendar.startOfDay(for: .now))
            : nil
    }

    private func status(for item: ScannedGrocery) -> ExpiryStatus {
        ExpiryStatus.of(expiresAt: expiryDate(for: item), soonThresholdDays: KitchenPreferences.current.soonThresholdDays)
    }

    private func selectionBinding(for id: UUID) -> Binding<Bool> {
        Binding(
            get: { selected.contains(id) },
            set: { isOn in setSelected(id, isOn) }
        )
    }

    private func setSelected(_ id: UUID, _ isOn: Bool) {
        var updated = selected
        if isOn {
            updated.insert(id)
        } else {
            updated.remove(id)
        }
        selected = updated
    }

    // MARK: - Actions

    private func toggle(_ item: ScannedGrocery) {
        let isOn = selected.contains(item.id)
        withAnimation(Theme.Motion.adaptive(Theme.Motion.snappy, reduceMotion: reduceMotion)) {
            setSelected(item.id, !isOn)
        }
    }

    private func analyze(_ picked: UIImage) async {
        image = picked
        results = []
        selected = []
        errorMessage = nil
        rowsShown = false
        isWorking = true
        defer { isWorking = false }
        do {
            guard let jpeg = picked.resized(maxDimension: 1568).jpegData(compressionQuality: 0.8) else {
                errorMessage = "Couldn't open that photo. Try another one."
                failureTick += 1
                return
            }
            let client = try ClaudeClient.fromSettings()
            let found = try await client.identifyGroceries(jpegData: jpeg)
            results = found
            selected = Set(found.map(\.id))
            if found.isEmpty {
                errorMessage = "No groceries recognized. Try a closer, well-lit photo."
                failureTick += 1
            } else {
                successTick += 1
            }
        } catch {
            errorMessage = error.localizedDescription
            failureTick += 1
        }
    }

    private func addSelected() {
        for item in results where selected.contains(item.id) {
            context.insert(PantryItem(
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                location: StorageLocation(rawValue: item.location) ?? .fridge,
                category: item.category,
                expiresAt: expiryDate(for: item)
            ))
        }
        successTick += 1
        dismiss()
    }
}

// MARK: - Pieces

private extension View {
    /// A List row with no card behind it: the content sits on the canvas, as wide as the sections.
    func photoClearRow() -> some View {
        self
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: Theme.Space.xs, leading: 0, bottom: Theme.Space.xs, trailing: 0))
    }
}

/// A big choice tile: a plum-soft icon circle over a title, on a surface card.
private struct PhotoChoiceTile: View {
    let title: String
    let systemImage: String

    @ScaledMetric(relativeTo: .body) private var circleSide: CGFloat = 44

    var body: some View {
        let side = min(circleSide, 64)
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            Image(systemName: systemImage)
                .font(.body.weight(.bold))
                .foregroundStyle(Theme.Colors.plumStrong)
                .frame(width: side, height: side)
                .background(Theme.Colors.plumSoft, in: Circle())
                .accessibilityHidden(true)
            Spacer(minLength: 0)
            Text(title)
                .font(Theme.Fonts.tileTitle)
                .foregroundStyle(Theme.Colors.ink)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        }
        // 120pt tall in all, counting the card padding.
        .frame(maxWidth: .infinity, minHeight: 120 - 2 * Theme.Space.cardPadding, maxHeight: .infinity, alignment: .topLeading)
        .surfaceCard()
        .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
    }
}

/// Press feedback for the big tiles: a slight dim and scale (no scale under Reduce Motion).
private struct PhotoTileButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        PhotoTileButtonBody(configuration: configuration)
    }
}

private struct PhotoTileButtonBody: View {
    let configuration: ButtonStyleConfiguration

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }
}

/// Says what went wrong and what to do, in tomato on a soft card.
private struct PhotoErrorCard: View {
    let message: String

    @Environment(\.colorSchemeContrast) private var colorSchemeContrast

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
                .accessibilityHidden(true)
            Text(message)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .font(Theme.Fonts.detail)
        .foregroundStyle(Theme.Colors.todayText)
        .padding(Theme.Space.cardPadding)
        .background(Theme.Colors.todaySoft, in: shape)
        .overlay {
            if colorSchemeContrast == .increased {
                shape.strokeBorder(Theme.Colors.separator, lineWidth: 1)
            }
        }
        .accessibilityElement(children: .combine)
        .onAppear {
            UIAccessibility.post(notification: .announcement, argument: message)
        }
        .onChange(of: message) { _, newValue in
            UIAccessibility.post(notification: .announcement, argument: newValue)
        }
    }
}

/// A thin plum line that sweeps top to bottom and back while Claude looks. Decorative.
private struct PhotoScanBand: View {
    @State private var sweeping = false

    var body: some View {
        GeometryReader { geo in
            LinearGradient(
                colors: [Theme.Colors.plum.opacity(0), Theme.Colors.plum, Theme.Colors.plum.opacity(0)],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(width: geo.size.width, height: 3)
            .offset(y: sweeping ? max(geo.size.height - 3, 0) : 0)
            .animation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true), value: sweeping)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear { sweeping = true }
        .onDisappear { sweeping = false }
    }
}

/// Result rows fade and rise 8pt into place, staggered by 0.03 s × min(index, 12).
/// Under Reduce Motion they only fade, all together.
private struct PhotoRowArrival: ViewModifier {
    let index: Int
    let isShown: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .opacity(isShown ? 1 : 0)
            .offset(y: isShown || reduceMotion ? 0 : 8)
            .animation(arrival, value: isShown)
    }

    private var arrival: Animation {
        if reduceMotion {
            return Theme.Motion.adaptive(Theme.Motion.smooth, reduceMotion: true)
        }
        return Theme.Motion.smooth.delay(0.03 * Double(min(index, 12)))
    }
}

// MARK: - Camera

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
