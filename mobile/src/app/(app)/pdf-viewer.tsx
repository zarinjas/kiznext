import Constants from "expo-constants"
import { useTheme } from "@shopify/restyle"
import { Stack, useLocalSearchParams } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Dimensions, Pressable } from "react-native"

import { tapMedium } from "@/lib/feedback"
import { Box, KButton, KEmpty, Text, useToast, type Theme } from "@/ui"

/**
 * In-app PDF reader used by the Digital Guide, announcement attachments and
 * chat attachments.
 *
 * `react-native-pdf` is a native module. That makes it unavailable in Expo Go,
 * and on React Native 0.86 (New Architecture by default) a third-party native
 * view can fail to render even in a real build. Relying on it alone meant PDFs
 * sometimes could not be opened at all, with no way out.
 *
 * So the reader is layered:
 *   1. Render with `react-native-pdf` when the module is present.
 *   2. If it is missing (Expo Go) or errors, offer the system PDF viewer via
 *      `expo-web-browser` — SFSafariViewController on iOS and Chrome Custom Tabs
 *      on Android both render PDFs natively and work everywhere.
 *   3. Keep an "Open in browser" action in the header at all times, so a
 *      poorly-rendered document is never a dead end.
 */
const inExpoGo = Constants.executionEnvironment === "storeClient"

/**
 * Load the native reader defensively.
 *
 * A bare `require` at module scope throws if the module is missing or its
 * native side failed to link, which crashes the whole route before the fallback
 * can render. Catching it here degrades to the browser viewer instead.
 */
function loadPdfView(): React.ComponentType<Record<string, unknown>> | null {
  if (inExpoGo) return null
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return require("react-native-pdf").default as React.ComponentType<Record<string, unknown>>
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch (err) {
    console.warn("[pdf-viewer] react-native-pdf unavailable — using the browser viewer", err)
    return null
  }
}

const PdfView = loadPdfView()

/** Show a "taking a while?" hint if the native reader hasn't loaded by then. */
const SLOW_LOAD_MS = 9000

export default function PdfViewerScreen() {
  const theme = useTheme<Theme>()
  const toast = useToast()
  const params = useLocalSearchParams<{ url?: string; title?: string }>()
  const url = typeof params.url === "string" ? params.url : ""
  const title = typeof params.title === "string" ? params.title : "Document"

  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)
  const loaded = useRef(false)

  /** Open the document with the platform's native PDF viewer. */
  const openInBrowser = useCallback(async () => {
    if (!url) return
    tapMedium()
    try {
      await WebBrowser.openBrowserAsync(url)
    } catch {
      toast.error("Couldn't open the document. Check the link and try again.")
    }
  }, [url, toast])

  // Nudge toward the browser if the native view is slow — a blank screen with a
  // spinner and no explanation is the worst possible state.
  useEffect(() => {
    if (!PdfView || error || loaded.current) return
    const id = setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => clearTimeout(id)
  }, [error])

  const headerRight = useCallback(
    () => (
      <Pressable
        onPress={() => void openInBrowser()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Open in browser"
        style={{ paddingHorizontal: 6, paddingVertical: 8 }}
      >
        <Text variant="button" style={{ color: theme.colors.brand700 }}>
          Browser
        </Text>
      </Pressable>
    ),
    [openInBrowser, theme.colors.brand700]
  )

  if (!url) {
    return (
      <Box flex={1} backgroundColor="canvas" padding="l">
        <KEmpty
          icon="error_outline"
          title="Nothing to open"
          message="This document has no file attached."
        />
      </Box>
    )
  }

  // ── Fallback: no native reader available (Expo Go) ─────────────────────────
  if (!PdfView) {
    return (
      <Box flex={1} backgroundColor="canvas" padding="l">
        <Stack.Screen options={{ title }} />
        <KEmpty
          icon="menu_book"
          title="Open this document"
          message="The built-in reader needs the installed app. Open the PDF in your browser to read it now."
          action={
            <KButton label="Open in browser" icon="open_in_new" onPress={() => void openInBrowser()} />
          }
        />
      </Box>
    )
  }

  // ── Fallback: native reader failed ─────────────────────────────────────────
  if (error) {
    return (
      <Box flex={1} backgroundColor="canvas" padding="l">
        <Stack.Screen options={{ title, headerRight }} />
        <KEmpty
          icon="error_outline"
          tone="danger"
          title="Couldn't show the PDF here"
          message={error}
          action={
            <>
              <KButton
                label="Open in browser"
                icon="open_in_new"
                onPress={() => void openInBrowser()}
              />
              <KButton
                label="Try again"
                icon="refresh"
                variant="secondary"
                onPress={() => {
                  loaded.current = false
                  setSlow(false)
                  setError(null)
                }}
              />
            </>
          }
        />
      </Box>
    )
  }

  return (
    <Box flex={1} backgroundColor="canvas">
      <Stack.Screen options={{ title, headerRight }} />

      <PdfView
        source={{ uri: url, cache: true }}
        trustAllCerts={false}
        enablePaging
        style={{ flex: 1, width: Dimensions.get("window").width, backgroundColor: theme.colors.canvas }}
        onLoadComplete={(numberOfPages: number) => {
          loaded.current = true
          setSlow(false)
          setPages(numberOfPages)
        }}
        onPageChanged={(pageNumber: number) => setPage(pageNumber)}
        onError={(err: unknown) => {
          // Surface the real reason in the dev log — the on-screen copy stays
          // human-friendly.
          console.warn("[pdf-viewer] react-native-pdf failed", err)
          setError(
            "The built-in reader couldn't display this file. It may be a scanned or password-protected PDF — opening it in your browser usually works."
          )
        }}
        renderActivityIndicator={() => (
          <ActivityIndicator color={theme.colors.brand600} size="large" />
        )}
      />

      {/* Slow-load hint: never leave the user staring at a spinner. */}
      {slow && pages === 0 ? (
        <Box position="absolute" bottom={72} left={16} right={16} alignItems="center" gap="s">
          <Box
            borderRadius="card"
            backgroundColor="surface"
            borderWidth={1}
            borderColor="border"
            padding="m"
            gap="s"
            alignItems="center"
          >
            <Text variant="caption" textAlign="center">
              Taking a while? Some PDFs don&apos;t render in-app.
            </Text>
            <KButton
              label="Open in browser"
              icon="open_in_new"
              size="sm"
              fullWidth={false}
              onPress={() => void openInBrowser()}
            />
          </Box>
        </Box>
      ) : null}

      {pages > 0 ? (
        <Box
          position="absolute"
          bottom={24}
          alignSelf="center"
          paddingHorizontal="m"
          paddingVertical="xs"
          borderRadius="pill"
          backgroundColor="surface"
          borderWidth={1}
          borderColor="border"
        >
          <Text variant="caption">
            {page} / {pages}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
