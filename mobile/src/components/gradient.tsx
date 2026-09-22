import { StyleSheet } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

/**
 * Soft gradient background (the RN equivalent of the web's CSS gradients).
 * `direction` "br" = diagonal (135°), "tb" = top-to-bottom.
 */
export function GradientBg({
  colors,
  id = "grad",
  direction = "br",
  opacity = 1,
}: {
  colors: string[]
  id?: string
  direction?: "br" | "tb"
  opacity?: number
}) {
  const [x1, y1, x2, y2] = direction === "tb" ? ["0", "0", "0", "1"] : ["0", "0", "1", "1"]
  const stops = colors.length > 1 ? colors : [colors[0] ?? "#0891B2", colors[0] ?? "#0891B2"]

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
          {stops.map((c, i) => (
            <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </Svg>
  )
}

/** The brand hero gradient (teal → sky), shared by headers and hero cards. */
export const HERO_GRADIENT = ["#0E7490", "#0891B2", "#22D3EE"]
