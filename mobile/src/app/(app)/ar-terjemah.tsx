import { AR_LANGUAGES, sourceLangLabel } from "@kiz/shared"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTheme } from "@shopify/restyle"
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from "expo-camera"
import { Image } from "expo-image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView } from "react-native"

import { ApiError } from "@/lib/api"
import { arTranslateScan, useArTranslateMeta } from "@/lib/hooks"
import { speak, stopSpeaking } from "@/lib/speech"
import type { ArTranslateResult } from "@/lib/types"
import { Box, Icon, KButton, KEmpty, Screen, Text, type Theme } from "@/ui"

interface Frozen {
  uri: string
  base64: string
  width: number
  height: number
}

const LANG_KEY = "kiz-lens-lang"

/** Largest box of the given aspect ratio that fits inside the stage. */
function fitContain(stageW: number, stageH: number, aspect: number) {
  if (!stageW || !stageH || !aspect) return { w: 0, h: 0 }
  let w = stageW
  let h = w / aspect
  if (h > stageH) {
    h = stageH
    w = h * aspect
  }
  return { w: Math.round(w), h: Math.round(h) }
}

/**
 * KIZ Lens (mobile) — point the camera at a Malay/English sign or form, tap
 * Scan, and read it in your own language over the original text. Mirrors the
 * web `ar-translate.tsx`; the frame is sent to the web app's /api/v1 endpoint.
 */
