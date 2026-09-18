"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import { AnimatePresence, motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { elevation, radius } from "@/lib/theme"

/** Chromium-only install event (not implemented by Safari). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "kiz_pwa_install_dismissed"

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  // iPadOS 13+ masquerades as desktop Safari — detect it via touch points.
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/.test(ua) || iPadOs
}

/**
 * Bottom install prompt — asks visitors to add the KIZ Super App to their home
 * screen. Chromium browsers expose `beforeinstallprompt`, so one tap installs
 * for real; iOS has no such API, so there the button opens the Share →
 * Add to Home Screen steps instead. Dismissal lasts for the session.
 */
export function PwaInstallPrompt() {
  const [mode, setMode] = useState<"hidden" | "native" | "ios">("hidden")
  const [iosDialogOpen, setIosDialogOpen] = useState(false)
  const deferred = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return
    } catch {
      // Private mode / storage blocked — carry on and show it.
    }

    if (isIos()) {
      const t = window.setTimeout(() => setMode("ios"), 1800)
      return () => window.clearTimeout(t)
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferred.current = e as BeforeInstallPromptEvent
      setMode("native")
    }
    const onInstalled = () => setMode("hidden")

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Ignore — worst case it shows again next visit.
    }
    setMode("hidden")
  }

  async function install() {
    if (mode === "ios") {
      setIosDialogOpen(true)
      return
    }
    const promptEvent = deferred.current
    if (!promptEvent) return
    deferred.current = null
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === "accepted") setMode("hidden")
    else dismiss()
  }

  return (
    <>
      <AnimatePresence>
        {mode !== "hidden" && (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              position: "fixed",
              insetInline: 0,
              bottom: { xs: "calc(64px + env(safe-area-inset-bottom) + 12px)", md: 24 },
              zIndex: (t) => t.zIndex.modal - 1,
              display: "flex",
              justifyContent: "center",
              px: 2,
              pointerEvents: "none",
            }}
          >
            <Box
              role="dialog"
              aria-label="Install the KIZ app"
              sx={{
                pointerEvents: "auto",
                width: "100%",
                maxWidth: 420,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                pl: 2,
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                boxShadow: elevation.e3,
              }}
            >
              <Box
                component="img"
                src="/api/app-icon?size=192"
                alt=""
                sx={{ width: 42, height: 42, borderRadius: `${radius.card}px`, flexShrink: 0, objectFit: "cover" }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>
                  Install KIZ app
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 12.5, mt: 0.25 }}>
                  Add to your home screen for one-tap access.
                </Typography>
              </Box>

              <Button variant="contained" size="small" onClick={install} sx={{ flexShrink: 0 }}>
                {mode === "ios" ? "How" : "Install"}
              </Button>

              <IconButton size="small" onClick={dismiss} aria-label="Dismiss" sx={{ flexShrink: 0 }}>
                <KIcon icon="close" size={18} />
              </IconButton>
            </Box>
          </Box>
        )}
      </AnimatePresence>

      <KDialog
        open={iosDialogOpen}
        onClose={() => {
          setIosDialogOpen(false)
          dismiss()
        }}
        title="Add KIZ to Home Screen"
        icon="add_to_home_screen"
        maxWidth="xs"
        actions={
          <Button
            variant="contained"
            onClick={() => {
              setIosDialogOpen(false)
              dismiss()
            }}
          >
            Got it
          </Button>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <KIcon icon="ios_share" size={20} sx={{ color: "text.secondary", flexShrink: 0 }} />
            <Typography variant="body2">
              Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <KIcon icon="add_box" size={20} sx={{ color: "text.secondary", flexShrink: 0 }} />
            <Typography variant="body2">
              Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
            </Typography>
          </Box>
        </Box>
      </KDialog>
    </>
  )
}
