import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@shopify/restyle"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { configureNotificationHandler, registerForPushNotificationsAsync, syncDeviceToken } from "@/lib/notifications"
import { queryClient } from "@/lib/query-client"
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

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider theme={theme}>
              <StatusBar style="dark" />
              <PushRegistrar />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: theme.colors.canvas },
                }}
              />
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
