import { createHash } from "node:crypto"
import { prisma } from "@/lib/db"
import { getAiConfig } from "./config"
import { embedText, cosineSimilarity } from "./embed"

/**
 * Retrieval-augmented knowledge index over the app's own content. Indexing is
 * idempotent: unchanged rows (same sha256) are skipped, changed rows are
 * re-embedded, removed rows are soft-deleted.
 */

export interface KnowledgeSource {
  sourceType: string
  sourceId: string | null
  title: string
  content: string
  /** Route suffix without the role segment, e.g. "pengumuman". */
  href: string | null
}

export interface RetrievedChunk {
  id: string
  title: string
  content: string
  href: string | null
  score: number
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

/** Stable identity for a source row across re-indexes. */
function sourceKey(s: KnowledgeSource): string {
  return `${s.sourceType}:${s.sourceId ?? `title:${s.title}`}`
}

/** Static, always-true KIZ facts that don't live in a table. */
function staticFaqs(): KnowledgeSource[] {
  return [
    {
      sourceType: "faq",
      sourceId: "office_hours",
      title: "KIZ office hours",
      content:
        "The KIZ administration office is open Monday to Friday, 8:00 AM to 5:00 PM (Malaysian time). It is closed on weekends and public holidays. Outside these hours, helpdesk requests are still saved and answered when the office reopens.",
      href: "helpdesk",
    },
    {
      sourceType: "faq",
      sourceId: "contact_office",
      title: "How to contact the KIZ office",
      content:
        "You can reach the KIZ office through the Helpdesk in the app. Submit a Support Ticket for formal requests (like a room change) or start a Live Chat for quick questions during office hours. For emergencies, use the emergency contacts shown in the Helpdesk page.",
      href: "helpdesk",
    },
    {
      sourceType: "faq",
      sourceId: "ecard",
      title: "Digital student card (eCard)",
      content:
        "Your KIZ digital student card shows your name, student ID, room and a QR code. Open it from the eCard page. Show the QR at the gate or office for identification. The card is valid for one semester from your room check-in.",
      href: "kad-maya",
    },
    {
      sourceType: "faq",
      sourceId: "room_selection",
      title: "Room selection",
      content:
        "Accepted students choose a room preference (single, twin-sharing, or no preference) during the selection window. Final room placement is confirmed by the KIZ office and only visible once allocations are published. If you already have a room assigned, room selection is closed for you.",
      href: "bilik",
    },
    {
      sourceType: "faq",
      sourceId: "counter_checkin",
      title: "Counter check-in and check-out",
      content:
        "At the start and end of a residential session, scan the QR code at the KIZ counter, enter your matric number, confirm your name and sign digitally. Your block, room and bed are then shown. After that, proceed to Counter 2 (UKM Real Estate) to collect or return your key.",
      href: "helpdesk",
    },
    {
      sourceType: "faq",
      sourceId: "guest_house",
      title: "Guest house booking",
      content:
        "Residents can book a KIZ guest house for visitors. Pick a guest house, check its availability calendar, and choose daily, weekly or monthly stays. Bookings need admin approval. Payment is settled manually at the office.",
      href: "rumah-tamu",
    },
    {
      sourceType: "faq",
      sourceId: "lost_found",
      title: "Lost and found",
      content:
        "Report a lost or found item from the Lost & Found page. Add a photo, the location and the date it happened. The KIZ community can see reports and claim items.",
      href: "hilang",
    },
    {
      sourceType: "faq",
      sourceId: "facilities",
      title: "Booking facilities",
      content:
        "Bookable facilities (like Dewan Sutera, seminar rooms and the futsal court) need a reservation. Open the Facilities page, pick a facility, choose an available time slot and submit. Approved bookings get a PDF slip. Shared facilities (like the surau, laundry and pantry) can be used without booking.",
      href: "tempahan-fasiliti",
    },
  ]
}

async function collectSources(): Promise<KnowledgeSource[]> {
  const [announcements, facilities, offices, contents, guestHouses, events] = await Promise.all([
    prisma.announcement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.facility.findMany({
      where: { deletedAt: null },
      include: { category: { select: { name: true, section: true } } },
    }),
    prisma.office.findMany({ where: { deletedAt: null } }),
    prisma.contentItem.findMany({ where: { deletedAt: null } }),
    prisma.guestHouse.findMany({ where: { deletedAt: null } }),
    prisma.event.findMany({
      where: { deletedAt: null, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 30,
    }),
  ])

  const sources: KnowledgeSource[] = []

  for (const a of announcements) {
    sources.push({
      sourceType: "announcement",
      sourceId: a.id,
      title: a.title,
      content: `Category: ${a.tag}. ${a.content}`,
      href: "pengumuman",
    })
  }

  for (const f of facilities) {
    const bits = [
      f.description ?? "",
      f.category?.name ? `Category: ${f.category.name} (${f.category.section}).` : "",
      f.price != null ? `Fee: RM ${f.price}.` : "",
      f.capacity != null ? `Capacity: ${f.capacity} people.` : "",
    ].filter(Boolean)
    sources.push({
      sourceType: "facility",
      sourceId: f.id,
      title: `Facility: ${f.name}`,
      content: bits.join(" "),
      href: "tempahan-fasiliti",
    })
  }

  for (const o of offices) {
    sources.push({
      sourceType: "office",
      sourceId: o.id,
      title: `Office: ${o.name}`,
      content: o.description ?? "",
      href: "pejabat",
    })
  }

  for (const c of contents) {
    const bits = [c.subtitle ?? "", c.body ?? "", c.phone ? `Phone: ${c.phone}.` : ""].filter(Boolean)
    sources.push({
      sourceType: "content",
      sourceId: c.id,
      title: c.title,
      content: bits.join(" "),
      href: "lagi",
    })
  }

  for (const g of guestHouses) {
    const bits = [
      g.description ?? "",
      g.price != null ? `Price: RM ${g.price}.` : "",
      g.capacity != null ? `Capacity: ${g.capacity}.` : "",
      g.maxDays != null ? `Maximum stay: ${g.maxDays} days.` : "",
    ].filter(Boolean)
    sources.push({
      sourceType: "guesthouse",
      sourceId: g.id,
      title: `Guest house: ${g.name}`,
      content: bits.join(" "),
      href: "rumah-tamu",
    })
  }

  for (const e of events) {
    sources.push({
      sourceType: "event",
      sourceId: e.id,
      title: `Event: ${e.title}`,
      content: [e.description ?? "", e.venue ? `Venue: ${e.venue}.` : "", `Starts: ${e.startsAt.toISOString()}.`]
        .filter(Boolean)
        .join(" "),
      href: null,
    })
  }

  return [...sources, ...staticFaqs()]
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export interface IndexResult {
  indexed: number
  skipped: number
  removed: number
}

/** Rebuild the knowledge index from current content. Admin-triggered. */
export async function indexKnowledge(): Promise<IndexResult> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) throw new Error("Add a Gemini API key first.")

  const sources = await collectSources()
  const existing = await prisma.aiKnowledge.findMany({ where: { deletedAt: null } })
  const byKey = new Map(existing.map((e) => [`${e.sourceType}:${e.sourceId ?? `title:${e.title}`}`, e]))

  let indexed = 0
  let skipped = 0
  const seen = new Set<string>()

  await mapLimit(sources, 4, async (s) => {
    const key = sourceKey(s)
    seen.add(key)
    const contentHash = sha256(`${s.title}\n${s.content}`)
    const prev = byKey.get(key)

    if (prev && prev.hash === contentHash) {
      skipped++
      return
    }

    const vector = await embedText(cfg, `${s.title}\n${s.content}`)
    const embedding = JSON.stringify(vector)

    if (prev) {
      await prisma.aiKnowledge.update({
        where: { id: prev.id },
        data: { title: s.title, content: s.content, embedding, hash: contentHash, href: s.href },
      })
    } else {
      await prisma.aiKnowledge.create({
        data: {
          sourceType: s.sourceType,
          sourceId: s.sourceId,
          title: s.title,
          content: s.content,
          embedding,
          hash: contentHash,
          href: s.href,
        },
      })
    }
    indexed++
  })

  // Soft-delete index rows whose source disappeared.
  let removed = 0
  for (const e of existing) {
    const key = `${e.sourceType}:${e.sourceId ?? `title:${e.title}`}`
    if (!seen.has(key)) {
      await prisma.aiKnowledge.update({ where: { id: e.id }, data: { deletedAt: new Date() } })
      removed++
    }
  }

  return { indexed, skipped, removed }
}

/** Retrieve the top-k most similar knowledge chunks for a question. */
export async function retrieve(question: string, k = 5): Promise<RetrievedChunk[]> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) return []

  const queryVector = await embedText(cfg, question)
  const rows = await prisma.aiKnowledge.findMany({ where: { deletedAt: null } })

  return rows
    .map((row) => {
      let vector: number[] = []
      try {
        vector = JSON.parse(row.embedding) as number[]
      } catch {
        vector = []
      }
      return {
        id: row.id,
        title: row.title,
        content: row.content,
        href: row.href,
        score: cosineSimilarity(queryVector, vector),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
