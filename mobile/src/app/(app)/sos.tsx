import { useTheme } from "@shopify/restyle"
import { useEffect, useRef, useState } from "react"
import { Linking, Pressable } from "react-native"
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, { Circle, G } from "react-native-svg"

import { tapHeavy, tapMedium, notifyError } from "@/lib/feedback"
import { useSos } from "@/lib/hooks"
import { Box, KButton, LoadingScreen, Screen, Surface, Text, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

/**
 * SOS — press and hold for 3 seconds to dial the smart-routed number (office
 * during office hours, duty fellow after). Releasing early resets the ring, so a
 * panicked tap can never misdial.
 *
 * The progress ring is now driven by a Reanimated shared value on the UI thread.
 * It was previously a `requestAnimationFrame` loop calling `setState`, which
 * re-rendered the entire screen ~180 times per hold — the worst possible place
 * for jank, since this is the one interaction that must feel instant and
 * reliable. Haptics escalate each second so the user can feel the countdown
 * without watching the screen.
 */

const HOLD_MS = 3000
const SIZE = 232
const STROKE = 9
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default function SosScreen() {
  const theme = useTheme<Theme>()
  const { data, isLoading, isError, refetch } = useSos()

  const target = data?.target ?? null
  const contacts = data?.contacts ?? []
  const dialNumber = target?.phone ? target.phone.replace(/[^+\d]/g, "") : null

  const [holding, setHolding] = useState(false)
  const progress = useSharedValue(0)
  // Guards against the timing callback firing a second time after completion.
  const fired = useRef(false)
  const tickTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  /**
   * These handlers are intentionally plain functions rather than `useCallback`.
   * A Reanimated shared value is a stable mutable box, so memoising against it
   * buys nothing — and passing it as a hook dependency makes every
   * `progress.value = …` assignment read as mutating a hook argument under the
   * React Compiler's immutability rules. The consumer is a bare `Pressable`,
   * which isn't memoised, so identity churn costs nothing here.
   */
  function clearTicks() {
    tickTimers.current.forEach(clearTimeout)
    tickTimers.current = []
  }

  // Timers need explicit teardown; Reanimated cancels its own animations on
  // unmount. `tickTimers` is a ref, so this can safely run once.
  useEffect(() => {
    const timers = tickTimers
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [])

  function dial() {
    if (fired.current || !dialNumber) return
    fired.current = true
    tapHeavy()
    Linking.openURL(`tel:${dialNumber}`).catch(() => notifyError())
    setHolding(false)
    progress.value = 0
  }

  function start() {
    if (!dialNumber) return
    fired.current = false
    setHolding(true)
    tapMedium()

    // Felt countdown: a pulse at 1s and 2s, heavy impact on connect.
    clearTicks()
    tickTimers.current = [
      setTimeout(() => tapMedium(), 1000),
      setTimeout(() => tapMedium(), 2000),
    ]

    progress.value = 0
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(dial)()
    })
  }

  function cancel() {
    clearTicks()
    cancelAnimation(progress)
    progress.value = withTiming(0, { duration: 180 })
    setHolding(false)
  }

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }))

  // The button swells slightly as the hold progresses — visible confirmation
  // that holding is doing something, not just a stuck tap.
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.04 }],
  }))

  if (isLoading) return <LoadingScreen label="Loading SOS…" />

  if (!target) {
    return (
      <Screen scroll edges={["top"]}>
        <Box paddingTop="xl" gap="l">
          <Surface>
            <Text variant="bodyStrong">
              {isError ? "Couldn't load SOS routing" : "SOS isn't configured yet"}
            </Text>
            <Text variant="caption" marginTop="xs">
              {isError
                ? "Check your connection. In an emergency, call 999 directly."
                : "The KIZ office hasn't set an SOS number. In an emergency, call 999."}
            </Text>
            <Box marginTop="m" gap="s">
              <KButton
                label="Call 999 now"
                icon="call"
                variant="danger"
                onPress={() => Linking.openURL("tel:999").catch(() => {})}
              />
              {isError ? (
                <KButton label="Try again" icon="refresh" variant="secondary" onPress={() => refetch()} />
              ) : null}
            </Box>
          </Surface>
        </Box>
      </Screen>
    )
  }

  return (
    <Screen scroll edges={["top"]}>
      {/* Smart routing status */}
      <Surface>
        <Box flexDirection="row" alignItems="center" gap="m">
          <Box
            width={40}
            height={40}
            borderRadius="input"
            alignItems="center"
            justifyContent="center"
            backgroundColor={target.officeOpen ? "successSoft" : "warningSoft"}
          >
            <Icon
              name={target.officeOpen ? "domain" : "bedtime"}
              size={20}
              color={target.officeOpen ? theme.colors.successInk : theme.colors.warningInk}
            />
          </Box>
          <Box flex={1}>
            <Text variant="bodyStrong">
              {target.officeOpen ? "The office is open now" : "It's after office hours"}
            </Text>
            <Text variant="caption" marginTop="xs">
              {target.configured
                ? `You'll be connected to ${target.label} · ${target.phone}`
                : "SOS routing isn't configured yet — the numbers below still work."}
            </Text>
            <Text variant="caption" marginTop="xs">
              Office hours · Monday–Friday, 8:00 AM – 5:00 PM.
            </Text>
          </Box>
        </Box>
      </Surface>

      {/* SOS hold button */}
      <Box alignItems="center" marginTop="xxl">
        <Box width={SIZE} height={SIZE} alignItems="center" justifyContent="center">
          <Box position="absolute" top={0} left={0} width={SIZE} height={SIZE}>
            <Svg width={SIZE} height={SIZE}>
              <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={theme.colors.dangerSoft}
                  strokeWidth={STROKE}
                  fill="none"
                />
                <AnimatedCircle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={theme.colors.danger}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  animatedProps={ringProps}
                />
              </G>
            </Svg>
          </Box>

          <Animated.View style={buttonStyle}>
            <Pressable
              onPressIn={start}
              onPressOut={cancel}
              disabled={!dialNumber}
              accessibilityRole="button"
              accessibilityLabel={
                dialNumber
                  ? `Emergency call ${target.label}. Press and hold for three seconds.`
                  : "SOS number not configured"
              }
              style={{
                width: SIZE - STROKE * 4,
                height: SIZE - STROKE * 4,
                borderRadius: (SIZE - STROKE * 4) / 2,
                backgroundColor: dialNumber ? theme.colors.danger : theme.colors.neutral,
                alignItems: "center",
                justifyContent: "center",
                opacity: dialNumber ? 1 : 0.55,
              }}
            >
              <Icon name="sos" size={42} color="#FFFFFF" />
              <Text variant="button" style={{ color: "#FFFFFF", letterSpacing: 1, marginTop: 4 }}>
                {holding ? "KEEP HOLDING" : dialNumber ? "SOS" : "NOT SET"}
              </Text>
              <Text variant="caption" style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                {holding ? "Connecting…" : dialNumber ? "hold to call" : "configure in settings"}
              </Text>
            </Pressable>
          </Animated.View>
        </Box>

        <Text variant="caption" marginTop="l" textAlign="center" style={{ maxWidth: 320 }}>
          Press and hold for 3 seconds to call. Releasing early cancels — no accidental emergency
          calls.
        </Text>
      </Box>

      {/* Secondary contacts */}
      <Box marginTop="xxl">
        <Text variant="label" marginBottom="s" marginLeft="xs">
          OTHER EMERGENCY NUMBERS
        </Text>
        <Surface padded={false}>
          {contacts.length === 0 ? (
            <Box padding="l">
              <Text variant="caption">No emergency contacts have been added yet.</Text>
            </Box>
          ) : (
            contacts.map((c, i) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={c.phone ? `Call ${c.title} at ${c.phone}` : c.title}
                onPress={() =>
                  c.phone && Linking.openURL(`tel:${c.phone.replace(/[^+\d]/g, "")}`).catch(() => {})
                }
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="m"
                  padding="m"
                  // 56px so an emergency number is never a sub-44px target.
                  minHeight={56}
                  borderTopWidth={i > 0 ? 1 : 0}
                  borderColor="border"
                >
                  <Icon name="call" size={18} color={theme.colors.dangerInk} />
                  <Box flex={1}>
                    <Text variant="bodyStrong">{c.title}</Text>
                    {c.subtitle ? (
                      <Text variant="caption" marginTop="xs">
                        {c.subtitle}
                      </Text>
                    ) : null}
                  </Box>
                  {c.phone ? (
                    <Text variant="caption" style={{ color: theme.colors.dangerInk, fontWeight: "700" }}>
                      {c.phone}
                    </Text>
                  ) : null}
                </Box>
              </Pressable>
            ))
          )}
        </Surface>
      </Box>

      <Box height={32} />
    </Screen>
  )
}
