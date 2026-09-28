import { useLayout } from "@/lib/responsive"
import { FadeInUp } from "./motion"
import { Box } from "./theme"

/**
 * Responsive card grid.
 *
 * Screens previously used fixed percentage widths (`width: "47%"`), which meant
 * a two-up phone grid became two ~490pt cards on an iPad. This derives the
 * column count from `useLayout()` and uses flex basis so cards fill the row at
 * any width, with staggered entrance motion.
 */
export function CardGrid<T>({
  items,
  keyExtractor,
  renderItem,
  /** Column count on phones. Tablet/desktop scale up from `useLayout()`. */
  phoneColumns = 2,
  gap = "m",
  animate = true,
}: {
  items: T[]
  keyExtractor: (item: T, index: number) => string
  renderItem: (item: T, index: number) => React.ReactNode
  phoneColumns?: 1 | 2
  gap?: "s" | "m" | "l"
  animate?: boolean
}) {
  const { isTablet, width } = useLayout()

  // Phones keep the caller's intent; tablets add columns as width allows.
  const columns = width >= 1024 ? phoneColumns + 2 : isTablet ? phoneColumns + 1 : phoneColumns

  const basis = `${Math.floor(100 / columns) - 2}%` as const

  return (
    <Box flexDirection="row" flexWrap="wrap" gap={gap}>
      {items.map((item, i) => {
        const content = (
          <Box flexGrow={1} flexBasis={basis} minWidth={0}>
            {renderItem(item, i)}
          </Box>
        )
        return animate ? (
          <FadeInUp
            key={keyExtractor(item, i)}
            index={Math.min(i, 6)}
            style={{ flexGrow: 1, flexBasis: basis, minWidth: 0 }}
          >
            {renderItem(item, i)}
          </FadeInUp>
        ) : (
          <Box key={keyExtractor(item, i)} flexGrow={1} flexBasis={basis} minWidth={0}>
            {content}
          </Box>
        )
      })}
    </Box>
  )
}

/**
 * Horizontal rail of filter pills with consistent spacing. Wraps rather than
 * scrolls on tablet, where there is room for the full set.
 */
export function PillRail({ children }: { children: React.ReactNode }) {
  return (
    <Box flexDirection="row" flexWrap="wrap" gap="s">
      {children}
    </Box>
  )
}
