import { useTheme } from "@shopify/restyle"
import { Children } from "react"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"
import { PressScale } from "./motion"

/**
 * ListGroup / ListRow — the single row language for the whole app, mirroring the
 * web `components/kiz/primitives/list-group.tsx`. One grouped, inset-rounded
 * card with internal hairline dividers (the iOS Settings pattern).
 */

export function ListGroup({
  title,
  titleAccessory,
  children,
}: {
  title?: string
  /** Rendered beside the group title — e.g. an `AiBadge` on the AI & AR group. */
  titleAccessory?: React.ReactNode
  children: React.ReactNode
}) {
  const items = Children.toArray(children)
  return (
    <Box>
      {title ? (
        <Box flexDirection="row" alignItems="center" gap="s" marginBottom="s" marginLeft="xs">
          <Text variant="label">{title.toUpperCase()}</Text>
          {titleAccessory}
        </Box>
      ) : null}
      <Box
        borderRadius="cardLg"
        borderWidth={1}
        borderColor="border"
        backgroundColor="surface"
        overflow="hidden"
      >
        {items.map((child, index) => (
          <Box
            key={index}
            borderTopWidth={index === 0 ? 0 : 1}
            borderTopColor="border"
          >
            {child}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export function ListRow({
  icon,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  chevron,
  children,
}: {
  icon?: string
  title?: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  onPress?: () => void
  chevron?: boolean
  children?: React.ReactNode
}) {
  const theme = useTheme<Theme>()
  const showChevron = chevron ?? Boolean(onPress)

  const body = (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="m"
      paddingHorizontal="l"
      paddingVertical="m"
      minHeight={56}
    >
      {icon ? <Icon name={icon} size={20} color={theme.colors.ink300} /> : null}

      {children ?? (
        <Box flex={1} minWidth={0}>
          {title ? (
            <Text variant="bodyStrong" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </Box>
      )}

      {meta ? (
        <Text variant="caption" color="ink300">
          {meta}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Icon name="chevron_right" size={18} color={theme.colors.ink300} /> : null}
    </Box>
  )

  if (!onPress) return body

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={typeof title === "string" ? title : undefined}
    >
      {body}
    </PressScale>
  )
}
