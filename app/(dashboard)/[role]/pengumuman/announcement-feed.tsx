"use client"

import { useState } from "react"
import { Megaphone, Paperclip, ImageIcon } from "lucide-react"
import Image from "next/image"

interface Announcement {
  id: string
  title: string
  content: string
  tag: string
  attachmentUrl: string | null
  attachmentType: string | null
  isPinned: boolean
  createdAt: Date
  poster: { name: string }
}

interface Props {
  announcements: Announcement[]
  tags: string[]
  compact?: boolean
}

export function AnnouncementFeed({ announcements, tags, compact = false }: Props) {
  const [activeTag, setActiveTag] = useState<string>("all")

  // Filter dan sort — pinned di atas
  const filtered = (activeTag === "all"
    ? announcements
    : announcements.filter((a) => a.tag === activeTag)
  ).sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1))

  const now = new Date()
  const isNew = (d: Date) => now.getTime() - new Date(d).getTime() < 86400000 // 24 jam

  const cardClass = compact
    ? "rounded-2xl border border-border bg-card active:bg-muted"
    : "rounded-lg border bg-card p-5"

  return (
    <div className={compact ? "mt-4" : "mt-8"}>
      {/* Tag filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTag("all")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeTag === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activeTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            } ${tag === "penting" && activeTag !== tag ? "ring-1 ring-red-300" : ""}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {filtered.map((a) => {
          const isPin = a.isPinned
          const tagIsPenting = a.tag === "penting"
          const isRecent = isNew(a.createdAt)

          return (
            <div
              key={a.id}
              className={`${cardClass} ${
                isPin ? "ring-1 ring-primary/30" : ""
              }`}
            >
              {/* Pinned banner */}
              {isPin && (
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary-foreground">
                  <span>📌</span>
                  <span>Important Announcement</span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full text-primary-foreground ${
                  compact ? "size-8" : "size-9"
                } ${
                  tagIsPenting ? "bg-red-500" : "bg-primary/10"
                }`}>
                  <Megaphone className={compact ? "size-4" : "size-5"} />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  {/* Tag + New badge */}
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      tagIsPenting ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary-foreground"
                    }`}>
                      {a.tag}
                    </span>
                    {isRecent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        New
                      </span>
                    )}
                    {a.attachmentType === "pdf" && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Has PDF attachment">
                        <Paperclip className="size-3" /> PDF
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className={compact ? "font-heading text-base text-primary-foreground" : "font-heading text-lg text-primary-foreground"}>
                    {a.title}
                  </h2>

                  {/* Content */}
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {a.content}
                  </p>

                  {/* Image thumbnail */}
                  {a.attachmentType === "image" && a.attachmentUrl && (
                    <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                      <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border">
                        <Image src={a.attachmentUrl} alt="" fill className="object-cover" />
                      </div>
                    </a>
                  )}

                  {/* PDF attachment link */}
                  {a.attachmentType === "pdf" && a.attachmentUrl && (
                    <a
                      href={a.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-primary/10"
                    >
                      📎 Open PDF Attachment
                    </a>
                  )}

                  {/* Meta */}
                  <p className="pt-1 text-xs text-muted-foreground">
                    {a.poster.name} · {new Date(a.createdAt).toLocaleDateString("ms-MY", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No announcements.</p>
        )}
      </div>
    </div>
  )
}
