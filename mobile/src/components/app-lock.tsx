import { useTheme } from "@shopify/restyle"
import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/lib/auth-context"
import { authenticateBiometric, biometricLabel, isBiometricEnabled } from "@/lib/biometric"
import { getToken } from "@/lib/storage"
import { Box, KButton, LoadingScreen, Text, type Theme } from "@/ui"
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
    const ok = await authenticateBiometric("Unlock MyKIZ")
    if (ok) setState("unlocked")
  }, [])

  useEffect(() => {
    if (state !== "locked") return
    let active = true
    ;(async () => {
      const ok = await authenticateBiometric("Unlock MyKIZ")
      if (active && ok) setState("unlocked")
    })()
    return () => {
      active = false
    }
  }, [state])

  if (state === "checking") return <LoadingScreen label="Unlocking…" />
  if (state === "unlocked") return <>{children}</>

  return <LockScreen label={label} onUnlock={unlock} onSignOut={signOut} />
}

function LockScreen({
  label,
  onUnlock,
  onSignOut,
}: {
  label: string
  onUnlock: () => void
  onSignOut: () => Promise<void>
}) {
  const theme = useTheme<Theme>()
  return (
    <Box flex={1} backgroundColor="canvas" alignItems="center" justifyContent="center" padding="xl" gap="l">
      <Box
        width={72}
        height={72}
        borderRadius="cardLg"
        backgroundColor="brand600"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name="fingerprint" size={36} color="#FFFFFF" />
      </Box>
      <Text variant="title">MyKIZ is locked</Text>
      <Text variant="body" textAlign="center">
        Unlock with {label} to continue.
      </Text>

      <Box width="100%" marginTop="l" gap="m">
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
        You can turn this off in Profile → Security.
      </Text>
    </Box>
  )
}
