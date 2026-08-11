"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import { AnnouncementForm } from "./announcement-form"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"

interface EditProps {
  role: string
  announcement: {
    id: string
    title: string
    content: string
    tag: string
    attachmentUrl: string | null
    attachmentType: string | null
    isPinned: boolean
    scheduledAt: string | null
    expiresAt: string | null
  }
}

export function EditAnnouncementButton({ role, announcement }: EditProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setOpen(true)}
        startIcon={<KIcon icon="edit" size={15} />}
      >
        Edit
      </Button>
      <KDialog open={open} onClose={() => setOpen(false)} title={`Edit: ${announcement.title}`} icon="edit">
        <AnnouncementForm role={role} edit={announcement} onDone={() => setOpen(false)} />
      </KDialog>
    </>
  )
}
