import { Box, Text } from "./theme"

/** Standalone bordered surface — replaces the repeated inline card recipe. */
export function Surface({
  children,
  padded = true,
}: {
  children: React.ReactNode
  padded?: boolean
}) {
  return (
    <Box
      borderRadius="cardLg"
      borderWidth={1}
      borderColor="border"
      backgroundColor="surface"
      padding={padded ? "l" : "none"}
    >
      {children}
    </Box>
  )
}

/** Soft gradient-equivalent hero panel (flat tint — RN has no CSS gradients). */
export function HeroPanel({
  children,
  tone = "brand",
}: {
  children: React.ReactNode
  tone?: "brand" | "accent"
}) {
  return (
    <Box
      borderRadius="cardLg"
      borderWidth={1}
      borderColor={tone === "brand" ? "brand100" : "accent100"}
      backgroundColor={tone === "brand" ? "brand50" : "accent50"}
      padding="l"
    >
      {children}
    </Box>
  )
}

export function Divider() {
  return <Box height={1} backgroundColor="border" />
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" marginBottom="s" marginLeft="xs">
      {typeof children === "string" ? children.toUpperCase() : children}
    </Text>
  )
}
