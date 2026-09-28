import { useTheme } from "@shopify/restyle"

import { FadeInUp } from "./motion"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

/**
 * Empty / error state.
 *
 * `action` is the important prop: on a fresh account most of what a resident
 * (or a judge) sees *is* empty states, so every one of them should offer the
 * next step rather than dead-ending. Tone switches the icon tint so an error
 * reads as recoverable rather than as "nothing here".
 */
export function KEmpty({
  icon = "inbox",
  title,
  message,
  action,
  tone = "neutral",
}: {
  icon?: string
  title: string
  message?: string
  /** A `KButton` (or two) giving the user somewhere to go from here. */
  action?: React.ReactNode
  tone?: "neutral" | "danger" | "brand"
}) {
  const theme = useTheme<Theme>()

  const tint =
    tone === "danger"
      ? { bg: "dangerSoft" as const, fg: theme.colors.dangerInk }
      : tone === "brand"
        ? { bg: "brand50" as const, fg: theme.colors.brand600 }
        : { bg: "canvasSunk" as const, fg: theme.colors.ink300 }

  return (
    <FadeInUp>
      <Box alignItems="center" justifyContent="center" paddingVertical="xxxl" paddingHorizontal="l" gap="s">
        <Box
          width={64}
          height={64}
          borderRadius="pill"
          backgroundColor={tint.bg}
          alignItems="center"
          justifyContent="center"
        >
          <Icon name={icon} size={28} color={tint.fg} />
        </Box>
        <Text variant="subheading" textAlign="center">
          {title}
        </Text>
        {message ? (
          <Text variant="caption" textAlign="center" maxWidth={300}>
            {message}
          </Text>
        ) : null}
        {action ? (
          <Box marginTop="m" width="100%" maxWidth={280} gap="s">
            {action}
          </Box>
        ) : null}
      </Box>
    </FadeInUp>
  )
}
