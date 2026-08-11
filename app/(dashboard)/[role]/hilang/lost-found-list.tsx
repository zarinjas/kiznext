"use client"

import { useRouter } from "next/navigation"
import { EyeOff, Search } from "lucide-react"
import { markClaimed } from "./actions"
import { Button } from "@/components/ui/button"

interface Item {
  id: string
  itemName: string
  description: string
  photoUrl: string | null
  status: string
  locationFound: string | null
  createdAt: Date
  reportedBy: string
  reporter: { name: string }
}

interface Props {
  items: Item[]
  userId: string
  role: string
  compact?: boolean
}

export function LostFoundList({ items, userId, compact = false }: Props) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className={compact ? "rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground" : "rounded-lg border bg-card p-8 text-center text-muted-foreground"}>
        No reports.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className={compact ? "rounded-2xl border border-border bg-card p-4" : "rounded-lg border bg-card p-4"}>
          <div className="flex items-start gap-3">
            <div className="mt-1 shrink-0">
              {item.status === "lost" ? (
                <EyeOff className="size-5 text-destructive" />
              ) : (
                <Search className="size-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">{item.itemName}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.status === "lost" ? "bg-red-100 text-destructive" :
                  item.status === "found" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {item.status === "lost" ? "Lost" : item.status === "found" ? "Found" : "Claimed"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              {item.locationFound && (
                <p className="mt-1 text-xs text-muted-foreground">Location: {item.locationFound}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{item.reporter.name}</span>
                <span>{item.createdAt.toLocaleDateString("ms-MY")}</span>
              </div>
              {item.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt={item.itemName} className="mt-2 max-h-32 rounded-lg object-cover" />
              )}
            </div>
            {item.status === "found" && item.reportedBy === userId && (
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  await markClaimed(item.id)
                  router.refresh()
                }}
              >
                Claim
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
