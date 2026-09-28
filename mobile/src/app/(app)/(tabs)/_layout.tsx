import { Tabs } from "expo-router"
import { Platform, type ColorValue } from "react-native"

import { tapSelection } from "@/lib/feedback"
import { Box } from "@/ui"
import { Icon } from "@/ui/icon"
import { theme } from "@/ui/theme"

/**
 * Bottom tab bar.
 *
 * Adds an active pill indicator behind the selected icon and a selection haptic
 * on tab press. "Resident ID" was the longest label in a 5-slot bar and
 * truncated on a 320pt device — shortened to "ID".
 */
function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: string
  color: ColorValue
  size: number
  focused: boolean
}) {
  return (
    <Box
      width={52}
      height={30}
      alignItems="center"
      justifyContent="center"
      borderRadius="pill"
      backgroundColor={focused ? "brand50" : "transparent"}
    >
      <Icon name={name} color={color} size={size} />
    </Box>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand600,
        tabBarInactiveTintColor: theme.colors.ink300,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          // `minHeight` (not `height`) so labels can't clip at large text sizes.
          minHeight: Platform.OS === "ios" ? 84 : 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: { paddingVertical: 2 },
      }}
      screenListeners={{ tabPress: () => tapSelection() }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="dashboard" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pengumuman"
        options={{
          title: "News",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="campaign" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="forum" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="kad-maya"
        options={{
          title: "ID",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="qr_code_2" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lagi"
        options={{
          title: "More",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="widgets" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}
