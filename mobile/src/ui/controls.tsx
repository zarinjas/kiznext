import { useTheme } from "@shopify/restyle"
import { ActivityIndicator, TextInput, type ViewStyle } from "react-native"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"
import { PressScale } from "./motion"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "md" | "sm"

const VARIANT: Record<
  Variant,
  { bg: keyof Theme["colors"]; text: keyof Theme["colors"]; border?: keyof Theme["colors"] }
> = {
  primary: { bg: "brand600", text: "white" },
  secondary: { bg: "surface", text: "ink900", border: "borderStrong" },
  ghost: { bg: "transparent", text: "brand700" },
  danger: { bg: "danger", text: "white" },
}

/**
 * Primary button.
 *
 * Wraps `PressScale`, so every button in the app gets spring press physics and
 * a light haptic for free. `minHeight` is pinned at 44 (Apple's minimum target)
 * even at `size="sm"`.
 */
export function KButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  size = "md",
}: {
  label: string
  onPress: () => void
  variant?: Variant
  icon?: string
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: Size
}) {
  const theme = useTheme<Theme>()
  const v = VARIANT[variant]
  const isDisabled = disabled || loading

  const style: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    paddingVertical: size === "sm" ? 10 : 14,
    paddingHorizontal: size === "sm" ? 14 : 18,
    borderRadius: theme.borderRadii.button,
    backgroundColor: theme.colors[v.bg],
    borderWidth: v.border ? 1 : 0,
    borderColor: v.border ? theme.colors[v.border] : undefined,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  }

  return (
    <PressScale
      onPress={onPress}
      disabled={isDisabled}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
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
    </PressScale>
  )
}

/**
 * Pill control — filter chips, category pickers, segmented toggles.
 *
 * Exists so these stop being hand-rolled per screen at ~34px tall (below the
 * 44px minimum) with no press feedback. `minHeight: 44` + selection haptic.
 */
export function KPill({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
}: {
  label: string
  selected?: boolean
  onPress: () => void
  icon?: string
  disabled?: boolean
}) {
  const theme = useTheme<Theme>()

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadii.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.brand600 : theme.colors.border,
        backgroundColor: selected ? theme.colors.brand50 : theme.colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={selected ? theme.colors.brand700 : theme.colors.ink500}
        />
      ) : null}
      <Text
        variant="caption"
        style={{
          color: selected ? theme.colors.brand700 : theme.colors.ink500,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </PressScale>
  )
}

/**
 * 44px icon-only button. Replaces the bare `<Text>Close</Text>` affordances
 * (~18px, no hit area, no a11y role) used across the bottom sheets.
 */
export function KIconButton({
  icon,
  onPress,
  label,
  tone = "neutral",
}: {
  icon: string
  onPress: () => void
  /** Required — this is the only label a screen reader gets. */
  label: string
  tone?: "neutral" | "danger" | "brand"
}) {
  const theme = useTheme<Theme>()
  const fg =
    tone === "danger"
      ? theme.colors.dangerInk
      : tone === "brand"
        ? theme.colors.brand700
        : theme.colors.ink500

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: theme.borderRadii.pill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={22} color={fg} />
    </PressScale>
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
  error,
  multiline = false,
  autoFocus = false,
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
  /** Inline validation message — also drives the error border. */
  error?: string | null
  multiline?: boolean
  autoFocus?: boolean
}) {
  const theme = useTheme<Theme>()
  return (
    <Box>
      <Text variant="label" marginBottom="xs" marginLeft="xs">
        {label}
      </Text>
      <Box
        borderWidth={1}
        borderColor={error ? "danger" : "borderStrong"}
        borderRadius="input"
        backgroundColor="surface"
        paddingHorizontal="m"
      >
        <TextInput
          style={{
            minHeight: multiline ? 88 : 48,
            paddingTop: multiline ? 12 : 0,
            paddingBottom: multiline ? 12 : 0,
            fontSize: 15,
            color: theme.colors.ink900,
            textAlignVertical: multiline ? "top" : "center",
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
          multiline={multiline}
          autoFocus={autoFocus}
          accessibilityLabel={label}
        />
      </Box>
      {error ? (
        <Text variant="caption" marginTop="xs" marginLeft="xs" style={{ color: theme.colors.dangerInk }}>
          {error}
        </Text>
      ) : null}
    </Box>
  )
}
