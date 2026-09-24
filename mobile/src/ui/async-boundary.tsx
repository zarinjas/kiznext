import { useTheme } from "@shopify/restyle"

import { KButton } from "./controls"
import { KEmpty } from "./empty-state"
import { FadeInUp } from "./motion"
import { Skeleton } from "./skeleton"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

/**
 * The one place query loading/error is handled.
 *
 * Replaces the `if (isLoading || !data) return <LoadingScreen />` pattern, which
 * never terminates on a fetch error (React Query sets `isLoading: false` and
 * leaves `data` undefined, so the guard stays true forever and the user is
 * stranded on a spinner with no retry).
 *
 * Three behaviours worth keeping:
 *  - Error with no data → an actionable retry, not a spinner.
 *  - Error *with* cached data → render the cached data and show an offline
 *    notice. The app persists its query cache for 24h, so this turns the worst
 *    failure mode into a genuine offline-first feature.
 *  - Loading → a skeleton of the right shape, so the header stays mounted and
 *    the layout doesn't jump.
 */
export function AsyncBoundary<T>({
  data,
  isLoading,
  isError,
  refetch,
  skeleton,
  errorTitle = "Couldn't load this",
  errorMessage = "Check your connection and try again.",
  children,
}: {
  data: T | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
  /** Shape-matched placeholder. Defaults to a generic card stack. */
  skeleton?: React.ReactNode
  errorTitle?: string
  errorMessage?: string
  children: (data: T, stale: boolean) => React.ReactNode
}) {
  // Cached data present but the refresh failed — show content, flag staleness.
  if (data !== undefined && isError) {
    return (
      <>
        <OfflineNotice onRetry={refetch} />
        {children(data, true)}
      </>
    )
  }

  if (data !== undefined) return <>{children(data, false)}</>

  if (isError) {
    return (
      <KEmpty
        icon="error_outline"
        tone="danger"
        title={errorTitle}
        message={errorMessage}
        action={<KButton label="Try again" icon="refresh" onPress={refetch} />}
      />
    )
  }

  if (isLoading) return <>{skeleton ?? <Skeleton.CardList />}</>

  // No data, not loading, not an error — an empty successful response.
  return null
}

/** Slim banner shown when displaying cached data after a failed refresh. */
export function OfflineNotice({ onRetry }: { onRetry?: () => void }) {
  const theme = useTheme<Theme>()
  return (
    <FadeInUp>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="s"
        marginBottom="m"
        paddingHorizontal="m"
        paddingVertical="s"
        borderRadius="input"
        backgroundColor="warningSoft"
        borderWidth={1}
        borderColor="warningSoft"
      >
        <Icon name="wifi" size={16} color={theme.colors.warningInk} />
        <Text variant="caption" style={{ flex: 1, color: theme.colors.warningInk }}>
          Showing saved data — you&apos;re offline.
        </Text>
        {onRetry ? (
          <Text
            variant="caption"
            onPress={onRetry}
            style={{ color: theme.colors.warningInk, fontWeight: "700" }}
            suppressHighlighting
          >
            Retry
          </Text>
        ) : null}
      </Box>
    </FadeInUp>
  )
}
