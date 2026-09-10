"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { nowMalaysia } from "@/lib/timezone"

/**
 * Server actions for the member (student/staff) dashboard checklist items.
 * Each one clears a "Things to Do" task and revalidates the home page.
 */

async function requireMember(): Promise<"ahli" | "staf" | "fellow"> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const role = session.user.role as string
  if (role !== "ahli" && role !== "staf" && role !== "fellow") throw new Error("Forbidden")
  return role as "ahli" | "staf" | "fellow"
}

/**
 * First view of the eCard page marks the account's eCard as registered.
 * Called from the client after mount (see `EcardRegistration`).
 */
export async function markEcardRegistered() {
  const role = await requireMember()
  const session = await auth()

  await prisma.user.updateMany({
    where: { id: session!.user!.id, ecardRegisteredAt: null, deletedAt: null },
    data: { ecardRegisteredAt: nowMalaysia() },
  })

  revalidatePath(`/${role}/kad-maya`)
  revalidatePath(`/${role}`)
}
