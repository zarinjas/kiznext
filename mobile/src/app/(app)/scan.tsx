import { CHECKIN_NEXT_COUNTER } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { CameraView, useCameraPermissions } from "expo-camera"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useState } from "react"
import { ActivityIndicator } from "react-native"

import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { absoluteUrl } from "@/lib/config"
import { notifySuccess, tapMedium } from "@/lib/feedback"
import { getCheckInDirections, checkInLookup, checkInScan, checkInSubmit } from "@/lib/hooks"
import type { CheckInLookup, CheckInScan, CheckInSubmit } from "@/lib/types"
import {
  Box,
  KButton,
  KEmpty,
  KIconButton,
  Screen,
  SignaturePad,
  StatusChip,
  Surface,
  Text,
  TextField,
} from "@/ui"

/** The QR encodes `<site>/checkin/<token>`; also accept a bare token. */
function extractToken(data: string): string | null {
  const match = data.match(/\/checkin\/([A-Za-z0-9_-]+)/)
  if (match) return match[1]
  const trimmed = data.trim()
  return /^[A-Za-z0-9_-]{8,}$/.test(trimmed) ? trimmed : null
}

export default function ScanScreen() {
  const theme = useTheme()
  const { user } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()

  const [phase, setPhase] = useState<"scan" | "form" | "done">("scan")
  const [token, setToken] = useState<string | null>(null)
  const [scan, setScan] = useState<CheckInScan | null>(null)
  const [matric, setMatric] = useState(user?.matricId ?? "")
  const [lookup, setLookup] = useState<CheckInLookup | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInSubmit | null>(null)
  const [directions, setDirections] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [torch, setTorch] = useState(false)

  async function handleScan(data: string) {
    // Fire the moment a code is acquired, before any network work, so the
    // user knows the camera caught it even on a slow connection.
    tapMedium()
    const parsed = extractToken(data)
    if (!parsed) {
      setError("That QR code isn't a KIZ check-in code.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await checkInScan(parsed)
      if (!res.ok) {
        setError(res.error ?? "That QR code isn't active.")
        return
      }
      setToken(parsed)
      setScan(res)
      setPhase("form")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't read that QR code.")
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await checkInLookup(token, matric)
      setLookup(res)
      if (!res.ok) setError(res.error ?? "We couldn't find that matric number.")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't look up that matric number.")
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!token || !lookup?.matricId) return
    setError(null)
    if (!signature) {
      setError("Please sign in the box before submitting.")
      return
    }
    setBusy(true)
    try {
      const res = await checkInSubmit(token, lookup.matricId, signature)
      if (!res.ok) {
        setError(res.error ?? "Couldn't save your signature.")
        return
      }
      notifySuccess()
      setResult(res)
      setPhase("done")
      try {
        const dir = await getCheckInDirections()
        setDirections(dir.url)
      } catch {
        // Non-fatal.
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your signature.")
    } finally {
      setBusy(false)
    }
  }

  if (phase === "done" && result?.ok) {
    const dirUrl = absoluteUrl(directions)
    return (
      <Screen scroll edges={[]}>
        <Box paddingTop="l" gap="l">
          <Surface>
            <StatusChip
              label={result.type === "check_out" ? "Checked out" : "Checked in"}
              tone="success"
              icon="check_circle"
            />
            <Text variant="heading" marginTop="s">
              {result.name}
            </Text>
            {result.roomLabel ? (
              <Text variant="body" marginTop="xs">
                {result.roomLabel}
              </Text>
            ) : null}
            <Text variant="caption" marginTop="m">
              Next: go to {CHECKIN_NEXT_COUNTER} to collect or return your key.
            </Text>
          </Surface>
          {dirUrl ? (
            <Image
              source={{ uri: dirUrl }}
              style={{ width: "100%", height: 220, borderRadius: theme.borderRadii.cardLg }}
              contentFit="contain"
              accessibilityLabel="Directions to the key counter"
            />
          ) : null}
          <KButton label="Done" onPress={() => router.replace("/")} />
        </Box>
      </Screen>
    )
  }

  if (phase === "form" && scan?.ok) {
    const canSign = lookup?.ok && lookup.canSign
    return (
      <Screen scroll edges={[]}>
        <Box paddingTop="m" gap="l">
          <Surface>
            <StatusChip
              label={scan.type === "check_out" ? "Check-out" : "Check-in"}
              tone={scan.type === "check_out" ? "info" : "brand"}
              icon="how_to_reg"
            />
            <Text variant="heading" marginTop="s">
              {scan.name}
            </Text>
          </Surface>

          {!canSign ? (
            <>
              <TextField
                label="Matric number"
                value={matric}
                onChangeText={setMatric}
                placeholder="e.g. A123456"
                autoCapitalize="characters"
              />
              <KButton label="Verify my matric" onPress={verify} loading={busy} />
            </>
          ) : (
            <>
              <Surface>
                <Text variant="bodyStrong">{lookup?.name}</Text>
                <Text variant="caption" marginTop="xs">
                  {lookup?.matricId}
                  {lookup?.roomLabel ? ` · ${lookup.roomLabel}` : ""}
                </Text>
                {!lookup?.roomLabel ? (
                  <Text variant="caption" marginTop="s" style={{ color: theme.colors.warningInk }}>
                    No room assigned yet — check at the KIZ office first.
                  </Text>
                ) : null}
              </Surface>

              <Box>
                <Text variant="label" marginBottom="s" marginLeft="xs">
                  SIGN HERE
                </Text>
                <SignaturePad onChange={setSignature} />
              </Box>

              <KButton
                label={scan.type === "check_out" ? "Confirm check-out" : "Confirm check-in"}
                onPress={submit}
                loading={busy}
                disabled={!lookup?.roomLabel}
              />
            </>
          )}

          {error ? (
            <Box borderRadius="input" borderWidth={1} borderColor="danger" backgroundColor="dangerSoft" padding="m">
              <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                {error}
              </Text>
            </Box>
          ) : null}
        </Box>
        <Box height={32} />
      </Screen>
    )
  }

  // Scanning phase.
  // `permission` is null only while the hook resolves — that is a loading
  // state, not an empty one, so it gets a spinner rather than a KEmpty.
  if (!permission) {
    return (
      <Screen edges={[]}>
        <Box flex={1} alignItems="center" justifyContent="center" gap="m">
          <ActivityIndicator color={theme.colors.brand600} />
          <Text variant="caption">Preparing camera…</Text>
        </Box>
      </Screen>
    )
  }

  if (!permission.granted) {
    return (
      <Screen scroll edges={[]}>
        <KEmpty
          icon="photo_camera"
          title="Camera access needed"
          message="Allow camera access to scan the KIZ counter QR code."
          action={<KButton label="Allow camera" icon="photo_camera" onPress={requestPermission} />}
        />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={[]}>
      <Box flex={1}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={busy ? undefined : ({ data }) => handleScan(data)}
        />

        {/* Reticle — tells the user where to aim. Non-interactive so it never
            steals a tap from the camera surface underneath. */}
        <Box
          pointerEvents="none"
          alignItems="center"
          justifyContent="center"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Box
            width="70%"
            style={{
              aspectRatio: 1,
              borderWidth: 3,
              borderColor: theme.colors.white,
              borderRadius: theme.borderRadii.cardLg,
              opacity: 0.9,
            }}
          />
        </Box>

        <Box style={{ position: "absolute", top: 16, right: 16 }}>
          <Box backgroundColor="surface" borderRadius="pill" opacity={0.92}>
            <KIconButton
              icon={torch ? "flash_off" : "flash_on"}
              label={torch ? "Turn torch off" : "Turn torch on"}
              tone={torch ? "brand" : "neutral"}
              onPress={() => setTorch((on) => !on)}
            />
          </Box>
        </Box>
      </Box>

      <Box padding="l" gap="m">
        <Text variant="caption" textAlign="center">
          Point the camera at the KIZ counter QR code.
        </Text>
        {error ? (
          <>
            <Text variant="caption" textAlign="center" style={{ color: theme.colors.dangerInk }}>
              {error}
            </Text>
            {/* `busy` clears itself but `error` persisted, leaving the camera
                live with a stale failure and no obvious way forward. */}
            <KButton
              label="Scan again"
              icon="refresh"
              variant="secondary"
              onPress={() => setError(null)}
            />
          </>
        ) : null}
      </Box>
    </Screen>
  )
}
