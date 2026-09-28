// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FridgeCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "FridgeCore", targets: ["FridgeCore"]),
    ],
    targets: [
        .target(name: "FridgeCore"),
        .testTarget(name: "FridgeCoreTests", dependencies: ["FridgeCore"]),
    ]
)
