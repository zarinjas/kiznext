import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { ThemeProvider } from "@shopify/restyle"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useMemo, useState } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppLock } from "@/components/app-lock"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { DemoContext, isDemoEnabled, setDemoEnabled } from "@/lib/demo"
import { useOnboardingSlides } from "@/lib/hooks"
import { configureNotificationHandler, registerForPushNotificationsAsync, syncDeviceToken } from "@/lib/notifications"
import { persister } from "@/lib/persister"
import { queryClient } from "@/lib/query-client"
import { hasSeenOnboarding } from "@/lib/storage"
import { ToastProvider } from "@/ui"
import { theme } from "@/ui/theme"

export { ErrorBoundary } from "@/components/error-boundary"

configureNotificationHandler()
SplashScreen.preventAutoHideAsync().catch(() => {})

/** Registers the device's Expo push token once a user is signed in. */
function PushRegistrar() {
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const token = await registerForPushNotificationsAsync()
      if (token && !cancelled) {
        try {
          await syncDeviceToken(token)
        } catch {
          // Non-fatal — the app works without push.
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  return null
}

/**
 * Sends first-launch users to the onboarding carousel. Unlike before, the gate
 * no longer requires the CMS to return slides — `onboarding.tsx` ships bundled
 * fallback slides, so a cold or offline first launch still gets a real
 * introduction instead of dropping straight onto the login form.
 */
function OnboardingGate() {
  const router = useRouter()
  const segments = useSegments()
  const { isLoading } = useOnboardingSlides()
  const [seen, setSeen] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    hasSeenOnboarding().then((value) => {
      if (active) setSeen(value)
    })
    return () => {
      active = false
    }
  }, [segments])

  const onOnboarding = segments[0] === "onboarding"

  useEffect(() => {
    if (seen === null || isLoading) return
    if (!seen && !onOnboarding) router.replace("/onboarding")
  }, [seen, isLoading, onOnboarding, router])

  return null
}

/** Demo Mode state, hoisted so any screen can read it without prop drilling. */
function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemoState] = useState(false)

  useEffect(() => {
    isDemoEnabled().then(setDemoState)
  }, [])

  const setDemo = useCallback((on: boolean) => {
    setDemoState(on)
    void setDemoEnabled(on)
  }, [])

  const value = useMemo(() => ({ demo, setDemo }), [demo, setDemo])

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
        >
          <AuthProvider>
            <ThemeProvider theme={theme}>
              <DemoProvider>
                <ToastProvider>
                  <StatusBar style="dark" />
                  <PushRegistrar />
                  <AppLock>
                    <OnboardingGate />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: theme.colors.canvas },
                      }}
                    />
                  </AppLock>
                </ToastProvider>
              </DemoProvider>
            </ThemeProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
