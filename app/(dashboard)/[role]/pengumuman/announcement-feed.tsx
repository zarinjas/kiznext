"use client"

import { useState } from "react"
import { Megaphone } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  tag: string
  createdAt: Date
  poster: { name: string }
}

interface Props {
  announcements: Announcement[]
  tags: string[]
  compact?: boolean
}

export function AnnouncementFeed({ announcements, tags, compact = false }: Props) {
  const [activeTag, setActiveTag] = useState<string>("semua")

  const filtered = activeTag === "semua"
    ? announcements
    : announcements.filter((a) => a.tag === activeTag)

  const cardClass = compact
    ? "rounded-2xl border border-border bg-card p-4 active:bg-muted"
    : "rounded-lg border bg-card p-5"

  return (
    <div className={compact ? "mt-4" : "mt-8"}>
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTag("semua")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeTag === "semua" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          Semua
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activeTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className={cardClass}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-foreground ${compact ? "size-8" : "size-9"}`}>
                <Megaphone className={compact ? "size-4" : "size-5"} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-foreground mb-1 capitalize">
                  {a.tag}
                </span>
                <h2 className={compact ? "font-heading text-base text-primary-foreground" : "font-heading text-lg text-primary-foreground"}>
                  {a.title}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
                  {a.content}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {a.poster.name} · {a.createdAt.toLocaleDateString("ms-MY", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Tiada pengumuman.</p>
        )}
      </div>
    </div>
  )
}
