import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { ThemeProvider } from "@shopify/restyle"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppLock } from "@/components/app-lock"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { useOnboardingSlides } from "@/lib/hooks"
import { configureNotificationHandler, registerForPushNotificationsAsync, syncDeviceToken } from "@/lib/notifications"
import { persister } from "@/lib/persister"
import { queryClient } from "@/lib/query-client"
import { hasSeenOnboarding } from "@/lib/storage"
import { theme } from "@/ui/theme"

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
 * Sends first-launch users to the admin-managed onboarding carousel. Re-checks
 * the "seen" flag whenever the route changes, so finishing/skipping doesn't
 * bounce straight back.
 */
function OnboardingGate() {
  const router = useRouter()
  const segments = useSegments()
  const { data } = useOnboardingSlides()
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
  const slideCount = data?.slides.length ?? 0

  useEffect(() => {
    if (seen === null) return
    if (!seen && slideCount > 0 && !onOnboarding) {
      router.replace("/onboarding")
    }
  }, [seen, slideCount, onOnboarding, router])

  return null
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
            </ThemeProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
