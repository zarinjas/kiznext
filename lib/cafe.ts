"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, CAFE_MANAGE_ROLES, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { readFile } from "fs/promises"
import path from "path"
import { saveUpload } from "@/lib/image-upload"
import { extractMenuItems, type ExtractedCafeItem } from "@/lib/cafe-ai"
import {
  DEFAULT_CAFE_CONFIG,
  buildOrderMessage,
  buildWhatsAppLink,
  cartSubtotal,
  normalisePhone,
  type CafeCartLine,
  type CafeConfig,
  type CafeItemView,
  type CafeOrderView,
} from "@/lib/cafe-meta"

/**
 * KIZ Cafe smart ordering — server actions + reads. The cafe's identity lives in
 * `app_settings` (single cafe, no `Cafe` table); menu items live in `cafe_items`;
 * each student's order is stored in `cafe_orders` for history + one-tap reorder.
 * The order itself is handed to WhatsApp (see `lib/cafe-meta.ts`).
 */

const KEYS = {
  name: "cafe_name",
  phone: "cafe_phone",
  location: "cafe_location",
  hoursLabel: "cafe_hours_label",
  opensAt: "cafe_opens_at",
  closesAt: "cafe_closes_at",
  tagline: "cafe_tagline",
  active: "cafe_active",
  menuImage: "cafe_menu_image",
} as const

const SETTING_KEYS = Object.values(KEYS)

async function requireCafeAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, CAFE_MANAGE_ROLES)
  return session.user.role as Role
}

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getCafeConfig(): Promise<CafeConfig> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: SETTING_KEYS } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const get = (key: string) => map.get(key)?.trim() || null
  return {
    name: get(KEYS.name) ?? DEFAULT_CAFE_CONFIG.name,
    phone: get(KEYS.phone) ?? DEFAULT_CAFE_CONFIG.phone,
    location: get(KEYS.location) ?? DEFAULT_CAFE_CONFIG.location,
    hoursLabel: get(KEYS.hoursLabel) ?? DEFAULT_CAFE_CONFIG.hoursLabel,
    opensAt: get(KEYS.opensAt) ?? DEFAULT_CAFE_CONFIG.opensAt,
    closesAt: get(KEYS.closesAt) ?? DEFAULT_CAFE_CONFIG.closesAt,
    tagline: get(KEYS.tagline) ?? DEFAULT_CAFE_CONFIG.tagline,
    active: (get(KEYS.active) ?? "0") === "1",
    menuImage: get(KEYS.menuImage),
  }
}

function toItemView(i: {
  id: string
  name: string
  price: number
  category: string
  description: string | null
  dietary: string[]
  imageUrl: string | null
  isAvailable: boolean
  published: boolean
  sortOrder: number
}): CafeItemView {
  return {
    id: i.id,
    name: i.name,
    price: i.price,
    category: i.category,
    description: i.description,
    dietary: i.dietary,
    imageUrl: i.imageUrl,
    isAvailable: i.isAvailable,
    published: i.published,
    sortOrder: i.sortOrder,
  }
}

/** Published menu for students. Unavailable items are kept (shown as sold out). */
export async function getCafeMenu(): Promise<CafeItemView[]> {
  const items = await prisma.cafeItem.findMany({
    where: { deletedAt: null, published: true },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  })
  return items.map(toItemView)
}

/** Every item (drafts included) for the admin menu manager. */
export async function getAllCafeItems(): Promise<CafeItemView[]> {
  const items = await prisma.cafeItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  })
  return items.map(toItemView)
}

export async function getMyCafeOrders(): Promise<CafeOrderView[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  return getCafeOrdersForUser(session.user.id)
}

/** Identity-free order history read — shared by the web page + mobile API. */
export async function getCafeOrdersForUser(userId: string): Promise<CafeOrderView[]> {
  const orders = await prisma.cafeOrder.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return orders.map((o) => ({
    id: o.id,
    refCode: o.refCode,
    items: Array.isArray(o.items) ? (o.items as unknown as CafeCartLine[]) : [],
    subtotal: o.subtotal,
    pickupTime: o.pickupTime,
    note: o.note,
    when: new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(o.createdAt),
    whatsappSentAt: o.whatsappSentAt?.toISOString() ?? null,
  }))
}

// ── Admin: cafe settings ─────────────────────────────────────────────────────

