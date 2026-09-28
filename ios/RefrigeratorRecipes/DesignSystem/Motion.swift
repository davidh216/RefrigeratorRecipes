import SwiftUI

// Motion and haptics (DESIGN.md §7.8, §10). Every animation goes through `Theme.Motion`.
// Under Reduce Motion, moves become fades; haptics stay on.

extension Theme {
    enum Motion {
        /// Toggles, chips, check marks.
        static let snappy = Animation.snappy(duration: 0.28)
        /// Layout, strip, picks reflow.
        static let smooth = Animation.smooth(duration: 0.4)
        /// Stickers, stamps, confirmations.
        static let bouncy = Animation.bouncy(duration: 0.45, extraBounce: 0.1)

        /// Views that run `withAnimation` read `\.accessibilityReduceMotion` and pass it here.
        static func adaptive(_ a: Animation, reduceMotion: Bool) -> Animation {
            reduceMotion ? .easeInOut(duration: 0.2) : a
        }
    }
}

/// Reads Reduce Motion from the environment, so callers don't have to.
private struct MotionAnimationModifier<V: Equatable>: ViewModifier {
    let animation: Animation
    let value: V
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content.animation(Theme.Motion.adaptive(animation, reduceMotion: reduceMotion), value: value)
    }
}

extension View {
    /// `.animation(_:value:)` that switches to a 0.2 s ease under Reduce Motion.
    func motionAnimation<V: Equatable>(_ animation: Animation, value: V) -> some View {
        modifier(MotionAnimationModifier(animation: animation, value: value))
    }

    /// `.sensoryFeedback(.selection, trigger:)`
    func hapticSelection<T: Equatable>(trigger: T) -> some View {
        sensoryFeedback(.selection, trigger: trigger)
    }

    /// `.sensoryFeedback(.success, trigger:)`
    func hapticSuccess<T: Equatable>(trigger: T) -> some View {
        sensoryFeedback(.success, trigger: trigger)
    }

    /// `.sensoryFeedback(.impact(weight:), trigger:)`
    func hapticImpact<T: Equatable>(_ weight: SensoryFeedback.Weight = .light, trigger: T) -> some View {
        sensoryFeedback(.impact(weight: weight), trigger: trigger)
    }
}

extension AnyTransition {
    /// Returns `.opacity` when `reduceMotion` is true.
    static func reducible(_ t: AnyTransition, reduceMotion: Bool) -> AnyTransition {
        reduceMotion ? .opacity : t
    }
}
