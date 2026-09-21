import * as WebBrowser from "expo-web-browser"

import { absoluteUrl } from "@/lib/config"
import { useGuides, useMarkGuideRead } from "@/lib/hooks"
import type { Guide } from "@/lib/types"
import { Box, KButton, KEmpty, LoadingScreen, Screen, StatusChip, Surface, Text } from "@/ui"

const CATEGORY_LABEL: Record<string, string> = {
  orientation: "Orientation",
  rules: "Rules & Regulations",
  program: "Programme",
  other: "Other",
}

export default function PanduanScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useGuides()
  const markRead = useMarkGuideRead()
  const guides = data?.guides ?? []

  function open(guide: Guide) {
    const url = absoluteUrl(guide.fileUrl)
    if (!url) return
    markRead.mutate(guide.id)
    WebBrowser.openBrowserAsync(url).catch(() => {})
  }

  if (isLoading) return <LoadingScreen label="Loading the library…" />

  return (
    <Screen
      scroll
      edges={[]}
      refreshing={isRefetching}
      onRefresh={() => refetch()}
    >
      {isError ? (
        <KEmpty icon="error_outline" title="Couldn't load the library" message="Pull down to try again." />
      ) : guides.length === 0 ? (
        <KEmpty icon="menu_book" title="No guides yet" message="Handbooks will appear here once published." />
      ) : (
        <Box gap="m" paddingTop="m">
          {guides.map((guide) => (
            <Surface key={guide.id}>
              <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
                <StatusChip
                  label={CATEGORY_LABEL[guide.category] ?? guide.category}
                  tone="brand"
                  icon="menu_book"
                />
                {guide.isPinned ? <StatusChip label="Pinned" tone="warning" icon="push_pin" /> : null}
                {guide.isNew ? <StatusChip label="New" tone="success" /> : null}
              </Box>

              <Text variant="subheading" marginTop="s">
                {guide.title}
              </Text>
              {guide.description ? (
                <Text variant="caption" marginTop="xs">
                  {guide.description}
                </Text>
              ) : null}
              <Text variant="caption" marginTop="s">
                {[guide.sizeLabel, guide.pageCount ? `${guide.pageCount} pages` : null, guide.displayDate]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>

              <Box marginTop="m">
                <KButton label="Read guide" icon="menu_book" onPress={() => open(guide)} />
              </Box>
            </Surface>
          ))}
        </Box>
      )}
      <Box height={32} />
    </Screen>
  )
}
