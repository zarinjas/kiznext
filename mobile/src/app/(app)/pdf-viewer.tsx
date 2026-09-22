import { useTheme } from "@shopify/restyle"
import { Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { ActivityIndicator, Dimensions } from "react-native"
import Pdf from "react-native-pdf"

import { Box, KButton, KEmpty, Text } from "@/ui"

/**
 * In-app PDF reader used by the Digital Guide, announcement attachments and
 * chat attachments. Renders natively via `react-native-pdf` (needs a dev build).
 */
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

  return (
    <Box flex={1} backgroundColor="canvas">
      <Stack.Screen options={{ title }} />

      {error ? (
        <Box padding="l">
          <KEmpty icon="error_outline" title="Couldn't open the PDF" message={error} />
          <KButton label="Try again" variant="secondary" onPress={() => setError(null)} />
        </Box>
      ) : (
        <Pdf
          source={{ uri: url, cache: true }}
          trustAllCerts={false}
          enablePaging
          style={{ flex: 1, width: Dimensions.get("window").width, backgroundColor: theme.colors.canvas }}
          onLoadComplete={(numberOfPages) => setPages(numberOfPages)}
          onPageChanged={(pageNumber) => setPage(pageNumber)}
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
