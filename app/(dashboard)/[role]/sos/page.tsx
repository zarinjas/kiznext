import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { resolveSosTarget } from "@/lib/sos"
import { SosScreen } from "./sos-client"

export default async function SosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [target, contacts] = await Promise.all([
    resolveSosTarget(),
    prisma.contentItem.findMany({
      where: { kind: "emergency_contact", deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ])

  return (
    <SosScreen
      target={target}
      contacts={contacts.map((c) => ({
        id: c.id,
        title: c.title,
        phone: c.phone,
        subtitle: c.subtitle,
      }))}
    />
  )
}
