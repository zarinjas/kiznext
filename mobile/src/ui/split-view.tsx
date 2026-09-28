import { useLayout } from "@/lib/responsive"
import { KEmpty } from "./empty-state"
import { FadeInUp } from "./motion"
import { Box } from "./theme"

/**
 * Two-pane list/detail layout for tablets.
 *
 * On a phone (or a portrait tablet) this renders the list alone and the caller
 * navigates to a detail screen as usual — behaviour is unchanged. In tablet
 * landscape it shows both panes side by side, which is the single clearest
 * "designed for iPad" signal available and the layout reviewers expect from a
 * mail/settings-shaped screen.
 *
 * The caller keeps owning navigation: `useSplitView()` reports whether the split
 * is active so a row press can either push a route (phone) or set local
 * selection state (tablet).
 */
export function SplitView({
  list,
  detail,
  /** Shown in the detail pane when nothing is selected. */
  placeholderTitle = "Nothing selected",
  placeholderMessage = "Pick an item from the list to see it here.",
  placeholderIcon = "inbox",
  /** Fraction of width given to the list pane. */
  listFraction = 0.38,
}: {
  list: React.ReactNode
  detail: React.ReactNode | null
  placeholderTitle?: string
  placeholderMessage?: string
  placeholderIcon?: string
  listFraction?: number
}) {
  const { isSplit } = useSplitView()

  if (!isSplit) return <>{list}</>

  return (
    <Box flex={1} flexDirection="row">
      <Box flex={listFraction} borderRightWidth={1} borderRightColor="border">
        {list}
      </Box>
      <Box flex={1 - listFraction}>
        {detail ? (
          <FadeInUp style={{ flex: 1 }}>{detail}</FadeInUp>
        ) : (
          <Box flex={1} justifyContent="center">
            <KEmpty icon={placeholderIcon} title={placeholderTitle} message={placeholderMessage} />
          </Box>
        )}
      </Box>
    </Box>
  )
}

/**
 * Whether a list/detail screen should present as two panes.
 *
 * Requires landscape as well as tablet width: a portrait iPad is tall and narrow
 * enough that a single column still reads better than two cramped ones.
 */
export function useSplitView(): { isSplit: boolean } {
  const { isTablet, isLandscape } = useLayout()
  return { isSplit: isTablet && isLandscape }
}
