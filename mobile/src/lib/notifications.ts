import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import { apiDelete, apiPost } from "./api"

/**
 * Push notifications via Expo Push Service.
 *
 * Push tokens require a development/release build — they do not work in Expo Go
 * on Android. `app.json` must carry `extra.eas.projectId` (created by
 * `eas init`) for `getExpoPushTokenAsync` to resolve.
 */

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0891B2",
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== "granted") return null

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
  if (!projectId) {
    console.warn("[push] No EAS projectId — run `eas init` to enable push notifications.")
    return null
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
    return data
  } catch (err) {
    console.warn("[push] Could not get Expo push token", err)
    return null
  }
}

/** Store the token against the signed-in user on the server. */
export async function syncDeviceToken(token: string): Promise<void> {
  await apiPost("/devices", {
    token,
    platform: Platform.OS,
    deviceName: Device.modelName ?? undefined,
  })
}

/** Remove the token on sign-out so the device stops receiving pushes. */
export async function unregisterDeviceToken(token: string): Promise<void> {
  try {
    await apiDelete(`/devices?token=${encodeURIComponent(token)}`)
  } catch {
    // Best-effort.
  }
}

const ROLE_SEGMENTS = new Set(["superadmin", "admin_kiz", "pengetua", "fellow", "ahli", "staf"])

/** Mobile routes an in-app notification link may point at. */
const KNOWN_ROUTES = new Set([
  "pengumuman",
  "panduan",
  "bilik",
  "checkin",
  "scan",
  "tempahan-fasiliti",
  "laundry",
  "rumah-tamu",
  "tempahan",
  "hilang",
  "pejabat",
  "direktori",
  "ar-terjemah",
  "sos",
  "kiz-ai",
  "chat",
  "kad-maya",
  "profile",
  "notifications",
])

export type NotificationLinkTarget = { external: string } | { route: string } | null

/**
 * Resolve a notification `link` to a navigation target. Web links look like
 * "/ahli/tempahan"; the role segment is stripped and the rest is matched
 * against the routes this app actually has. Unknown paths resolve to null so
 * the caller can fall back to the inbox.
 */
export function notificationLinkTarget(link: string | null | undefined): NotificationLinkTarget {
  if (!link) return null
  if (/^https?:\/\//.test(link)) return { external: link }
  const parts = link.split("?")[0].split("/").filter(Boolean)
  const rest = parts[0] && ROLE_SEGMENTS.has(parts[0]) ? parts.slice(1) : parts
  if (rest.length === 0 || !KNOWN_ROUTES.has(rest[0])) return null
  return { route: "/" + rest.join("/") }
}
