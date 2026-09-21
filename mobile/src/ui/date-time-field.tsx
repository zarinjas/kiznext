import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { useTheme } from "@shopify/restyle"
import { useState } from "react"
import { Modal, Platform, Pressable } from "react-native"

import { KButton } from "./controls"
import { Box, Text, type Theme } from "./theme"

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseTime(value: string): Date | null {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null
  const [h, m] = value.split(":").map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toHhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function prettyDate(value: string): string {
  const d = parseDate(value)
  if (!d) return ""
  return new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric" }).format(d)
}

function prettyTime(value: string): string {
  const d = parseTime(value)
  if (!d) return ""
  return new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit" }).format(d)
}

function FieldShell({
  label,
  display,
  placeholder,
  onPress,
}: {
  label: string
  display: string
  placeholder: string
  onPress: () => void
}) {
  const theme = useTheme<Theme>()
  return (
    <Box>
      <Text variant="label" marginBottom="xs" marginLeft="xs">
        {label}
      </Text>
      <Pressable onPress={onPress}>
        <Box
          borderWidth={1}
          borderColor="borderStrong"
          borderRadius="input"
          backgroundColor="surface"
          paddingHorizontal="m"
          height={48}
          justifyContent="center"
        >
          <Text variant={display ? "body" : "caption"} style={!display ? { color: theme.colors.ink300 } : undefined}>
            {display || placeholder}
          </Text>
        </Box>
      </Pressable>
    </Box>
  )
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Pick a date",
}: {
  label: string
  value: string
  onChange: (isoDate: string) => void
  minimumDate?: Date
  maximumDate?: Date
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const current = parseDate(value) ?? new Date()

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShow(false)
    if (event.type === "set" && date) onChange(toIsoDate(date))
  }

  return (
    <Box>
      <FieldShell
        label={label}
        display={prettyDate(value)}
        placeholder={placeholder}
        onPress={() => setShow(true)}
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
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Box flex={1} justifyContent="flex-end" backgroundColor="transparent">
            <Box backgroundColor="surface" borderTopLeftRadius="sheet" borderTopRightRadius="sheet" padding="l">
              <Text variant="subheading" marginBottom="s">
                {label}
              </Text>
              <DateTimePicker
                value={current}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handle}
              />
              <Box marginTop="m">
                <KButton label="Done" onPress={() => setShow(false)} />
              </Box>
            </Box>
          </Box>
        </Modal>
      ) : null}
    </Box>
  )
}

export function TimeField({
  label,
  value,
  onChange,
  placeholder = "Pick a time",
}: {
  label: string
  value: string
  onChange: (hhmm: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const current = parseTime(value) ?? new Date()

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShow(false)
    if (event.type === "set" && date) onChange(toHhmm(date))
  }

  return (
    <Box>
      <FieldShell
        label={label}
        display={prettyTime(value)}
        placeholder={placeholder}
        onPress={() => setShow(true)}
      />

      {show && Platform.OS === "android" ? (
        <DateTimePicker value={current} mode="time" is24Hour={false} onChange={handle} />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Box flex={1} justifyContent="flex-end" backgroundColor="transparent">
            <Box backgroundColor="surface" borderTopLeftRadius="sheet" borderTopRightRadius="sheet" padding="l">
              <Text variant="subheading" marginBottom="s">
                {label}
              </Text>
              <DateTimePicker
                value={current}
                mode="time"
                display="spinner"
                minuteInterval={5}
                onChange={handle}
              />
              <Box marginTop="m">
                <KButton label="Done" onPress={() => setShow(false)} />
              </Box>
            </Box>
          </Box>
        </Modal>
      ) : null}
    </Box>
  )
}
