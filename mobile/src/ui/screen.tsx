import { ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import type { Edge } from "react-native-safe-area-context"
import { Box, Text } from "./theme"

export function Screen({
  children,
  scroll = false,
  refreshing = false,
  onRefresh,
  padded = true,
  edges = ["top"],
}: {
  children: React.ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  padded?: boolean
  edges?: Edge[]
}) {
  const content = padded ? <Box paddingHorizontal="l">{children}</Box> : children

  return (
    <SafeAreaView style={styles.flex} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={padded ? styles.scrollContent : undefined}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891B2" />
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
      <ActivityIndicator color="#0891B2" />
      <Box height={12} />
      <Text variant="caption">{label}</Text>
    </Box>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 40 },
})
