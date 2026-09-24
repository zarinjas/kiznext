import { useTheme } from "@shopify/restyle"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet } from "react-native"
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"

import { notifyError, notifySuccess, notifyWarning } from "@/lib/feedback"
import { KIconButton } from "./controls"
import { Box, Text, type Theme } from "./theme"
import { Icon } from "./icon"

/**
 * App-wide toast.
 *
 * Replaces two inconsistent patterns: `Alert.alert` (a blocking OS modal that
 * interrupts the flow and looks nothing like the app) and inline success banners
 * that never dismissed. Each toast carries the matching haptic, so feedback is
 * felt as well as seen.
 */

type ToastTone = "success" | "error" | "warning" | "info"

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

const AUTO_DISMISS_MS = 3200

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    seq.current += 1
    const id = seq.current
    setItems((prev) => [...prev.slice(-2), { id, tone, message }])

    if (tone === "success") notifySuccess()
    else if (tone === "error") notifyError()
    else if (tone === "warning") notifyWarning()
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      warning: (m) => show(m, "warning"),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <SafeAreaView style={styles.host} edges={["top"]} pointerEvents="box-none">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const theme = useTheme<Theme>()

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const palette =
    item.tone === "success"
      ? { bg: theme.colors.successSoft, fg: theme.colors.successInk, icon: "check_circle" }
      : item.tone === "error"
        ? { bg: theme.colors.dangerSoft, fg: theme.colors.dangerInk, icon: "error_outline" }
        : item.tone === "warning"
          ? { bg: theme.colors.warningSoft, fg: theme.colors.warningInk, icon: "info_outline" }
          : { bg: theme.colors.infoSoft, fg: theme.colors.infoInk, icon: "info_outline" }

  return (
    <Animated.View entering={SlideInUp.springify().damping(18)} exiting={SlideOutUp.duration(180)}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="s"
        marginHorizontal="l"
        marginTop="s"
        paddingLeft="m"
        paddingRight="xs"
        paddingVertical="xs"
        borderRadius="card"
        style={{
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.fg + "33",
          shadowColor: "#0F263F",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          elevation: 4,
        }}
        accessibilityLiveRegion="polite"
      >
        <Icon name={palette.icon} size={18} color={palette.fg} />
        <Text variant="caption" style={{ flex: 1, color: palette.fg, fontWeight: "600" }}>
          {item.message}
        </Text>
        <KIconButton icon="close" label="Dismiss" onPress={onDismiss} />
      </Box>
    </Animated.View>
  )
}

/**
 * Toasts are an enhancement, so this returns a no-op API rather than throwing
 * when used outside the provider — a missing provider must never crash a screen.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  return (
    ctx ?? {
      show: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
    }
  )
}

const styles = StyleSheet.create({
  host: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 999 },
})
