import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript"
import { AppProviders } from "@/components/providers/app-providers"
import "./globals.css"

const geist = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" })
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "KIZ Super App",
  description: "Platform digital bersepadu Kolej Ibu Zain, UKM",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
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
