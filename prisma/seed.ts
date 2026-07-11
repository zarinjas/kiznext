import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import bcrypt from "bcryptjs"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash("kiz123", 10)

  await prisma.user.upsert({
    where: { matricId: "ADMIN001" },
    update: {},
    create: {
      matricId: "ADMIN001",
      name: "Super Admin",
      passwordHash,
      role: "superadmin",
      residentCardQr: "ADMIN001",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "ADMIN002" },
    update: {},
    create: {
      matricId: "ADMIN002",
      name: "Admin KIZ",
      passwordHash,
      role: "admin_kiz",
      residentCardQr: "ADMIN002",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "A123456" },
    update: {},
    create: {
      matricId: "A123456",
      name: "Pelajar Contoh",
      email: "pelajar@ukm.edu.my",
      passwordHash,
      role: "ahli",
      block: "A",
      roomNumber: "101",
      residentCardQr: "A123456",
      phone: "0123456789",
    },
  })

  console.log("Users seeded (password: kiz123)")

  const blockData = [
    { name: "Blok A", description: "Blok kediaman pelajar perempuan — tingkat 1-4", navigationNotes: "Bersebelahan dengan Blok B, berhadapan dengan Dataran KIZ" },
    { name: "Blok B", description: "Blok kediaman pelajar perempuan — tingkat 1-4", navigationNotes: "Di sebelah Blok A, bersebelahan dengan Kafe" },
    { name: "Blok C", description: "Blok kediaman pelajar lelaki — tingkat 1-4", navigationNotes: "Seberang jalan dari Blok A & B" },
    { name: "Blok D", description: "Blok kediaman pelajar lelaki — tingkat 1-4", navigationNotes: "Bersebelahan Blok C" },
    { name: "Blok E", description: "Blok kediaman pelajar lelaki — tingkat 1-4", navigationNotes: "Di hujung kawasan KIZ, bersebelahan parking" },
    { name: "Pejabat KIZ", description: "Pejabat pengurusan Kolej Ibu Zain", navigationNotes: "Tingkat bawah Blok A, pintu utama menghadap Dataran KIZ" },
  ]

  for (const b of blockData) {
    await prisma.block.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    })
  }

  console.log("Blocks seeded")

  const facilityData = [
    { name: "Bilik Mesyuarat Utama", blockName: "Pejabat KIZ", description: "Bilik mesyuarat utama KIZ — kapasiti 20 orang", capacity: 20, requiresApproval: true },
    { name: "Bilik TV Blok A", blockName: "Blok A", description: "Ruang santai dengan TV — kapasiti 10 orang", capacity: 10, requiresApproval: false },
    { name: "Bilik TV Blok B", blockName: "Blok B", description: "Ruang santai dengan TV — kapasiti 10 orang", capacity: 10, requiresApproval: false },
    { name: "Surau Al-Hidayah", blockName: "Blok A", description: "Surau utama KIZ — muat 40 jemaah", capacity: 40, requiresApproval: false },
    { name: "Dobi Blok A", blockName: "Blok A", description: "6 mesin basuh, 4 pengering", capacity: null, requiresApproval: false },
    { name: "Dobi Blok B", blockName: "Blok B", description: "4 mesin basuh, 3 pengering", capacity: null, requiresApproval: false },
    { name: "Pantri Blok C", blockName: "Blok C", description: "Pantri berkongsi — peti sejuk, microwave, cerek", capacity: null, requiresApproval: false },
    { name: "Padang Futsal", blockName: "Blok E", description: "Padang futsal luar — muat 10v10", capacity: 20, requiresApproval: true },
    { name: "Bilik Belajar Blok D", blockName: "Blok D", description: "Ruang belajar sunyi — 8 meja belajar", capacity: 8, requiresApproval: false },
  ]

  const blocks = await prisma.block.findMany()
  const blockMap = Object.fromEntries(blocks.map((b) => [b.name, b.id]))

  for (const f of facilityData) {
    const blockId = blockMap[f.blockName]
    if (!blockId) {
      console.warn(`Block not found: ${f.blockName}`)
      continue
    }
    await prisma.facility.upsert({
      where: { name: f.name },
      update: {},
      create: {
        name: f.name,
        blockId,
        description: f.description,
        capacity: f.capacity,
        requiresApproval: f.requiresApproval,
      },
    })
  }

  console.log("Facilities seeded")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
