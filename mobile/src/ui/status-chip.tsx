import { useTheme } from "@shopify/restyle"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

export type ChipTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral"

const TONES: Record<ChipTone, { bg: keyof Theme["colors"]; fg: keyof Theme["colors"] }> = {
  brand: { bg: "brand50", fg: "brand700" },
  success: { bg: "successSoft", fg: "successInk" },
  warning: { bg: "warningSoft", fg: "warningInk" },
  danger: { bg: "dangerSoft", fg: "dangerInk" },
  info: { bg: "infoSoft", fg: "infoInk" },
  neutral: { bg: "neutralSoft", fg: "neutralInk" },
}

export function StatusChip({
  label,
  tone = "neutral",
  icon,
  alignSelf = "flex-start",
}: {
  label: string
  tone?: ChipTone
  icon?: string
  alignSelf?: "flex-start" | "center" | "flex-end"
}) {
  const theme = useTheme<Theme>()
  const t = TONES[tone]
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="xs"
      alignSelf={alignSelf}
      backgroundColor={t.bg}
      borderRadius="pill"
      paddingHorizontal="s"
      paddingVertical="xs"
    >
      {icon ? <Icon name={icon} size={14} color={theme.colors[t.fg]} /> : null}
      <Text variant="caption" style={{ color: theme.colors[t.fg], fontWeight: "600" }}>
        {label}
      </Text>
    </Box>
  )
}
