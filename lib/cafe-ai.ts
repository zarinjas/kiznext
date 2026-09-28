import { getAiConfig } from "@/lib/ai/config"
import { generateJson, type GenerateImage } from "@/lib/ai/provider"

/**
 * KIZ Cafe menu digitisation. Reuses the same vision provider as KIZ Lens
 * (Gemini / OpenRouter / Ollama) to read a menu photo into structured rows —
 * no new dependency, and it works anywhere the AI provider is configured.
 */

export interface ExtractedCafeItem {
  name: string
  price: number
  category: string
  description: string | null
  dietary: string[]
}

interface RawMenuResponse {
  items?: {
    name?: unknown
    price?: unknown
    category?: unknown
    description?: unknown
    dietary?: unknown
  }[]
}

const ALLOWED_DIETARY = new Set(["halal", "vegetarian", "spicy", "contains_nuts"])
const DEFAULT_CATEGORIES = ["Set Meal", "Makanan", "Minuman", "Snek", "Dessert"]

/** Coerce "RM6.50", "6.50", "RM 6" or 6.5 into a rounded number. */
function toPrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw * 100) / 100
  if (typeof raw === "string") {
    const match = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?/)
    if (match) return Math.round(Number(match[0]) * 100) / 100
  }
  return null
}

function cleanDietary(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return Array.from(
    new Set(
      raw
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toLowerCase().replace(/\s+/g, "_"))
        .filter((v) => ALLOWED_DIETARY.has(v)),
    ),
  )
}

function cleanCategory(raw: unknown): string {
  if (typeof raw !== "string") return "Makanan"
  const value = raw.trim()
  if (!value) return "Makanan"
  const known = DEFAULT_CATEGORIES.find((c) => c.toLowerCase() === value.toLowerCase())
  return known ?? value.slice(0, 40)
}

/**
 * Read a menu photo into structured items. Throws when AI is off or the model
 * returns nothing usable — the admin UI falls back to manual entry.
 */
export async function extractMenuItems(image: GenerateImage): Promise<ExtractedCafeItem[]> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) {
    throw new Error(
      "AI isn't configured yet. Add a vision-capable model in AI settings, or add the menu items manually.",
    )
  }

  const result = await generateJson<RawMenuResponse>(cfg, {
    system:
      "You are a menu digitisation assistant for a Malaysian university cafe. " +
      "Read the attached menu photo and extract every orderable food or drink with its price in Malaysian Ringgit. " +
      "Return strict JSON only — no commentary.",
    prompt:
      "Return a JSON object shaped exactly like:\n" +
      `{"items":[{"name":"Nasi Lemak Ayam","price":6.5,"category":"Makanan","description":null,"dietary":["halal"]}]}\n` +
      "Rules:\n" +
      "- `name`: the item name exactly as printed (keep Malay/Chinese as written).\n" +
      "- `price`: a number only, no currency symbol (RM6.50 -> 6.5). Omit items with no readable price.\n" +
      `- \`category\`: one of ${DEFAULT_CATEGORIES.map((c) => `"${c}"`).join(", ")} — pick the closest.\n` +
      "- `description`: a short detail or null.\n" +
      "- `dietary`: any of halal, vegetarian, spicy, contains_nuts that clearly apply (else []).\n" +
      "If the image has no readable menu, return {\"items\":[]}.",
    image,
    temperature: 0.1,
    maxOutputTokens: 4096,
  })

  const raw = Array.isArray(result.items) ? result.items : []
  const items: ExtractedCafeItem[] = []
  for (const row of raw) {
    const name = typeof row.name === "string" ? row.name.trim() : ""
    const price = toPrice(row.price)
    if (!name || price === null || price < 0) continue
    items.push({
      name: name.slice(0, 80),
      price,
      category: cleanCategory(row.category),
      description:
        typeof row.description === "string" && row.description.trim()
          ? row.description.trim().slice(0, 200)
          : null,
      dietary: cleanDietary(row.dietary),
    })
  }

  if (items.length === 0) {
    throw new Error("No menu items could be read from that photo. Try a clearer image, or add items manually.")
  }
  return items
}
