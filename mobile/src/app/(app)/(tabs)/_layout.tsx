import { Tabs } from "expo-router"

import { Icon } from "@/ui/icon"
import { theme } from "@/ui/theme"

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
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Icon name="dashboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pengumuman"
        options={{
          title: "News",
          tabBarIcon: ({ color, size }) => <Icon name="campaign" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => <Icon name="forum" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="kad-maya"
        options={{
          title: "Resident ID",
          tabBarIcon: ({ color, size }) => <Icon name="qr_code_2" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lagi"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Icon name="widgets" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