export async function saveCafeConfig(input: CafeConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireCafeAdmin()

    const name = input.name.trim()
    if (!name) return { success: false, error: "Give the cafe a name." }

    const phone = normalisePhone(input.phone)
    if (!phone) return { success: false, error: "Add the cafe's WhatsApp number (e.g. 0123456789)." }
    if (phone.length < 10) return { success: false, error: "That WhatsApp number looks too short." }

    const opensAt = /^\d{2}:\d{2}$/.test(input.opensAt) ? input.opensAt : DEFAULT_CAFE_CONFIG.opensAt
    const closesAt = /^\d{2}:\d{2}$/.test(input.closesAt) ? input.closesAt : DEFAULT_CAFE_CONFIG.closesAt

    await Promise.all([
      upsertSetting(KEYS.name, name),
      upsertSetting(KEYS.phone, phone),
      upsertSetting(KEYS.location, input.location.trim() || DEFAULT_CAFE_CONFIG.location),
      upsertSetting(KEYS.hoursLabel, input.hoursLabel.trim() || DEFAULT_CAFE_CONFIG.hoursLabel),
      upsertSetting(KEYS.opensAt, opensAt),
      upsertSetting(KEYS.closesAt, closesAt),
      upsertSetting(KEYS.tagline, input.tagline.trim() || DEFAULT_CAFE_CONFIG.tagline),
      upsertSetting(KEYS.active, input.active ? "1" : "0"),
    ])

    revalidatePath(`/${role}`)
    revalidatePath(`/${role}/urus-kafe`)
    revalidatePath(`/${role}/kafe`)
    return { success: true }
  } catch (err) {
    console.error("[cafe:saveCafeConfig]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't save the cafe settings." }
  }
}

// ── Admin: menu image + AI extraction ────────────────────────────────────────

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

export async function uploadCafeMenuImage(
  formData: FormData,
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const role = await requireCafeAdmin()
    const file = formData.get("image") as File | null
    if (!file || file.size === 0) return { success: false, error: "Pick a menu photo first." }

    let url: string
    try {
      const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
        dir: "cafe",
        prefix: "menu",
        maxBytes: 12 * 1024 * 1024,
      })
      url = result.url
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Upload failed." }
    }

    await upsertSetting(KEYS.menuImage, url)
    revalidatePath(`/${role}/urus-kafe`)
    revalidatePath(`/${role}/kafe`)
    return { success: true, url }
  } catch (err) {
    console.error("[cafe:uploadCafeMenuImage]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't upload the menu photo." }
  }
}

export async function extractCafeMenuFromImage(
  imageUrl: string,
): Promise<{ success: boolean; error?: string; items?: ExtractedCafeItem[] }> {
  try {
    await requireCafeAdmin()
    const clean = imageUrl.replace(/^\//, "")
    if (!clean.startsWith("uploads/")) return { success: false, error: "Upload the menu photo first." }

    const ext = clean.split(".").pop()?.toLowerCase() ?? ""
    const mimeType = MIME_BY_EXT[ext]
    if (!mimeType) return { success: false, error: "That menu photo isn't a supported image format." }

    let data: string
    try {
      const buffer = await readFile(path.join(process.cwd(), "public", clean))
      data = buffer.toString("base64")
    } catch {
      return { success: false, error: "Couldn't read the uploaded menu photo." }
    }

    const items = await extractMenuItems({ mimeType, data })
    return { success: true, items }
  } catch (err) {
    console.error("[cafe:extractCafeMenuFromImage]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't read the menu photo." }
  }
}

// ── Admin: menu items ────────────────────────────────────────────────────────

export interface CafeItemInput {
  id?: string
  name: string
  price: number
  category: string
  description?: string | null
  dietary?: string[]
  isAvailable?: boolean
  published?: boolean
}

/** Upsert a full list of items (used by the menu manager's Save). */
export async function saveCafeItems(
  items: CafeItemInput[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireCafeAdmin()

    const cleaned = items
      .map((i) => ({
        id: i.id,
        name: i.name.trim(),
        price: Math.round((Number(i.price) || 0) * 100) / 100,
        category: i.category.trim() || "Makanan",
        description: i.description?.trim() || null,
        dietary: Array.isArray(i.dietary) ? i.dietary : [],
        isAvailable: i.isAvailable ?? true,
        published: i.published ?? true,
      }))
      .filter((i) => i.name.length > 0)

    if (cleaned.length === 0) return { success: false, error: "Add at least one menu item." }

    let order = 0
    for (const item of cleaned) {
      const data = {
        name: item.name.slice(0, 80),
        price: Math.max(0, item.price),
        category: item.category.slice(0, 40),
        description: item.description,
        dietary: item.dietary,
        isAvailable: item.isAvailable,
        published: item.published,
        sortOrder: order++,
      }
      if (item.id) {
        await prisma.cafeItem.updateMany({ where: { id: item.id, deletedAt: null }, data })
      } else {
        await prisma.cafeItem.create({ data })
      }
    }

    revalidatePath(`/${role}/urus-kafe`)
    revalidatePath(`/${role}/kafe`)
    return { success: true }
  } catch (err) {
    console.error("[cafe:saveCafeItems]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't save the menu." }
  }
}

export async function deleteCafeItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireCafeAdmin()
    await prisma.cafeItem.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath(`/${role}/urus-kafe`)
    revalidatePath(`/${role}/kafe`)
    return { success: true }
  } catch (err) {
    console.error("[cafe:deleteCafeItem]", err)
    return { success: false, error: "Couldn't remove that item." }
  }
}

