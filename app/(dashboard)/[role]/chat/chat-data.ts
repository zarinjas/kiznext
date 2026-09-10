import { prisma } from "@/lib/db"
import { nowMalaysia } from "@/lib/timezone"
import { ONLINE_WINDOW_MS } from "@/lib/chat-meta"
import type { Role } from "@/lib/rbac"
import type {
  ChatMessageView,
  ChatReactionView,
  ChatReportView,
  ChatSnapshotView,
  ChatTeamMemberView,
} from "./chat-types"

/**
 * Community-chat data assembly (server-only). Single source of truth for the
 * room snapshot: used by the page for first paint and by the 3s polling action
 * for refreshes, so both render the same enriched shape.
 *
 * Enrichment: per-message emoji reactions (count + whether mine), an inline
 * quote preview when a message is a reply, member/online counts, the
 * "Community Team" list, and (for moderators) open message reports.
 */

const OFFICE_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua", "fellow", "staf"]

function iso(d: Date): string {
  return d.toISOString()
}

export async function getChatSnapshot(
  userId: string,
  userRole: string
): Promise<ChatSnapshotView> {
  const now = nowMalaysia()
  const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS)
  const canModerate = userRole === "admin_kiz" || userRole === "superadmin"

  // ── Presence + member + team counts ──────────────────────────────────────
  const [memberCount, onlineCount, teamRows] = await Promise.all([
    prisma.user.count({ where: { accountStatus: "active", deletedAt: null } }),
    prisma.user.count({
      where: { accountStatus: "active", deletedAt: null, lastSeenAt: { gt: onlineSince } },
    }),
    prisma.user.findMany({
      where: { role: { in: OFFICE_ROLES }, accountStatus: "active", deletedAt: null },
      select: { id: true, name: true, role: true, avatarUrl: true, lastSeenAt: true },
      orderBy: { name: "asc" },
      take: 16,
    }),
  ])

  const team: ChatTeamMemberView[] = teamRows.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    online: !!u.lastSeenAt && u.lastSeenAt.getTime() > onlineSince.getTime(),
  }))

  // ── Messages ─────────────────────────────────────────────────────────────
  const rows = await prisma.communityChatMessage.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const ids = rows.map((r) => r.id)

  const [reactionRows, reportRows] = await Promise.all([
    ids.length
      ? prisma.chatMessageReaction.findMany({
          where: { deletedAt: null, messageId: { in: ids } },
          select: { messageId: true, userId: true, emoji: true },
        })
      : Promise.resolve([]),
    canModerate && ids.length
      ? prisma.chatMessageReport.findMany({
          where: { deletedAt: null, messageId: { in: ids } },
          include: {
            reporter: { select: { name: true, role: true } },
            message: {
              select: {
                message: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
  ])

  // messageId → emoji → count
  const reactionAgg = new Map<string, Map<string, number>>()
  for (const r of reactionRows) {
    const m = reactionAgg.get(r.messageId) ?? new Map<string, number>()
    m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1)
    reactionAgg.set(r.messageId, m)
  }
  // messageId → set of emojis the viewer reacted with
  const myReactions = new Map<string, Set<string>>()
  for (const r of reactionRows) {
    if (r.userId !== userId) continue
    const s = myReactions.get(r.messageId) ?? new Set<string>()
    s.add(r.emoji)
    myReactions.set(r.messageId, s)
  }

  // Resolve reply-quote previews. Parents that were later soft-deleted render
  // as "[Message removed]" so the thread still reads sensibly.
  const replyIds = [...new Set(rows.map((r) => r.replyToId).filter(Boolean) as string[])]
  const parents = replyIds.length
    ? await prisma.communityChatMessage.findMany({
        where: { id: { in: replyIds } },
        select: { id: true, message: true, deletedAt: true, user: { select: { name: true } } },
      })
    : []
  const parentById = new Map(parents.map((p) => [p.id, p]))

  const messages: ChatMessageView[] = rows.map((r) => {
    const agg = reactionAgg.get(r.id)
    const mine = myReactions.get(r.id)
    const reactions: ChatReactionView[] = agg
      ? [...agg.entries()]
          .map(([emoji, count]) => ({
            emoji,
            count,
            mine: !!mine?.has(emoji),
          }))
          .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
      : []

    let replyPreview: ChatMessageView["replyPreview"] = null
    if (r.replyToId) {
      const p = parentById.get(r.replyToId)
      if (p) {
        replyPreview = p.deletedAt
          ? { senderName: p.user.name, text: "[Message removed]" }
          : { senderName: p.user.name, text: p.message }
      }
    }

    return {
      id: r.id,
      message: r.message,
      createdAt: iso(r.createdAt),
      attachmentUrl: r.attachmentUrl,
      attachmentType: r.attachmentType,
      attachmentName: r.attachmentName,
      replyToId: r.replyToId,
      replyPreview,
      sender: {
        id: r.user.id,
        name: r.user.name,
        role: r.user.role,
        avatarUrl: r.user.avatarUrl,
      },
      reactions,
    }
  })

  const reports: ChatReportView[] = reportRows.map((rep) => ({
    id: rep.id,
    messageId: rep.messageId,
    reason: rep.reason,
    note: rep.note,
    createdAt: iso(rep.createdAt),
    reporterName: rep.reporter.name,
    reporterRole: rep.reporter.role,
    messageSnippet: rep.message.message,
    senderName: rep.message.user.name,
  }))

  return { messages, memberCount, onlineCount, team, reports, canModerate }
}
