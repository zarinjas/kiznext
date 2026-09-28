import { Image } from "expo-image"
import { useState } from "react"
import type { StyleProp, ImageStyle } from "react-native"

import { API_BASE_URL } from "@/lib/config"

/**
 * The app's logo.
 *
 * Prefers the admin-uploaded logo (`/api/app-icon`, backed by the `app_logo`
 * AppSetting) so changing it in App Settings is reflected in the app without a
 * rebuild, and falls back to the bundled copy if that request fails — so the
 * logo is never an empty box on a cold start or offline.
 *
 * `cachePolicy="memory"` deliberately avoids the disk cache: the logo is fetched
 * once per launch, which keeps it fresh after an admin change without refetching
 * on every render.
 */
const REMOTE_LOGO = `${API_BASE_URL}/api/app-icon?size=192`
const BUNDLED_LOGO = require("../../assets/images/logo-mark.png")

export function AppLogo({
  size,
  style,
  contentFit = "contain",
}: {
  size: number
  style?: StyleProp<ImageStyle>
  contentFit?: "contain" | "cover"
}) {
  const [failed, setFailed] = useState(false)

  return (
    <Image
      source={failed ? BUNDLED_LOGO : { uri: REMOTE_LOGO }}
      style={[{ width: size, height: size }, style]}
      contentFit={contentFit}
      transition={150}
      cachePolicy="memory"
      onError={() => setFailed(true)}
      accessibilityLabel="MyKIZ logo"
    />
  )
}
