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

  const student = await prisma.user.findUnique({ where: { matricId: "A123456" } })
  const admin = await prisma.user.findUnique({ where: { matricId: "ADMIN002" } })

  if (student && admin) {
    const facilities = await prisma.facility.findMany()

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const bookingData = [
      {
        facilityName: "Bilik Mesyuarat Utama",
        timeSlotStart: tomorrow,
        status: "approved" as const,
      },
      {
        facilityName: "Padang Futsal",
        timeSlotStart: nextWeek,
        status: "pending" as const,
      },
      {
        facilityName: "Bilik TV Blok A",
        timeSlotStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: "approved" as const,
      },
    ]

    for (const bd of bookingData) {
      const facility = facilities.find((f) => f.name === bd.facilityName)
      if (!facility) continue
      await prisma.facilityBooking.create({
        data: {
          facilityId: facility.id,
          userId: student.id,
          timeSlotStart: bd.timeSlotStart,
          timeSlotEnd: new Date(bd.timeSlotStart.getTime() + 60 * 60 * 1000),
          status: bd.status,
          approvedById: bd.status === "approved" ? admin.id : null,
          purpose: "Dummy booking",
        },
      })
    }

    console.log("Dummy bookings seeded")

    const announcementData = [
      {
        title: "Selamat Datang ke Semester Baru 2024/2025!",
        content: "Pihak KIZ mengalu-alukan kedatangan semua pelajar...",
        tag: "umum",
        isPinned: true,
      },
      {
        title: "Gangguan Bekalan Air Blok A & B — 17 Julai",
        content: "Pihak pengurusan memaklumkan...",
        tag: "penting",
        isPinned: true,
      },
      {
        title: "Pendaftaran Kad Maya Wajib Sebelum 31 Ogos",
        content: "Semua penghuni diwajibkan...",
        tag: "umum",
        isPinned: false,
      },
      {
        title: "Aktiviti Gotong-Royong KIZ — Sabtu Ini",
        content: "Sertai gotong-royong perdana...",
        tag: "aktiviti",
        isPinned: false,
      },
      {
        title: "Tempahan Rumah Tamu Kini Dibuka!",
        content: "Penghuni boleh membuat tempahan...",
        tag: "umum",
        isPinned: false,
      },
    ]

    for (const ad of announcementData) {
      await prisma.announcement.create({
        data: {
          title: ad.title,
          content: ad.content,
          tag: ad.tag,
          isPinned: ad.isPinned,
          postedBy: admin.id,
        },
      })
    }

    console.log("Dummy announcements seeded")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
