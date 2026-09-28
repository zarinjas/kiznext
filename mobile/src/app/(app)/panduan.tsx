import { router } from "expo-router"

import { absoluteUrl } from "@/lib/config"
import { useGuides, useMarkGuideRead } from "@/lib/hooks"
import type { Guide } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  CardGrid,
  KButton,
  KEmpty,
  Screen,
  Skeleton,
  StatusChip,
  Surface,
  Text,
  useToast,
} from "@/ui"

const CATEGORY_LABEL: Record<string, string> = {
  orientation: "Orientation",
  rules: "Rules & Regulations",
  program: "Programme",
  other: "Other",
}

export default function PanduanScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useGuides()
  const markRead = useMarkGuideRead()
  const toast = useToast()

  function open(guide: Guide) {
    const url = absoluteUrl(guide.fileUrl)
    if (!url) {
      // Previously a bare `return` — the button looked live and did nothing.
      toast.error("That guide has no file attached yet.")
      return
    }
    // Read-tracking is a nice-to-have, not a gate: a failed mark-as-read must
    // never stop someone opening the document. Fire it and log any failure
    // rather than surfacing it or awaiting it before navigating.
    markRead.mutate(guide.id, {
      onError: (e) => {
        console.warn("[panduan] couldn't mark guide as read", e)
      },
    })
    router.push({ pathname: "/pdf-viewer", params: { url, title: guide.title } })
  }

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={() => refetch()}
        skeleton={<Skeleton.CardList count={3} />}
        errorTitle="Couldn't load the library"
        errorMessage="Pull down or tap below to try again."
      >
        {(loaded) => {
          const guides = loaded.guides ?? []

          if (guides.length === 0) {
            return (
              <KEmpty
                icon="menu_book"
                title="No guides yet"
                message="Handbooks will appear here once published. Announcements carry the latest notices in the meantime."
                action={
                  <KButton
                    label="Read announcements"
                    icon="campaign"
                    onPress={() => router.push("/pengumuman")}
                  />
                }
              />
            )
          }

          return (
            <Box paddingTop="m">
              <CardGrid
                items={guides}
                phoneColumns={1}
                keyExtractor={(guide) => guide.id}
                renderItem={(guide) => {
                  const hasFile = Boolean(absoluteUrl(guide.fileUrl))
                  return (
                    <Surface>
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
                        {[
                          guide.sizeLabel,
                          guide.pageCount ? `${guide.pageCount} pages` : null,
                          guide.displayDate,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>

                      <Box marginTop="m">
                        <KButton
                          label={hasFile ? "Read guide" : "No file attached"}
                          icon="menu_book"
                          disabled={!hasFile}
                          onPress={() => open(guide)}
                        />
                      </Box>
                    </Surface>
                  )
                }}
              />
            </Box>
          )
        }}
      </AsyncBoundary>
      <Box height={32} />
    </Screen>
  )
}
