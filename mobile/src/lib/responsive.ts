import { useWindowDimensions } from "react-native"

/**
 * Layout metrics for phone / tablet, portrait / landscape.
 *
 * The app ships `orientation: "default"` and `supportsTablet`, so every screen
 * can be presented on an iPad in either orientation — including projected
 * during a demo. Rather than branching per screen, the common cases are solved
 * once here and applied inside `<Screen>`:
 *
 *   - `contentMaxWidth` centres body content instead of letting a form field
 *     run 1024pt wide.
 *   - `columns` drives grids (facilities, laundry, lost & found).
 *   - `bubbleMaxWidth` caps chat/helpdesk bubbles, which a percentage alone
 *     cannot do sensibly across a 5x width range.
 */

/** Matches the `tablet` breakpoint declared in `ui/theme.ts`. */
export const TABLET_BREAKPOINT = 768
const DESKTOP_BREAKPOINT = 1024

export interface Layout {
  width: number
  height: number
  isTablet: boolean
  isLandscape: boolean
  /** Comfortable reading measure for body content; `undefined` on phones. */
  contentMaxWidth: number | undefined
  /** Grid column count for card collections. */
  columns: number
  /** Hard cap for chat-style bubbles. */
  bubbleMaxWidth: number
  /** Horizontal gutter — wider on tablets so content isn't edge-to-edge. */
  gutter: number
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions()

  const isTablet = width >= TABLET_BREAKPOINT
  const isLandscape = width > height

  return {
    width,
    height,
    isTablet,
    isLandscape,
    // 720pt is the classic comfortable measure; wide enough for two-up cards,
    // narrow enough that text lines don't become unreadable.
    contentMaxWidth: isTablet ? 720 : undefined,
    columns: width >= DESKTOP_BREAKPOINT ? 3 : isTablet ? 2 : 1,
    // 78% reads well on a phone but becomes an 800pt line on an iPad.
    bubbleMaxWidth: Math.min(width * 0.78, 460),
    gutter: isTablet ? 24 : 16,
  }
}

/**
 * Split a list into `columns` balanced column buckets, preserving order down
 * each column. Used for masonry-ish card grids where fixed-percentage widths
 * would leave ragged gaps on tablet.
 */
export function chunkColumns<T>(items: T[], columns: number): T[][] {
  if (columns <= 1) return [items]
  const buckets: T[][] = Array.from({ length: columns }, () => [])
  items.forEach((item, i) => {
    buckets[i % columns].push(item)
  })
  return buckets
}
