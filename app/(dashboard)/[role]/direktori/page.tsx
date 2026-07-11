import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { MapPin } from "lucide-react"

export default async function DirektoriPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const blocks = await prisma.block.findMany({
    include: {
      facilities: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Direktori Blok & Fasiliti
      </h1>
      <p className="mt-1 text-muted-foreground">
        Panduan lokasi blok dan kemudahan di KIZ.
      </p>

      <div className="mt-8 grid gap-6">
        {blocks.map((block) => (
          <div key={block.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 size-5 shrink-0 text-primary" />
              <div className="flex-1">
                <h2 className="font-heading text-lg text-primary-foreground">
                  {block.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {block.description}
                </p>
                {block.navigationNotes && (
                  <p className="mt-2 text-sm italic text-muted-foreground/70">
                    🧭 {block.navigationNotes}
                  </p>
                )}
              </div>
            </div>

            {block.facilities.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Fasiliti
                </p>
                <div className="flex flex-wrap gap-2">
                  {block.facilities.map((facility) => (
                    <span
                      key={facility.id}
                      className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {facility.name}
                      {facility.capacity && (
                        <span className="ml-1 text-muted-foreground">
                          · {facility.capacity}px
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
