import AsyncStorage from "@react-native-async-storage/async-storage"
import { Image } from "expo-image"
import { router, usePathname } from "expo-router"
import { useTheme } from "@shopify/restyle"
import { useEffect, useState } from "react"
import { Pressable, StyleSheet, useWindowDimensions } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { absoluteUrl } from "@/lib/config"
import { tapLight, tapSelection } from "@/lib/feedback"
import { useConciergeMeta } from "@/lib/hooks"
import { Icon, type Theme } from "@/ui"

const POS_KEY = "kiz.ai.fab.pos"
const SIZE = 56
const MARGIN = 16
const TAB_BAR = 64

/**
 * Floating KIZ-AI launcher.
 *
 * Mirrors the web widget: a mascot bubble that bobs, can be dragged anywhere on
 * screen (position persisted), opens the concierge on tap, and can be dismissed
 * with a small X. Mounted once in the `(app)` layout so it survives navigation
 * between screens.
 */
export function KizAiFab() {
  const theme = useTheme<Theme>()
  const pathname = usePathname()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { data: meta } = useConciergeMeta()

  const [hidden, setHidden] = useState(false)
  const [ready, setReady] = useState(false)

  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const pressed = useSharedValue(0)
  const float = useSharedValue(0)

  const baseLeft = width - MARGIN - SIZE
  const baseTop = height - (insets.bottom + TAB_BAR) - SIZE
  const minX = MARGIN - baseLeft
  const minY = MARGIN - baseTop

  function persistPos(nx: number, ny: number) {
    AsyncStorage.setItem(POS_KEY, JSON.stringify({ x: nx, y: ny })).catch(() => {})
  }

  function openChat() {
    tapSelection()
    router.push("/kiz-ai")
  }

  function dismiss() {
    tapLight()
    setHidden(true)
  }

  useEffect(() => {
    AsyncStorage.getItem(POS_KEY)
      .then((raw) => {
        if (!raw) return
        const saved = JSON.parse(raw) as { x?: number; y?: number }
        if (typeof saved.x === "number") x.set(saved.x)
        if (typeof saved.y === "number") y.set(saved.y)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [x, y])

  // Keep the bubble on-screen when the viewport changes (rotation, split view).
  useEffect(() => {
    x.set(Math.min(0, Math.max(minX, x.get())))
    y.set(Math.min(0, Math.max(minY, y.get())))
  }, [minX, minY, x, y])

  useEffect(() => {
    float.set(
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    )
    return () => cancelAnimation(float)
  }, [float])

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.set(x.get())
      startY.set(y.get())
      pressed.set(withTiming(1, { duration: 80 }))
    })
    .onUpdate((e) => {
      x.set(Math.min(0, Math.max(minX, startX.get() + e.translationX)))
      y.set(Math.min(0, Math.max(minY, startY.get() + e.translationY)))
    })
    .onEnd(() => {
      runOnJS(persistPos)(x.get(), y.get())
    })
    .onFinalize(() => {
      pressed.set(withTiming(0, { duration: 140 }))
    })

  const tap = Gesture.Tap()
    .maxDistance(8)
    .onBegin(() => {
      pressed.set(withTiming(1, { duration: 80 }))
    })
    .onEnd((_e, success) => {
      if (success) runOnJS(openChat)()
    })
    .onFinalize(() => {
      pressed.set(withTiming(0, { duration: 140 }))
    })

  const gesture = Gesture.Exclusive(pan, tap)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + float.value },
      { scale: 1 - 0.06 * pressed.value },
    ],
  }))

  if (!ready || !meta?.enabled || hidden || pathname === "/kiz-ai") return null

  const avatar = absoluteUrl(meta.avatarUrl)

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, { left: baseLeft, top: baseTop }, animatedStyle]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessibilityRole="button"
          accessibilityLabel={`Open ${meta.name}`}
          style={[styles.button, { backgroundColor: theme.colors.brand600 }]}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Icon name="smart_toy" size={30} color="#FFFFFF" />
          )}
          <Animated.View
            style={[styles.dot, { backgroundColor: theme.colors.success, borderColor: theme.colors.surface }]}
          />
        </Animated.View>
      </GestureDetector>

      <Pressable
        onPress={dismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Hide ${meta.name}`}
        style={[styles.close, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <Icon name="close" size={13} color={theme.colors.ink500} />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    zIndex: 50,
    elevation: 8,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#09090B",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  dot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  close: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 9,
    shadowColor: "#09090B",
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
})
