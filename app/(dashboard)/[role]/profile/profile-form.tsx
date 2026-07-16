"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile } from "./actions"
import Image from "next/image"

interface ProfileUser {
  name: string
  email: string | null
  matricId: string
  block: string | null
  roomNumber: string | null
  phone: string | null
  role: string
  avatarUrl: string | null
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "")
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setDone(false)

    const form = new FormData(e.currentTarget)

    try {
      await updateProfile({
        name: form.get("name") as string,
        email: (form.get("email") as string) ?? "",
        block: (form.get("block") as string) ?? "",
        roomNumber: (form.get("roomNumber") as string) ?? "",
        phone: (form.get("phone") as string) ?? "",
        avatarUrl,
      })
      setDone(true)
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
        <div className="relative">
          {avatarUrl ? (
            <div className="size-24 overflow-hidden rounded-full border-2 border-primary">
              <Image src={avatarUrl} alt="" width={96} height={96} className="size-full object-cover" />
            </div>
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-heading text-primary-foreground">
              {user.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-xs text-primary-foreground shadow-md hover:bg-primary/90">
            📷
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                const fd = new FormData()
                fd.append("file", file)
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: fd })
                  const data = await res.json()
                  setAvatarUrl(data.url)
                } catch { alert("Upload failed") }
                finally { setUploading(false) }
              }}
            />
          </label>
        </div>
        {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.matricId}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="matricId">Matric No.</Label>
        <Input id="matricId" value={user.matricId} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="block">Block</Label>
        <Input
          id="block"
          name="block"
          defaultValue={user.block ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="roomNumber">Room No.</Label>
        <Input
          id="roomNumber"
          name="roomNumber"
          defaultValue={user.roomNumber ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone No.</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ""}
        />
      </div>
      {done && (
        <p className="text-sm text-green-600">Profile updated successfully.</p>
      )}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}
