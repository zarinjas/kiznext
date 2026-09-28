import { ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import type { Edge } from "react-native-safe-area-context"

import { useLayout } from "@/lib/responsive"
import { Box, Text, theme } from "./theme"

/**
 * The standard page wrapper.
 *
 * On tablets, padded content is centred and capped at a comfortable measure
 * (`useLayout().contentMaxWidth`) rather than stretching across 1024pt — this
 * single change is what makes the whole app look designed for iPad. Screens
 * that own the full viewport (camera, maps, chat) opt out with `padded={false}`
 * and handle their own layout.
 */
export function Screen({
  children,
  scroll = false,
  refreshing = false,
  onRefresh,
  padded = true,
  edges = ["top"],
  /** Set false to keep padded content full-bleed on tablet (e.g. wide grids). */
  constrain = true,
}: {
  children: React.ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  padded?: boolean
  edges?: Edge[]
  constrain?: boolean
}) {
  const { contentMaxWidth, gutter } = useLayout()
  const maxWidth = constrain ? contentMaxWidth : undefined

  const content = padded ? (
    <Box paddingHorizontal={undefined} style={{ paddingHorizontal: gutter, width: "100%", maxWidth, alignSelf: "center" }}>
      {children}
    </Box>
  ) : (
    children
  )

  return (
    <SafeAreaView style={styles.flex} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={padded ? styles.scrollContent : undefined}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.brand600}
                colors={[theme.colors.brand600]}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <Box flex={1}>{content}</Box>
      )}
    </SafeAreaView>
  )
}

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <Box flex={1} alignItems="center" justifyContent="center" backgroundColor="canvas">
      <ActivityIndicator color={theme.colors.brand600} />
      <Box height={12} />
      <Text variant="caption">{label}</Text>
    </Box>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.canvas },
  scrollContent: { paddingBottom: 40 },
})
