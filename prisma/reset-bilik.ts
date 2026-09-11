import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"

/**
 * Clear all residence (bilik) data so a real accepted-list import starts from a
 * clean slate: beds, rooms, blocks, room applications, eligible students,
 * intakes and selection windows. Users, announcements, bookings and every other
 * module are left untouched.
 *
 * Run with the --yes flag:
 *   npx tsx prisma/reset-bilik.ts --yes
 */

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ALLOCATIONS_PUBLISHED_KEY = "bilik_allocations_published"

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("Refusing to run without --yes. This deletes ALL residence/intake data.")
    process.exit(1)
  }

  const counts = {
    checkInRecords: (await prisma.checkInRecord.deleteMany()).count,
    roomApplications: (await prisma.roomApplication.deleteMany()).count,
    bedsFreed: (await prisma.bed.updateMany({ data: { occupantId: null } })).count,
    beds: (await prisma.bed.deleteMany()).count,
    rooms: (await prisma.residenceRoom.deleteMany()).count,
    blocks: (await prisma.residenceBlock.deleteMany()).count,
    eligibleStudents: (await prisma.eligibleStudent.deleteMany()).count,
    intakes: (await prisma.intake.deleteMany()).count,
    selectionWindows: (await prisma.selectionWindow.deleteMany()).count,
    userRoomFields: (await prisma.user.updateMany({ data: { block: null, roomNumber: null } })).count,
    publishFlag: (await prisma.appSetting.deleteMany({ where: { key: ALLOCATIONS_PUBLISHED_KEY } })).count,
  }

  console.log("Residence data cleared:")
  for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
