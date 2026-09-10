/**
 * One-off data backfill: normalise residence room numbers to the canonical
 * full-code form ("K18A-101") and align each room's floor with its code.
 *
 *   npx tsx prisma/backfill-rooms.ts
 *
 * Safe to re-run — it only touches rows that differ from the canonical form.
 */
import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import { roomCode, parseRoomNumber } from "../lib/bilik-format"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const blocks = await prisma.residenceBlock.findMany({
    where: { deletedAt: null },
    include: { rooms: { where: { deletedAt: null } } },
  })

  let normalised = 0
  for (const block of blocks) {
    for (const room of block.rooms) {
      const code = roomCode(block.name, room.number)
      const parsed = parseRoomNumber(block.name, code)

      if (!parsed) {
        console.warn(`  skip  ${block.name} · ${room.number} — not a numeric room code`)
        continue
      }

      const data: { number?: string; floor?: number } = {}
      if (room.number !== code) data.number = code
      if (room.floor !== parsed.floor) data.floor = parsed.floor

      if (Object.keys(data).length === 0) continue

      await prisma.residenceRoom.update({ where: { id: room.id }, data })
      normalised++
      console.log(
        `  fix  ${room.number} → ${code}` +
          (data.floor !== undefined ? ` (floor ${room.floor} → ${data.floor})` : ""),
      )
    }
  }

  console.log(`Backfill complete — ${normalised} room(s) normalised.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
