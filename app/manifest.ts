import type { MetadataRoute } from "next"
import { color } from "@/lib/theme"

/**
 * Web app manifest — makes the KIZ Super App installable ("Add to Home Screen"
 * / one-tap install on Chromium). Icons are served by the dynamic
 * `/api/app-icon` route so a logo change in App Settings is reflected without
 * a rebuild; `?size=` asks sharp for the exact size the manifest declares.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIZ Super App",
    short_name: "KIZ",
    description:
      "Platform digital bersepadu Kolej Ibu Zain (KIZ), UKM — pengumuman, tempahan kemudahan & guest house, helpdesk, chat komuniti, bungkusan dan barang tercicir.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: color.canvas,
    theme_color: color.brand[600],
    icons: [
      { src: "/api/app-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/app-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
