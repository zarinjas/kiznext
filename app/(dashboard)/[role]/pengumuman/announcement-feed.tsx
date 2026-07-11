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
}

export function AnnouncementFeed({ announcements, tags }: Props) {
  const [activeTag, setActiveTag] = useState<string>("semua")

  const filtered = activeTag === "semua"
    ? announcements
    : announcements.filter((a) => a.tag === activeTag)

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTag("semua")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeTag === "semua" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          Semua
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activeTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((a) => (
          <div key={a.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-foreground mb-1 capitalize">
                  {a.tag}
                </span>
                <h2 className="font-heading text-lg text-primary-foreground">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
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
