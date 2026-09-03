"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"
import { updateAvatar } from "@/app/(dashboard)/[role]/avatar-actions"

/**
 * AvatarPicker — clickable avatar that uploads a photo and saves it to the
 * user's profile. Used on the dashboard hero and the eCard page so the same
 * image appears everywhere.
 */
export function AvatarPicker({
  avatarUrl,
  name,
  size = 64,
  shape = "circle",
  title = "Change photo",
}: {
  avatarUrl: string | null
  name: string
  size?: number
  shape?: "circle" | "rounded"
  title?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const radius = shape === "circle" ? "50%" : size * 0.28

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      await updateAvatar(data.url)
      router.refresh()
    } catch {
      alert("Upload failed. Try a smaller image (JPG/PNG/WebP).")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const initial = (name.trim().charAt(0) || "K").toUpperCase()

  return (
    <Box sx={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      {avatarUrl ? (
        <Box
          component="img"
          src={avatarUrl}
          alt={name}
          sx={{ width: size, height: size, borderRadius: radius, objectFit: "cover", border: "2px solid", borderColor: "background.paper" }}
        />
      ) : (
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: radius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            color: "text.primary",
            fontSize: size * 0.4,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          {initial}
        </Box>
      )}

      {/* Camera badge */}
      <Box
        component="button"
        onClick={() => inputRef.current?.click()}
        aria-label={title}
        disabled={uploading}
        sx={{
          position: "absolute",
          right: -2,
          bottom: -2,
          width: size * 0.34,
          height: size * 0.34,
          minWidth: 24,
          minHeight: 24,
          borderRadius: "50%",
          backgroundColor: color.brand[600],
          color: "#fff",
          border: "2px solid",
          borderColor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: 1,
          transition: "background-color 140ms, opacity 140ms",
          "&:hover": { backgroundColor: color.brand[700] },
          "&:disabled": { opacity: 0.6, cursor: "default" },
        }}
      >
        {uploading ? <KIcon icon="hourglass_top" size={13} /> : <KIcon icon="photo_camera" size={13} />}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={uploading}
        onChange={handleFile}
      />
    </Box>
  )
}
