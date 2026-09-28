import { Box, Text } from "./theme"

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="flex-start"
      justifyContent="space-between"
      gap="m"
      paddingTop="l"
      paddingBottom="l"
    >
      <Box flex={1} minWidth={0}>
        <Text variant="title" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" marginTop="xs">
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {action}
    </Box>
  )
}
