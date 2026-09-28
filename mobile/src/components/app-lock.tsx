import { useTheme } from "@shopify/restyle"
import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/lib/auth-context"
import { authenticateDetailed, biometricLabel, isBiometricEnabled } from "@/lib/biometric"
import { getToken } from "@/lib/storage"
import { Box, FadeInUp, KButton, LoadingScreen, Text, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

/**
 * Biometric app lock. When the user has enabled it, a stored session must be
 * unlocked with Face ID / fingerprint before the app renders. A fresh install
 * (no token) or a disabled flag passes straight through.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const [state, setState] = useState<"checking" | "locked" | "unlocked">("checking")
  const [label, setLabel] = useState("Biometric unlock")
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const [enabled, token] = await Promise.all([isBiometricEnabled(), getToken()])
      if (!active) return
      if (enabled && token) {
        setLabel(await biometricLabel())
        setState("locked")
      } else {
        setState("unlocked")
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const unlock = useCallback(async () => {
    setNotice(null)
    const result = await authenticateDetailed("Unlock MyKIZ")
    if (result.success) {
      setState("unlocked")
      return
    }
    // A cancel is a deliberate choice, not an error — don't nag. A genuine
    // failure (lockout, no enrolment) now explains itself instead of silently
    // dropping the user back on the same screen.
    if (!result.cancelled && result.reason) setNotice(result.reason)
  }, [])

  // Auto-prompt once on mount so the common path is a single glance.
  useEffect(() => {
    if (state !== "locked") return
    let active = true
    ;(async () => {
      const result = await authenticateDetailed("Unlock MyKIZ")
      if (!active) return
      if (result.success) setState("unlocked")
      else if (!result.cancelled && result.reason) setNotice(result.reason)
    })()
    return () => {
      active = false
    }
  }, [state])

  if (state === "checking") return <LoadingScreen label="Unlocking…" />
  if (state === "unlocked") return <>{children}</>

  return <LockScreen label={label} notice={notice} onUnlock={unlock} onSignOut={signOut} />
}

function LockScreen({
  label,
  notice,
  onUnlock,
  onSignOut,
}: {
  label: string
  notice: string | null
  onUnlock: () => void
  onSignOut: () => Promise<void>
}) {
  const theme = useTheme<Theme>()
  return (
    <Box flex={1} backgroundColor="canvas" alignItems="center" justifyContent="center" padding="xl" gap="l">
      <Box width="100%" maxWidth={380} alignItems="center" gap="l">
        <Box
          width={72}
          height={72}
          borderRadius="cardLg"
          backgroundColor="brand600"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name="fingerprint" size={36} color={theme.colors.white} />
        </Box>
        <Text variant="title">MyKIZ is locked</Text>
        <Text variant="body" textAlign="center">
          Unlock with {label} to continue.
        </Text>

        {notice ? (
          <FadeInUp>
            <Box
              borderRadius="input"
              backgroundColor="warningSoft"
              paddingHorizontal="m"
              paddingVertical="s"
            >
              <Text variant="caption" textAlign="center" style={{ color: theme.colors.warningInk }}>
                {notice}
              </Text>
            </Box>
          </FadeInUp>
        ) : null}

        <Box width="100%" marginTop="s" gap="m">
          <KButton label={`Unlock with ${label}`} icon="fingerprint" onPress={onUnlock} />
          <KButton
            label="Sign out instead"
            variant="ghost"
            onPress={async () => {
              await onSignOut()
            }}
          />
        </Box>

        <Text variant="caption" textAlign="center" style={{ color: theme.colors.ink300 }}>
          Your device passcode also works. You can turn this off in Profile → Security.
        </Text>
      </Box>
    </Box>
  )
}
