import { useTheme } from "@shopify/restyle"
import { reloadAppAsync } from "expo"
import { ScrollView } from "react-native"

import { Box, KButton, Text, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

/**
 * Root error boundary.
 *
 * Expo Router picks this up by name when re-exported from the root `_layout`.
 * Without it, a render error in any one screen white-screens the entire app —
 * an unacceptable failure mode mid-demo. The stack is kept behind a scroll view
 * in dev only; in production the user just gets a way back in.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const theme = useTheme<Theme>()

  return (
    <Box flex={1} backgroundColor="canvas" padding="xl" justifyContent="center" gap="l">
      <Box alignItems="center" gap="m">
        <Box
          width={72}
          height={72}
          borderRadius="pill"
          backgroundColor="dangerSoft"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name="error_outline" size={34} color={theme.colors.dangerInk} />
        </Box>
        <Text variant="title" textAlign="center">
          Something went wrong
        </Text>
        <Text variant="body" textAlign="center" style={{ maxWidth: 320 }}>
          That screen hit an unexpected error. Your data is safe — try again, or restart the app.
        </Text>
      </Box>

      {__DEV__ ? (
        <Box
          maxHeight={200}
          borderRadius="card"
          backgroundColor="canvasSunk"
          borderWidth={1}
          borderColor="border"
          padding="m"
        >
          <ScrollView>
            <Text variant="caption" style={{ fontFamily: "Menlo", color: theme.colors.dangerInk }}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </Text>
          </ScrollView>
        </Box>
      ) : null}

      <Box gap="s">
        <KButton label="Try again" icon="refresh" onPress={() => void retry()} />
        <KButton
          label="Restart app"
          variant="secondary"
          onPress={() => {
            void reloadAppAsync().catch(() => {})
          }}
        />
      </Box>
    </Box>
  )
}
