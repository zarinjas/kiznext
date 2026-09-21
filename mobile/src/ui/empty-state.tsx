import { useTheme } from "@shopify/restyle"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

export function KEmpty({
  icon = "inbox",
  title,
  message,
}: {
  icon?: string
  title: string
  message?: string
}) {
  const theme = useTheme<Theme>()
  return (
    <Box alignItems="center" justifyContent="center" paddingVertical="xxxl" gap="s">
      <Box
        width={56}
        height={56}
        borderRadius="pill"
        backgroundColor="canvasSunk"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name={icon} size={26} color={theme.colors.ink300} />
      </Box>
      <Text variant="subheading" textAlign="center">
        {title}
      </Text>
      {message ? (
        <Text variant="caption" textAlign="center" maxWidth={280}>
          {message}
        </Text>
      ) : null}
    </Box>
  )
}
