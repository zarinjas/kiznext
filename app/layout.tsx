import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript"
import { AppProviders } from "@/components/providers/app-providers"
import { siteUrl } from "@/lib/site-url"
import "./globals.css"

// Single clean sans across the whole product — modern SaaS, no serif.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
})
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "KIZ Super App · Kolej Ibu Zain",
    template: "%s · KIZ Super App",
  },
  description: "Platform digital bersepadu Kolej Ibu Zain (KIZ), UKM — pengumuman, tempahan kemudahan & guest house, helpdesk, chat komuniti, bungkusan dan barang tercicir.",
  applicationName: "KIZ Super App",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ms_MY",
    siteName: "KIZ Super App",
    title: "KIZ Super App · Kolej Ibu Zain",
    description: "Satu platform digital untuk warga Kolej Ibu Zain, UKM — pengumuman, tempahan kemudahan & guest house, helpdesk, chat, bungkusan & lost-and-found.",
    url: siteUrl(),
    images: [{ url: siteUrl("/api/opengraph-image"), width: 1200, height: 630, alt: "KIZ Super App" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KIZ Super App · Kolej Ibu Zain",
    description: "Satu platform digital untuk warga Kolej Ibu Zain, UKM.",
    images: [siteUrl("/api/opengraph-image")],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/api/app-icon", type: "image/png", sizes: "512x512" }],
    apple: "/api/app-icon",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>
        <InitColorSchemeScript attribute="data" defaultMode="system" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
