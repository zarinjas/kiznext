/**
 * Shared community-chat view types. Pure data — safe to import from both the
 * server (page + actions) and client components. Mirrors what the DB returns
 * but flattened for rendering.
 */

export interface ChatSenderView {
  id: string
  name: string
  role: string
  avatarUrl: string | null
}

export interface ChatReactionView {
  emoji: string
  count: number
  mine: boolean
}

export interface ChatReplyPreviewView {
  senderName: string
  text: string
}

export interface ChatMessageView {
  id: string
  message: string
  createdAt: string
  attachmentUrl: string | null
  attachmentType: string | null
  attachmentName: string | null
  replyToId: string | null
  /** Resolved quote preview of the parent message, when replying to one. */
  replyPreview: ChatReplyPreviewView | null
  sender: ChatSenderView
  reactions: ChatReactionView[]
}

export interface ChatTeamMemberView {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  online: boolean
}

export interface ChatUserProfileView {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  matricId: string
  email: string | null
  phone: string | null
  roomLabel: string | null
  accountStatus: string
  online: boolean
  createdAt: string
}

export interface ChatReportView {
  id: string
  messageId: string
  reason: string
  note: string | null
  createdAt: string
  reporterName: string
  reporterRole: string
  messageSnippet: string
  senderName: string
}

export interface ChatSnapshotView {
  messages: ChatMessageView[]
  /** Active (non-deleted, active-status) account count. */
  memberCount: number
  onlineCount: number
  /** Office + fellows for the "Community Team" rail card. */
  team: ChatTeamMemberView[]
  /** Open reports — only populated for moderators (admin_kiz/superadmin). */
  reports: ChatReportView[]
  canModerate: boolean
}