// ── Member: place an order ───────────────────────────────────────────────────

async function nextRefCode(): Promise<string> {
  const count = await prisma.cafeOrder.count()
  for (let i = 0; i < 25; i++) {
    const code = `KIZ-CAFE-${String(count + 1 + i).padStart(4, "0")}`
    const exists = await prisma.cafeOrder.findUnique({ where: { refCode: code }, select: { id: true } })
    if (!exists) return code
  }
  return `KIZ-CAFE-${Date.now().toString().slice(-6)}`
}

export interface CreateCafeOrderInput {
  lines: { itemId: string; qty: number }[]
  pickupTime?: string | null
  note?: string | null
}

export interface CreateCafeOrderResult {
  success: boolean
  error?: string
  order?: { refCode: string; whatsappUrl: string; message: string }
}

export interface CafeOrderIdentity {
  userId: string
  name: string
  matricId: string
}

/**
 * Core order placement. Identity is passed in so the mobile bearer API can
 * reuse it (a route handler has no NextAuth session).
 */
export async function createCafeOrderForUser(
  identity: CafeOrderIdentity,
  input: CreateCafeOrderInput,
): Promise<CreateCafeOrderResult> {
  try {
    const wanted = (input.lines ?? []).filter((l) => l.itemId && Number(l.qty) > 0)
    if (wanted.length === 0) return { success: false, error: "Your cart is empty." }

    const [config, items] = await Promise.all([
      getCafeConfig(),
      prisma.cafeItem.findMany({
        where: { id: { in: wanted.map((l) => l.itemId) }, deletedAt: null, published: true },
      }),
    ])

    const byId = new Map(items.map((i) => [i.id, i]))
    const lines: CafeCartLine[] = []
    for (const line of wanted) {
      const item = byId.get(line.itemId)
      if (!item || !item.isAvailable) continue
      const qty = Math.min(50, Math.max(1, Math.floor(Number(line.qty))))
      lines.push({ itemId: item.id, name: item.name, price: item.price, qty })
    }
    if (lines.length === 0) return { success: false, error: "Those items are no longer available." }

    const subtotal = cartSubtotal(lines)
    const refCode = await nextRefCode()
    const pickupTime = input.pickupTime?.trim().slice(0, 60) || null
    const note = input.note?.trim().slice(0, 240) || null

    await prisma.cafeOrder.create({
      data: {
        userId: identity.userId,
        refCode,
        items: lines as unknown as object,
        subtotal,
        pickupTime,
        note,
        whatsappSentAt: new Date(),
      },
    })

    const message = buildOrderMessage({
      cafeName: config.name,
      refCode,
      customerName: identity.name,
      matricId: identity.matricId,
      lines,
      subtotal,
      pickupTime,
      note,
    })
    const whatsappUrl = buildWhatsAppLink(config.phone, message)

    return { success: true, order: { refCode, whatsappUrl, message } }
  } catch (err) {
    console.error("[cafe:createCafeOrderForUser]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't place the order." }
  }
}

/** Web wrapper — resolves the signed-in identity from the Auth.js session. */
export async function createCafeOrder(input: CreateCafeOrderInput): Promise<CreateCafeOrderResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Please sign in to order." }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, matricId: true },
  })
  const result = await createCafeOrderForUser(
    {
      userId: session.user.id,
      name: user?.name ?? "Resident",
      matricId: user?.matricId ?? session.user.matricId ?? "",
    },
    input,
  )
  if (result.success) revalidatePath(`/${session.user.role}/kafe`)
  return result
}
