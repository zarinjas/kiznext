import { useTheme } from "@shopify/restyle"
import { useCallback, useEffect, useRef, useState } from "react"
import { Linking, Pressable } from "react-native"
import Svg, { Circle, G } from "react-native-svg"

import { useSos } from "@/lib/hooks"
import { Box, LoadingScreen, Screen, Surface, Text } from "@/ui"
import { Icon } from "@/ui/icon"

/**
 * SOS screen — the native twin of the web `/[role]/sos`. Press-and-hold the
 * button for 3 seconds to dial the smart-routed number (office during office
 * hours, duty fellow after). Releasing early resets the ring so a panicked tap
 * can never misdial.
 */

const HOLD_MS = 3000
const SIZE = 224
const STROKE = 8
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

export default function SosScreen() {
  const theme = useTheme()
  const { data, isLoading } = useSos()

  const target = data?.target ?? null
  const contacts = data?.contacts ?? []
  const dialNumber = target?.phone ? target.phone.replace(/[^+\d]/g, "") : null

  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const clear = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
  }, [])

  const start = useCallback(() => {
    if (!dialNumber) return
    setHolding(true)
    setProgress(0)
    startRef.current = null
    const step = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const p = Math.min((now - startRef.current) / HOLD_MS, 1)
      setProgress(p)
      if (p >= 1) {
        clear()
        setHolding(false)
        if (dialNumber) Linking.openURL(`tel:${dialNumber}`).catch(() => {})
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [dialNumber, clear])

  const cancel = useCallback(() => {
    clear()
    setProgress(0)
    setHolding(false)
  }, [clear])

  if (isLoading || !target) return <LoadingScreen label="Loading SOS…" />

  const dashOffset = CIRC * (1 - progress)

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
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={theme.colors.danger}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={dashOffset}
                />
              </G>
            </Svg>
          </Box>

          <Pressable
            onPressIn={start}
            onPressOut={cancel}
            disabled={!dialNumber}
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
            <Text
              variant="button"
              style={{ color: "#FFFFFF", letterSpacing: 1, marginTop: 4 }}
            >
              {holding ? "KEEP HOLDING" : dialNumber ? "SOS" : "NOT SET"}
            </Text>
            <Text variant="caption" style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
              {holding ? "Connecting…" : dialNumber ? "hold to call" : "configure in settings"}
            </Text>
          </Pressable>
        </Box>

        <Text variant="caption" marginTop="l" textAlign="center" style={{ maxWidth: 320 }}>
          Press and hold for 3 seconds to call. Releasing early cancels — no accidental emergency calls.
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
                onPress={() => c.phone && Linking.openURL(`tel:${c.phone.replace(/[^+\d]/g, "")}`).catch(() => {})}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="m"
                  padding="m"
                  borderTopWidth={i > 0 ? 1 : 0}
                  borderColor="border"
                >
                  <Icon name="call" size={16} color={theme.colors.ink300} />
                  <Box flex={1}>
                    <Text variant="bodyStrong">{c.title}</Text>
                    {c.subtitle ? (
                      <Text variant="caption" marginTop="xs">
                        {c.subtitle}
                      </Text>
                    ) : null}
                  </Box>
                  {c.phone ? (
                    <Text variant="caption" style={{ color: theme.colors.dangerInk, fontWeight: "600" }}>
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
