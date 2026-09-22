import { Redirect, Stack } from "expo-router"

import { useAuth } from "@/lib/auth-context"
import { LoadingScreen } from "@/ui"
import { theme } from "@/ui/theme"

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen label="Signing you in…" />
  if (!user) return <Redirect href="/login" />

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.ink900,
        headerTitleStyle: { fontSize: 17, fontWeight: "600" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile" }} />
      <Stack.Screen name="panduan" options={{ headerShown: true, title: "Digital Guide" }} />
      <Stack.Screen name="helpdesk" options={{ headerShown: true, title: "Help & Support" }} />
      <Stack.Screen name="sos" options={{ headerShown: true, title: "SOS" }} />
      <Stack.Screen
        name="helpdesk/[ticketId]"
        options={{ headerShown: true, title: "Request" }}
      />
      <Stack.Screen name="bilik" options={{ headerShown: true, title: "Room Selection" }} />
      <Stack.Screen name="checkin" options={{ headerShown: true, title: "Check-in / Out" }} />
      <Stack.Screen name="scan" options={{ headerShown: true, title: "Scan QR" }} />
      <Stack.Screen
        name="tempahan-fasiliti"
        options={{ headerShown: true, title: "Facilities" }}
      />
      <Stack.Screen name="rumah-tamu" options={{ headerShown: true, title: "Guest House" }} />
      <Stack.Screen name="tempahan" options={{ headerShown: true, title: "My Bookings" }} />
      <Stack.Screen name="hilang" options={{ headerShown: true, title: "Lost & Found" }} />
      <Stack.Screen name="pejabat" options={{ headerShown: true, title: "Offices" }} />
      <Stack.Screen name="direktori" options={{ headerShown: true, title: "AR Directory" }} />
      <Stack.Screen name="ar-terjemah" options={{ headerShown: true, title: "AR Translate" }} />
      <Stack.Screen name="urus-helpdesk" options={{ headerShown: true, title: "Helpdesk Inbox" }} />
      <Stack.Screen
        name="urus-helpdesk/[ticketId]"
        options={{ headerShown: true, title: "Ticket" }}
      />
      <Stack.Screen name="urus-tempahan" options={{ headerShown: true, title: "Approval Centre" }} />
      <Stack.Screen name="urus-checkin" options={{ headerShown: true, title: "Check-in Records" }} />
    </Stack>
  )
}
