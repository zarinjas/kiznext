import { after } from "next/server"
import { prisma } from "@/lib/db"
import { translateMessage } from "@/lib/ai/translate"

/**
 * Translate one live-chat helpdesk message and store the English + Simplified
 * Mandarin versions next to the original. Runs after the response is sent so
 * sending a chat message stays instant; the client picks the translation up on
 * its next poll. Best-effort — the original message is always kept.
 *
 * Only used for `live`-channel threads; structured tickets are left as typed.
 */
export function translateLiveMessage(messageId: string, text: string): void {
  after(async () => {
    try {
      const result = await translateMessage(text)
      if (!result) return

      await prisma.helpdeskMessage.update({
        where: { id: messageId },
        data: {
          sourceLang: result.sourceLang,
          translationEn: result.english,
          translationZh: result.mandarin,
        },
      })
    } catch {
      // Translation is best-effort — keep the original message on failure.
    }
  })
}
