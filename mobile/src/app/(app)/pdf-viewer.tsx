import Constants from "expo-constants"
import { useTheme } from "@shopify/restyle"
import { Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { ActivityIndicator, Dimensions } from "react-native"

import { Box, KEmpty, Text } from "@/ui"

/**
 * In-app PDF reader used by the Digital Guide, announcement attachments and
 * chat attachments. `react-native-pdf` is a native module: Expo Go doesn't ship
 * it, so it is required only in a development/release build. Requiring it
 * unconditionally at the top would throw during route registration and crash
 * the whole app in Expo Go.
 */
const inExpoGo = Constants.executionEnvironment === "storeClient"

/* eslint-disable @typescript-eslint/no-require-imports */
const PdfView: React.ComponentType<Record<string, unknown>> | null = inExpoGo
  ? null
  : (require("react-native-pdf").default as React.ComponentType<Record<string, unknown>>)
/* eslint-enable @typescript-eslint/no-require-imports */

export default function PdfViewerScreen() {
  const theme = useTheme()
  const params = useLocalSearchParams<{ url?: string; title?: string }>()
  const url = typeof params.url === "string" ? params.url : ""
  const title = typeof params.title === "string" ? params.title : "Document"

  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  if (!url) {
    return (
      <Box flex={1} backgroundColor="canvas" padding="l">
        <KEmpty icon="error_outline" title="Nothing to open" message="This document has no file attached." />
      </Box>
    )
  }

  if (!PdfView) {
    return (
      <Box flex={1} backgroundColor="canvas" padding="l">
        <Stack.Screen options={{ title }} />
        <KEmpty
          icon="menu_book"
          title="PDF reading needs the full app"
          message="The in-app reader isn't available in Expo Go. Open this document on the web, or use a development build to read it here."
        />
      </Box>
    )
  }

  return (
    <Box flex={1} backgroundColor="canvas">
      <Stack.Screen options={{ title }} />

      {error ? (
        <Box padding="l">
          <KEmpty icon="error_outline" title="Couldn't open the PDF" message={error} />
        </Box>
      ) : (
        <PdfView
          source={{ uri: url, cache: true }}
          trustAllCerts={false}
          enablePaging
          style={{ flex: 1, width: Dimensions.get("window").width, backgroundColor: theme.colors.canvas }}
          onLoadComplete={(numberOfPages: number) => setPages(numberOfPages)}
          onPageChanged={(pageNumber: number) => setPage(pageNumber)}
          onError={() => setError("The file may have moved or isn't a valid PDF.")}
          renderActivityIndicator={() => (
            <ActivityIndicator color={theme.colors.brand600} size="large" />
          )}
        />
      )}

      {!error && pages > 0 ? (
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
