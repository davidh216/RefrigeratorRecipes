import SwiftUI
import VisionKit

/// Full-screen live barcode scanner; calls `onScan` once with the first code seen.
struct BarcodeScannerSheet: View {
    let onScan: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            // The ZStack keeps the safe area, so the hint sits above the home indicator
            // while the camera fills the whole sheet behind it.
            ZStack(alignment: .bottom) {
                BarcodeScannerView(onScan: onScan)
                    .ignoresSafeArea()
                    .accessibilityIgnoresInvertColors()
                BarcodeAimHint()
                    .padding(.horizontal, Theme.Space.gutter)
                    .padding(.bottom, Theme.Space.m)
            }
            .navigationTitle("Scan barcode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .sheetChrome()
    }
}

/// "Point at a barcode" on a material capsule over the camera (DESIGN.md §8.7).
private struct BarcodeAimHint: View {
    var body: some View {
        Label("Point at a barcode", systemImage: "barcode.viewfinder")
            .font(Theme.Fonts.detailStrong)
            .foregroundStyle(Theme.Colors.ink)
            .lineLimit(2)
            .multilineTextAlignment(.leading)
            .padding(.horizontal, Theme.Space.m)
            .padding(.vertical, 10)
            .frame(minHeight: Theme.Metrics.minTap)
            .background(.regularMaterial, in: Capsule())
            .allowsHitTesting(false)
    }
}

struct BarcodeScannerView: UIViewControllerRepresentable {
    let onScan: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13, .ean8, .upce, .code128, .qr])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        try? scanner.startScanning()
        return scanner
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {}

    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        controller.stopScanning()
    }

    func makeCoordinator() -> Coordinator { Coordinator(onScan: onScan) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onScan: (String) -> Void
        private var handled = false

        init(onScan: @escaping (String) -> Void) { self.onScan = onScan }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !handled else { return }
            for item in addedItems {
                if case .barcode(let barcode) = item, let value = barcode.payloadStringValue {
                    handled = true
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    onScan(value)
                    return
                }
            }
        }
    }
}
