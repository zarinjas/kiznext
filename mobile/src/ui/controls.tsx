import { useTheme } from "@shopify/restyle"
import { ActivityIndicator, Pressable, TextInput, type ViewStyle } from "react-native"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const VARIANT: Record<
  Variant,
  { bg: keyof Theme["colors"]; text: keyof Theme["colors"]; border?: keyof Theme["colors"] }
> = {
  primary: { bg: "brand600", text: "white" },
  secondary: { bg: "surface", text: "ink900", border: "borderStrong" },
  ghost: { bg: "transparent", text: "brand700" },
  danger: { bg: "danger", text: "white" },
}

export function KButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  icon?: string
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}) {
  const theme = useTheme<Theme>()
  const v = VARIANT[variant]
  const isDisabled = disabled || loading

  const style: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadii.button,
    backgroundColor: theme.colors[v.bg],
    borderWidth: v.border ? 1 : 0,
    borderColor: v.border ? theme.colors[v.border] : undefined,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  }

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      style={({ pressed }) => [style, pressed && !isDisabled ? { opacity: 0.85 } : null]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors[v.text]} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={theme.colors[v.text]} /> : null}
          <Text variant="button" style={{ color: theme.colors[v.text] }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  )
}

/** Full-width text input styled to the design system. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType,
  editable = true,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad"
  editable?: boolean
  onSubmitEditing?: () => void
  returnKeyType?: "done" | "next" | "go"
}) {
  const theme = useTheme<Theme>()
  return (
    <Box>
      <Text variant="label" marginBottom="xs" marginLeft="xs">
        {label}
      </Text>
      <Box
        borderWidth={1}
        borderColor="borderStrong"
        borderRadius="input"
        backgroundColor="surface"
        paddingHorizontal="m"
      >
        <TextInput
          style={{
            height: 48,
            fontSize: 15,
            color: theme.colors.ink900,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.ink300}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
      </Box>
    </Box>
  )
}