export default function ArTerjemahScreen() {
  const theme = useTheme<Theme>()
  const [permission, requestPermission] = useCameraPermissions()
  const { data: meta } = useArTranslateMeta()

  const languages = AR_LANGUAGES
  const [targetLang, setTargetLang] = useState<string | null>(null)
  const activeLang = targetLang ?? meta?.suggestedLang ?? languages[0]?.code ?? "zh"

  // Remember the resident's language across sessions.
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v && AR_LANGUAGES.some((l) => l.code === v)) setTargetLang(v)
    })
  }, [])

  const cameraRef = useRef<CameraView>(null)
  const [frozen, setFrozen] = useState<Frozen | null>(null)
  const [result, setResult] = useState<ArTranslateResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState({ w: 0, h: 0 })

  const fit = useMemo(
    () => (frozen ? fitContain(stage.w, stage.h, frozen.width / frozen.height) : { w: 0, h: 0 }),
    [frozen, stage]
  )

  const runScan = useCallback(async (frame: Frozen, lang: string) => {
    setScanning(true)
    setError(null)
    try {
      const res = await arTranslateScan({ image: frame.base64, targetLang: lang, mimeType: "image/jpeg" })
      setResult(res)
    } catch (e) {
      setResult(null)
      setError(e instanceof ApiError ? e.message : "Couldn't translate that. Please try again.")
    } finally {
      setScanning(false)
    }
  }, [])

  const handleScan = useCallback(async () => {
    if (!cameraRef.current || scanning) return
    try {
      const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      })
      if (!photo?.base64) {
        setError("Couldn't capture the frame — try again.")
        return
      }
      const frame: Frozen = {
        uri: photo.uri,
        base64: photo.base64,
        width: photo.width,
        height: photo.height,
      }
      setFrozen(frame)
      setResult(null)
      void runScan(frame, activeLang)
    } catch {
      setError("Couldn't capture the frame — try again.")
    }
  }, [activeLang, runScan, scanning])

  const chooseLang = useCallback(
    (code: string) => {
      setTargetLang(code)
      AsyncStorage.setItem(LANG_KEY, code).catch(() => {})
      if (frozen) {
        setResult(null)
        void runScan(frozen, code)
      }
    },
    [frozen, runScan]
  )

  const resetScan = useCallback(() => {
    stopSpeaking()
    setFrozen(null)
    setResult(null)
    setError(null)
  }, [])

  // Stop any speech when leaving the screen.
  useEffect(() => () => stopSpeaking(), [])

  if (!permission) {
    return (
      <Screen>
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator color={theme.colors.brand600} />
        </Box>
      </Screen>
    )
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Box paddingTop="l" gap="l">
          <Text variant="heading">KIZ Lens</Text>
          <Text variant="body">
            Point your camera at any Malay or English signboard, notice or form and read it in your
            own language. The photo is used only for the translation — it is never stored.
          </Text>
          <KEmpty
            icon="translate"
            title="Camera access needed"
            message="Allow camera access to translate what you see."
          />
          <KButton label="Allow camera" icon="photo_camera" onPress={requestPermission} />
        </Box>
      </Screen>
    )
  }

  const active = languages.find((l) => l.code === activeLang)

  return (
    <Screen padded={false} edges={[]}>
      <Box flex={1} backgroundColor="ink900">
        {/* Stage */}
        <Box flex={1} overflow="hidden" onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {frozen ? (
            <Box flex={1} alignItems="center" justifyContent="center">
              <Box style={{ position: "relative", width: fit.w || "100%", height: fit.h || "100%" }}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${frozen.base64}` }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  contentFit="fill"
                />
                {result?.blocks.map((block, i) => {
                  if (!block.box) return null
                  const fontSize = Math.max(10, Math.min(26, block.box.h * fit.h * 0.6))
                  return (
                    <Box
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${block.box.x * 100}%`,
                        top: `${block.box.y * 100}%`,
                        width: `${block.box.w * 100}%`,
                        height: `${block.box.h * 100}%`,
                        backgroundColor: "rgba(8,145,178,0.86)",
                        borderColor: "rgba(255,255,255,0.55)",
                        borderWidth: 1,
                        borderRadius: 4,
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        overflow: "hidden",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize, lineHeight: fontSize * 1.12, fontWeight: "600" }} numberOfLines={3}>
                        {block.translation}
                      </Text>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ) : (
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          )}

          {/* Viewfinder frame (live only) */}
          {!frozen && (
            <Box
              pointerEvents="none"
              style={{
                position: "absolute",
                left: "8%",
                right: "8%",
                top: "16%",
                bottom: "20%",
                borderColor: "rgba(255,255,255,0.5)",
                borderWidth: 1.5,
                borderRadius: 14,
              }}
            />
          )}

          {/* Top bar */}
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            style={{ position: "absolute", top: 12, left: 12, right: 12 }}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              gap="s"
              paddingHorizontal="m"
              paddingVertical="s"
              borderRadius="pill"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <Icon name="translate" size={18} color={theme.colors.brand300} />
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>KIZ Lens</Text>
            </Box>
            {frozen ? (
              <Pressable onPress={resetScan} style={{ marginLeft: "auto" }}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="s"
                  paddingHorizontal="m"
                  paddingVertical="s"
                  borderRadius="pill"
                  style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                >
                  <Icon name="photo_camera" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Scan again</Text>
                </Box>
              </Pressable>
            ) : null}
          </Box>

          {/* Scanning shimmer */}
          {scanning ? (
            <Box
              alignItems="center"
              justifyContent="center"
              gap="s"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.42)" }}
            >
              <ActivityIndicator color={theme.colors.brand300} />
              <Text style={{ color: "#fff", fontSize: 13.5, fontWeight: "600" }}>Reading & translating…</Text>
            </Box>
          ) : null}

          {/* Result / error panel */}
          {!scanning && frozen && (error || (result && result.blocks.length === 0)) ? (
            <Box
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 12,
                backgroundColor: "rgba(0,0,0,0.72)",
                borderRadius: theme.borderRadii.card,
                padding: 14,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>
                {error ?? "No readable text found — get closer and hold steady."}
              </Text>
            </Box>
          ) : null}

          {/* Detected text list */}
          {!scanning && frozen && result && result.blocks.length > 0 ? (
            <Box
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: "46%",
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.borderRadii.cardLg,
                borderTopRightRadius: theme.borderRadii.cardLg,
                borderTopWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
                <Box flexDirection="row" alignItems="center" gap="s" marginBottom="s">
                  <Text variant="label">DETECTED TEXT · {result.blocks.length}</Text>
                  {sourceLangLabel(result.sourceLang) ? (
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      gap="xs"
                      paddingHorizontal="s"
                      paddingVertical="xs"
                      borderRadius="pill"
                      backgroundColor="brand50"
                    >
                      <Icon name="auto_awesome" size={13} color={theme.colors.brand700} />
                      <Text style={{ color: theme.colors.brand700, fontSize: 11, fontWeight: "700" }}>
                        {sourceLangLabel(result.sourceLang)}
                      </Text>
                    </Box>
                  ) : null}
                  <Pressable
                    onPress={() => speak(result.blocks.map((b) => b.translation).join(". "), activeLang)}
                    style={{ marginLeft: "auto" }}
                    hitSlop={8}
                    accessibilityLabel="Listen to the translation"
                  >
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      gap="xs"
                      paddingHorizontal="s"
                      paddingVertical="xs"
                      borderRadius="pill"
                      backgroundColor="brand50"
                    >
                      <Icon name="volume_up" size={14} color={theme.colors.brand700} />
                      <Text style={{ color: theme.colors.brand700, fontSize: 11, fontWeight: "700" }}>Listen</Text>
                    </Box>
                  </Pressable>
                </Box>
                {result.blocks.map((block, i) => (
                  <Box
                    key={i}
                    paddingVertical="s"
                    flexDirection="row"
                    alignItems="flex-start"
                    gap="s"
                    style={i > 0 ? { borderTopWidth: 1, borderColor: theme.colors.border } : undefined}
                  >
                    <Box flex={1} minWidth={0}>
                      <Text variant="caption">{block.text}</Text>
                      <Text variant="bodyStrong" marginTop="xs">
                        {block.translation}
                      </Text>
                    </Box>
                    <Pressable
                      onPress={() => speak(block.translation, activeLang)}
                      hitSlop={8}
                      accessibilityLabel="Listen to this line"
                    >
                      <Icon name="volume_up" size={18} color={theme.colors.brand600} />
                    </Pressable>
                  </Box>
                ))}
              </ScrollView>
            </Box>
          ) : null}
        </Box>

        {/* Control deck */}
        <Box backgroundColor="surface" borderTopWidth={1} borderColor="border" paddingBottom="l">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}
          >
            {languages.map((l) => {
              const on = l.code === activeLang
              return (
                <Pressable key={l.code} onPress={() => chooseLang(l.code)}>
                  <Box
                    paddingHorizontal="m"
                    paddingVertical="s"
                    borderRadius="pill"
                    borderWidth={1}
                    borderColor={on ? "brand600" : "border"}
                    backgroundColor={on ? "brand50" : "surface"}
                  >
                    <Text style={{ color: on ? theme.colors.brand700 : theme.colors.ink500, fontSize: 13, fontWeight: on ? "700" : "500" }}>
                      {l.native}
                    </Text>
                  </Box>
                </Pressable>
              )
            })}
          </ScrollView>

          <Box flexDirection="row" alignItems="center" gap="m" paddingHorizontal="l">
            <Box flex={1}>
              <Text variant="label">TRANSLATING TO</Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {active ? `${active.native} · ${active.english}` : ""}
              </Text>
            </Box>
            <Box width={150}>
              <KButton
                label={frozen ? "Re-scan" : "Scan"}
                icon={frozen ? "refresh" : "document_scanner"}
                onPress={handleScan}
                disabled={scanning}
                loading={scanning}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Screen>
  )
}
