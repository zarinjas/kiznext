import { useTheme } from "@shopify/restyle"
import { Stack, useLocalSearchParams } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable } from "react-native"

import { PdfWebViewer } from "@/components/pdf-web-viewer"
import { tapMedium } from "@/lib/feedback"
import { Box, KButton, KEmpty, Text, useToast, type Theme } from "@/ui"

/**
 * In-app PDF reader used by the Digital Guide, announcement attachments and
 * chat attachments.
 *
 * Rendering happens in a WebView via pdf.js (`PdfWebViewer`), which works in
 * Expo Go, every native build, and on both platforms — unlike `react-native-pdf`,
 * a native module that is absent from Expo Go and can fail under RN 0.86's New
 * Architecture. A browser hand-off stays available as the last resort, because
 * a document must never be a dead end.
 */

/** Show a "taking a while?" hint if the document hasn't parsed by then. */
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
  /** Bumped on retry to force a clean WebView remount. */
  const [attempt, setAttempt] = useState(0)
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

  // Never leave the user staring at a spinner with no explanation.
  useEffect(() => {
    if (error || loaded.current) return
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
                  setPages(0)
                  setError(null)
                  setAttempt((a) => a + 1)
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

      <PdfWebViewer
        // Remount on retry so the WebView reloads the document cleanly.
        key={`${url}-${attempt}`}
        url={url}
        onLoaded={(count) => {
          loaded.current = true
          setSlow(false)
          setPages(count)
        }}
        onPage={setPage}
        onError={(message) => {
          console.warn("[pdf-viewer] pdf.js failed", message)
          setError(
            `${message} Opening it in your browser usually works — some scanned or password-protected PDFs can only be read there.`
          )
        }}
      />

      {/* Spinner over the blank WebView until the first page count arrives. */}
      {pages === 0 ? (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          backgroundColor="canvasSunk"
          pointerEvents="none"
        >
          <ActivityIndicator color={theme.colors.brand600} size="large" />
          <Text variant="caption" marginTop="m">
            Loading document…
          </Text>
        </Box>
      ) : null}

      {/* Slow-load hint: never leave the user without a way forward. */}
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
