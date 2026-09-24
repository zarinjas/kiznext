import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { useTheme } from "@shopify/restyle"
import {
  formatWallClockDate,
  formatWallClockTime,
  todayMalaysiaDate,
  wallClockDate,
  wallClockHhmm,
  wallClockIso,
  wallClockTime,
} from "@kiz/shared"
import { useState } from "react"
import { Modal, Platform } from "react-native"

import { KButton } from "./controls"
import { PressScale } from "./motion"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

/**
 * Date / time inputs.
 *
 * All parsing, serialising and formatting goes through the `wallClock*` helpers
 * in `@kiz/shared`, which resolve in `Asia/Kuala_Lumpur`. These previously used
 * raw `getFullYear()`/`new Date()`, so a phone on a non-MYT clock could submit a
 * shifted calendar day — a real hazard given KIZ's international residents, and
 * worst on facility slots where the booking time is a hard MYT concept.
 */

function FieldShell({
  label,
  display,
  placeholder,
  onPress,
  icon,
  error,
}: {
  label: string
  display: string
  placeholder: string
  onPress: () => void
  icon: string
  error?: string | null
}) {
  const theme = useTheme<Theme>()
  return (
    <Box>
      <Text variant="label" marginBottom="xs" marginLeft="xs">
        {label}
      </Text>
      <PressScale
        onPress={onPress}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${display || placeholder}`}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          gap="s"
          borderWidth={1}
          borderColor={error ? "danger" : "borderStrong"}
          borderRadius="input"
          backgroundColor="surface"
          paddingHorizontal="m"
          minHeight={48}
        >
          <Icon name={icon} size={18} color={theme.colors.ink300} />
          <Text
            variant={display ? "body" : "caption"}
            style={[{ flex: 1 }, !display ? { color: theme.colors.ink300 } : null]}
          >
            {display || placeholder}
          </Text>
        </Box>
      </PressScale>
      {error ? (
        <Text variant="caption" marginTop="xs" marginLeft="xs" style={{ color: theme.colors.dangerInk }}>
          {error}
        </Text>
      ) : null}
    </Box>
  )
}

/** iOS spinner sheet wrapper — shared by both fields. */
function PickerSheet({
  visible,
  label,
  onClose,
  children,
}: {
  visible: boolean
  label: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
        <Box
          backgroundColor="surface"
          borderTopLeftRadius="sheet"
          borderTopRightRadius="sheet"
          padding="l"
          paddingBottom="xl"
        >
          <Text variant="subheading" marginBottom="s">
            {label}
          </Text>
          {children}
          <Box marginTop="m">
            <KButton label="Done" onPress={onClose} />
          </Box>
        </Box>
      </Box>
    </Modal>
  )
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Pick a date",
  error,
}: {
  label: string
  /** `YYYY-MM-DD` wall-clock date. */
  value: string
  onChange: (isoDate: string) => void
  minimumDate?: Date
  maximumDate?: Date
  placeholder?: string
  error?: string | null
}) {
  const [show, setShow] = useState(false)
  const current = wallClockDate(value) ?? todayMalaysiaDate()

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShow(false)
    if (event.type === "set" && date) onChange(wallClockIso(date))
  }

  return (
    <Box>
      <FieldShell
        label={label}
        icon="calendar_month"
        display={formatWallClockDate(value)}
        placeholder={placeholder}
        onPress={() => setShow(true)}
        error={error}
      />

      {show && Platform.OS === "android" ? (
        <DateTimePicker
          value={current}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handle}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <PickerSheet visible={show} label={label} onClose={() => setShow(false)}>
          <DateTimePicker
            value={current}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handle}
          />
        </PickerSheet>
      ) : null}
    </Box>
  )
}

export function TimeField({
  label,
  value,
  onChange,
  placeholder = "Pick a time",
  error,
}: {
  label: string
  /** 24h `HH:MM` wall-clock time. */
  value: string
  onChange: (hhmm: string) => void
  placeholder?: string
  error?: string | null
}) {
  const [show, setShow] = useState(false)
  const current = wallClockTime(value) ?? wallClockTime("09:00")!

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShow(false)
    if (event.type === "set" && date) onChange(wallClockHhmm(date))
  }

  return (
    <Box>
      <FieldShell
        label={label}
        icon="timer"
        display={formatWallClockTime(value)}
        placeholder={placeholder}
        onPress={() => setShow(true)}
        error={error}
      />

      {show && Platform.OS === "android" ? (
        <DateTimePicker value={current} mode="time" is24Hour={false} onChange={handle} />
      ) : null}

      {Platform.OS === "ios" ? (
        <PickerSheet visible={show} label={label} onClose={() => setShow(false)}>
          <DateTimePicker
            value={current}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={handle}
          />
        </PickerSheet>
      ) : null}
    </Box>
  )
}
