import { Shimmer } from "./motion"
import { Box } from "./theme"

/**
 * Skeleton placeholders.
 *
 * Preferred over a full-screen spinner because they keep the header and tab bar
 * mounted (no layout jump on every cold load) and communicate the shape of what
 * is arriving. Shapes are intentionally approximate — matching the real layout
 * to the pixel is not worth the maintenance.
 */

function Bar({
  width = "100%",
  height = 12,
  radius = "input" as const,
}: {
  width?: number | `${number}%`
  height?: number
  radius?: "input" | "card" | "pill"
}) {
  return <Box width={width} height={height} borderRadius={radius} backgroundColor="canvasSunk" />
}

function Line({ width = "100%", height = 12 }: { width?: number | `${number}%`; height?: number }) {
  return <Bar width={width} height={height} />
}

/** Generic stacked cards — the default fallback. */
function CardList({ count = 3 }: { count?: number }) {
  return (
    <Shimmer>
      <Box gap="m" paddingTop="m">
        {Array.from({ length: count }).map((_, i) => (
          <Box
            key={i}
            borderRadius="cardLg"
            borderWidth={1}
            borderColor="border"
            backgroundColor="surface"
            padding="l"
            gap="s"
          >
            <Line width="55%" height={14} />
            <Line width="90%" />
            <Line width="70%" />
          </Box>
        ))}
      </Box>
    </Shimmer>
  )
}

/** Rows inside a grouped list card. */
function Rows({ count = 5 }: { count?: number }) {
  return (
    <Shimmer>
      <Box
        borderRadius="cardLg"
        borderWidth={1}
        borderColor="border"
        backgroundColor="surface"
        overflow="hidden"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Box
            key={i}
            flexDirection="row"
            alignItems="center"
            gap="m"
            padding="l"
            minHeight={56}
            borderTopWidth={i === 0 ? 0 : 1}
            borderTopColor="border"
          >
            <Box width={22} height={22} borderRadius="pill" backgroundColor="canvasSunk" />
            <Box flex={1} gap="xs">
              <Line width="45%" />
              <Line width="70%" height={10} />
            </Box>
          </Box>
        ))}
      </Box>
    </Shimmer>
  )
}

/** Two-up tile grid — laundry machines, facilities. */
function Grid({ count = 4 }: { count?: number }) {
  return (
    <Shimmer>
      <Box flexDirection="row" flexWrap="wrap" gap="m" paddingTop="m">
        {Array.from({ length: count }).map((_, i) => (
          <Box
            key={i}
            flexGrow={1}
            flexBasis="45%"
            borderRadius="cardLg"
            borderWidth={1}
            borderColor="border"
            backgroundColor="surface"
            padding="m"
            gap="s"
          >
            <Bar height={72} radius="card" />
            <Line width="70%" />
            <Line width="45%" height={10} />
          </Box>
        ))}
      </Box>
    </Shimmer>
  )
}

/** Feed items with a media thumbnail — announcements. */
function Feed({ count = 3 }: { count?: number }) {
  return (
    <Shimmer>
      <Box gap="m" paddingTop="m">
        {Array.from({ length: count }).map((_, i) => (
          <Box
            key={i}
            flexDirection="row"
            gap="m"
            borderRadius="cardLg"
            borderWidth={1}
            borderColor="border"
            backgroundColor="surface"
            padding="m"
          >
            <Box flex={1} gap="s">
              <Line width="35%" height={10} />
              <Line width="85%" height={14} />
              <Line width="100%" />
              <Line width="60%" />
            </Box>
            <Bar width={84} height={84} radius="card" />
          </Box>
        ))}
      </Box>
    </Shimmer>
  )
}

/** Chat/helpdesk thread bubbles. */
function Bubbles({ count = 6 }: { count?: number }) {
  return (
    <Shimmer>
      <Box gap="m" padding="l">
        {Array.from({ length: count }).map((_, i) => (
          <Box key={i} alignItems={i % 3 === 0 ? "flex-end" : "flex-start"}>
            <Bar
              width={i % 3 === 0 ? "55%" : "70%"}
              height={i % 2 === 0 ? 44 : 60}
              radius="card"
            />
          </Box>
        ))}
      </Box>
    </Shimmer>
  )
}

export const Skeleton = { Bar, Line, CardList, Rows, Grid, Feed, Bubbles }
