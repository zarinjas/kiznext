"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile } from "./actions"

interface ProfileUser {
  name: string
  email: string | null
  matricId: string
  block: string | null
  roomNumber: string | null
  phone: string | null
  role: string
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

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
      <div className="space-y-2">
        <Label htmlFor="matricId">No. Matrik</Label>
        <Input id="matricId" value={user.matricId} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Emel</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="block">Blok</Label>
        <Input
          id="block"
          name="block"
          defaultValue={user.block ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="roomNumber">No. Bilik</Label>
        <Input
          id="roomNumber"
          name="roomNumber"
          defaultValue={user.roomNumber ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">No. Telefon</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ""}
        />
      </div>
      {done && (
        <p className="text-sm text-green-600">Profil berjaya dikemaskini.</p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  )
}
