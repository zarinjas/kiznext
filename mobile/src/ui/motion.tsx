import { useEffect } from "react"
import { Pressable, type PressableProps, type ViewStyle } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"

import { tapLight } from "@/lib/feedback"

/**
 * Motion primitives.
 *
 * Reanimated runs these on the UI thread, so animation never competes with
 * React renders or network work — important on the AR screens where the camera
 * and a 1Hz countdown are already live.
 *
 * Durations are deliberately short (140–320ms). Motion here is for orientation
 * and feedback, not decoration; anything slower starts to feel sluggish on the
 * fourth repetition.
 */

/** Spring tuned for UI response: settles fast, no visible overshoot wobble. */
export const SPRING = { damping: 18, stiffness: 220, mass: 0.6 } as const

/** Spring tuned for continuous sensor data (AR compass). Softer, absorbs jitter. */
export const SPRING_SENSOR = { damping: 14, stiffness: 90, mass: 0.9 } as const

export const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) } as const

/**
 * A `Pressable` that scales down and dims while held, with an optional haptic.
 * This is the single most-seen interaction in the app — every button and row
 * routes through it, so one good implementation lifts the whole product.
 */
export function PressScale({
  children,
  onPress,
  haptic = true,
  scaleTo = 0.97,
  style,
  disabled,
  ...rest
}: {
  children: React.ReactNode
  onPress?: () => void
  /** Fire a light haptic on press-in. Disable for high-frequency controls. */
  haptic?: boolean
  scaleTo?: number
  style?: ViewStyle
} & Omit<PressableProps, "style" | "onPress" | "children">) {
  const pressed = useSharedValue(0)

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - (1 - scaleTo) * pressed.value, SPRING) }],
    opacity: withTiming(1 - 0.22 * pressed.value, { duration: 90 }),
  }))

  return (
    <Pressable
      onPressIn={() => {
        pressed.value = 1
        if (haptic && !disabled) tapLight()
      }}
      onPressOut={() => {
        pressed.value = 0
      }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  )
}

/**
 * Fade + rise on mount, optionally staggered by index.
 *
 * Used to give list and dashboard content an authored entrance instead of
 * appearing as one hard cut. Keep `index` under ~8 so the last item doesn't
 * wait too long.
 */
export function FadeInUp({
  children,
  index = 0,
  distance = 12,
  style,
}: {
  children: React.ReactNode
  index?: number
  distance?: number
  style?: ViewStyle
}) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(index * 55, withTiming(1, TIMING))
  }, [index, progress])

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }))

  return <Animated.View style={[style, animated]}>{children}</Animated.View>
}

/**
 * Looping shimmer for skeleton placeholders. Opacity-only (no gradient sweep)
 * so it stays cheap enough to run a dozen at once during a cold load.
 */
export function Shimmer({
  children,
  style,
}: {
  children?: React.ReactNode
  style?: ViewStyle
}) {
  const pulse = useSharedValue(0.45)

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 620, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    )
    return () => cancelAnimation(pulse)
  }, [pulse])

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return <Animated.View style={[style, animated]}>{children}</Animated.View>
}

/**
 * Attention pulse — a slow scale breath. Used on the live AR/AI entry points so
 * the innovation surfaces visibly invite a tap rather than sitting inert.
 */
export function Pulse({
  children,
  style,
  enabled = true,
}: {
  children: React.ReactNode
  style?: ViewStyle
  enabled?: boolean
}) {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (!enabled) {
      scale.value = withTiming(1, TIMING)
      return
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    )
    return () => cancelAnimation(scale)
  }, [enabled, scale])

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return <Animated.View style={[style, animated]}>{children}</Animated.View>
}

export { Animated, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming }
