"use client"

import { useEffect } from "react"
import { markEcardRegistered } from "@/app/(dashboard)/[role]/home-actions"

/**
 * Marks the member's eCard as "registered" the first time the eCard page is
 * viewed, clearing the dashboard checklist task. Fires client-side after mount
 * so the DB write + revalidation happen outside a server-component render.
 */
export function EcardRegistration({ shouldRegister }: { shouldRegister: boolean }) {
  useEffect(() => {
    if (!shouldRegister) return
    markEcardRegistered().catch(() => {
      // Non-fatal: the task simply stays until the next visit.
    })
  }, [shouldRegister])
  return null
}
