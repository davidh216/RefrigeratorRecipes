import AVFoundation
import CoreTransferable
import Speech
import UIKit
import UniformTypeIdentifiers

/// A cooking video the user picked from Photos (saved or screen-recorded from TikTok,
/// Reels, Shorts…). Copied to a temporary file so it can be read.
struct PickedVideo: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { video in
            SentTransferredFile(video.url)
        } importing: { received in
            let copy = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(received.file.pathExtension.isEmpty ? "mov" : received.file.pathExtension)
            try FileManager.default.copyItem(at: received.file, to: copy)
            return PickedVideo(url: copy)
        }
    }
}

/// Reads a cooking video on the device: what's said (speech-to-text) and what's shown
/// (a few still frames). Only that text and the frames are sent to Claude; the video isn't.
enum VideoRecipeReader {
    enum ReadError: LocalizedError {
        case speechDenied, empty

        var errorDescription: String? {
            switch self {
            case .speechDenied: String(localized: "Allow Speech Recognition in Settings so the app can listen to the video.")
            case .empty: String(localized: "Couldn't hear or see a recipe in that video.")
            }
        }
    }

    struct Reading {
        var transcript: String
        var frames: [Data]
        var seconds: Double
    }

    static func read(_ url: URL, frameCount: Int = 6) async throws -> Reading {
        let asset = AVURLAsset(url: url)
        let seconds = (try? await asset.load(.duration).seconds) ?? 0
        async let frames = stills(asset, count: frameCount, seconds: seconds)
        let transcript = (try? await transcribe(url)) ?? ""
        let pictures = await frames
        if transcript.isEmpty && pictures.isEmpty { throw ReadError.empty }
        return Reading(transcript: transcript, frames: pictures, seconds: seconds)
    }

    /// Evenly spaced frames, skipping the very start and end, as small JPEGs.
    static func stills(_ asset: AVURLAsset, count: Int, seconds: Double) async -> [Data] {
        guard seconds > 0, count > 0 else { return [] }
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 768, height: 768)
        var result: [Data] = []
        for index in 0..<count {
            let time = CMTime(seconds: seconds * (Double(index) + 0.5) / Double(count), preferredTimescale: 600)
            if let image = try? await generator.image(at: time).image,
               let jpeg = UIImage(cgImage: image).jpegData(compressionQuality: 0.6) {
                result.append(jpeg)
            }
        }
        return result
    }

    /// On-device speech-to-text of the video's audio track.
    static func transcribe(_ url: URL) async throws -> String {
        let status = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
        }
        guard status == .authorized else { throw ReadError.speechDenied }
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")) ?? SFSpeechRecognizer(),
              recognizer.isAvailable else { return "" }
        let request = SFSpeechURLRecognitionRequest(url: url)
        request.shouldReportPartialResults = false
        if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
        return try await withCheckedThrowingContinuation { continuation in
            var finished = false
            recognizer.recognitionTask(with: request) { result, error in
                guard !finished else { return }
                if let result, result.isFinal {
                    finished = true
                    continuation.resume(returning: result.bestTranscription.formattedString)
                } else if let error {
                    finished = true
                    // No speech in the video is not a failure; the frames may still carry it.
                    _ = error
                    continuation.resume(returning: "")
                }
            }
        }
    }
}
