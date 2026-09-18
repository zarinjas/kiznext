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
    // update repairs the row no matter what state it drifted into (role,
    // status), so the demo/quick-login account always works after a seed.
    update: { passwordHash, deletedAt: null, role: "superadmin", accountStatus: "active" },
    create: {
      matricId: "ADMIN001",
      name: "Super Admin",
      passwordHash,
      role: "superadmin",
      accountStatus: "active",
      residentCardQr: "ADMIN001",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "ADMIN002" },
    update: { passwordHash, deletedAt: null, role: "admin_kiz", accountStatus: "active" },
    create: {
      matricId: "ADMIN002",
      name: "Admin KIZ",
      passwordHash,
      role: "admin_kiz",
      accountStatus: "active",
      residentCardQr: "ADMIN002",
    },
  })

  // Demo self-service staff account (@ukm.edu.my → role `staf`, member access,
  // no admin panel until promoted). Email is marked verified so it can log in.
  await prisma.user.upsert({
    where: { matricId: "STAF001" },
    update: { passwordHash, deletedAt: null, role: "staf", accountStatus: "active" },
    create: {
      matricId: "STAF001",
      name: "Staff Demo",
      email: "staff@ukm.edu.my",
      emailVerifiedAt: new Date(),
      accountStatus: "active",
      passwordHash,
      role: "staf",
      residentCardQr: "STAF001",
    },
  })

  // Demo fellow (residential college fellow — member experience like `staf`,
  // with a visible "Fellow" tag in the community chat). Admin-created only.
  await prisma.user.upsert({
    where: { matricId: "FEL001" },
    update: { passwordHash, deletedAt: null, role: "fellow", accountStatus: "active" },
    create: {
      matricId: "FEL001",
      name: "Fellow Demo",
      email: "fellow@ukm.edu.my",
      emailVerifiedAt: new Date(),
      accountStatus: "active",
      passwordHash,
      role: "fellow",
      residentCardQr: "FEL001",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "A123456" },
    update: { passwordHash, deletedAt: null, email: "pelajar@siswa.ukm.edu.my", role: "ahli", accountStatus: "active" },
    create: {
      matricId: "A123456",
      name: "Example Student",
      email: "pelajar@siswa.ukm.edu.my",
      passwordHash,
      role: "ahli",
      accountStatus: "active",
      residentCardQr: "A123456",
      phone: "0123456789",
    },
  })

  // ── Stable, permanent test accounts ──────────────────────────────────────
  // Unlike the demo accounts above, these are intentionally boring and always
  // exist after any seed/deploy — perfect for manual testing without depending
  // on the one-click demo buttons. Both are repaired to `active` on every run
  // and are never removed by the seed.
  await prisma.user.upsert({
    where: { matricId: "SUPER001" },
    update: {
      passwordHash,
      deletedAt: null,
      role: "superadmin",
      accountStatus: "active",
      email: "stable.superadmin@ukm.edu.my",
      emailVerifiedAt: new Date(),
    },
    create: {
      matricId: "SUPER001",
      name: "Stable Super Admin",
      email: "stable.superadmin@ukm.edu.my",
      emailVerifiedAt: new Date(),
      passwordHash,
      role: "superadmin",
      accountStatus: "active",
      residentCardQr: "SUPER001",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "A999999" },
    update: {
      passwordHash,
      deletedAt: null,
      role: "ahli",
      accountStatus: "active",
      email: "stable.student@siswa.ukm.edu.my",
      emailVerifiedAt: new Date(),
    },
    create: {
      matricId: "A999999",
      name: "Stable Student",
      email: "stable.student@siswa.ukm.edu.my",
      emailVerifiedAt: new Date(),
      passwordHash,
      role: "ahli",
      accountStatus: "active",
      residentCardQr: "A999999",
    },
  })

  console.log("Users seeded (password: kiz123)")

  const blockData = [
    { name: "Block A", description: "Female student residence — floors 1-4", navigationNotes: "Next to Block B, facing KIZ Square" },
    { name: "Block B", description: "Female student residence — floors 1-4", navigationNotes: "Next to Block A, beside the cafeteria" },
    { name: "Block C", description: "Male student residence — floors 1-4", navigationNotes: "Across the road from Blocks A & B" },
    { name: "Block D", description: "Male student residence — floors 1-4", navigationNotes: "Next to Block C" },
    { name: "Block E", description: "Male student residence — floors 1-4", navigationNotes: "At the end of the KIZ area, beside the parking lot" },
    { name: "KIZ Office", description: "Kolej Ibu Zain management office", navigationNotes: "Ground floor of Block A, main entrance facing KIZ Square" },
    { name: "Blok Pentadbiran", description: "Administrative block housing the KIZ administration office and the UKM Real Estate office", navigationNotes: "Facing KIZ Square, between the guest house and the cafeteria" },
  ]

  for (const b of blockData) {
    await prisma.block.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    })
  }

  console.log("Blocks seeded")

  const officeData = [
    {
      name: "Pejabat Pentadbiran KIZ",
      description: "College administration — registration, resident matters, forms, and booking approvals.",
      sortOrder: 1,
    },
    {
      name: "Pejabat UKM Real Estate",
      description: "UKM Real Estate — property, facility, and building management matters.",
      sortOrder: 2,
    },
  ]

  for (const o of officeData) {
    await prisma.office.upsert({
      where: { name: o.name },
      update: {},
      create: o,
    })
  }

  console.log("Offices seeded")

  // ── AR Directory destinations ─────────────────────────────────────────────
  // GPS pins the AR arrow navigates to. Coordinates marked `verified: true`
  // below were read directly off real, named Google Maps pins on 2026-09-16
  // (long-press → coordinates) — they are ground truth, not estimates. The
  // real K18/K19 layout turned out to run **west (K18) / east (K19)** along
  // the compound's loop road — the opposite of an earlier hand-placed guess
  // that had briefly been trusted without actual confirmation (it put K18A/B
  // on the east side, which real data now shows was off by ~300m). Anything
  // still `verified: false` is an interpolated or
  // spacing-based placeholder pending the same real-pin treatment — fine-tune
  // in `urus-direktori` (right-click → "What's here?" in Google Maps).
  const iconForType: Record<string, string> = {
    block: "apartment",
    facility: "meeting_room",
    office: "domain",
    room: "door_front",
    hall: "theater_comedy",
    seminar: "co_present",
    meeting: "forum",
    admin: "admin_panel_settings",
  }

  const destinationData = [
    {
      name: "Blok K18A",
      type: "block" as const,
      latitude: 2.9290179773597877,
      longitude: 101.78202940579015,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 1,
      verified: true,
    },
    {
      // "Blok K18B" was a duplicate of this same real building — removed
      // (2026-09-18) rather than chasing separate coordinates for it.
      name: "Blok K18C",
      type: "block" as const,
      latitude: 2.9302943795611496,
      longitude: 101.78224883968008,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 3,
      verified: true,
    },
    {
      name: "Blok K18D",
      type: "block" as const,
      latitude: 2.9304996350776475,
      longitude: 101.7827244644805,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 4,
      verified: true,
    },
    {
      name: "Blok K19A",
      type: "block" as const,
      latitude: 2.9290695424304887,
      longitude: 101.78440198300864,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 5,
      verified: true,
    },
    {
      name: "Blok K19B",
      type: "block" as const,
      latitude: 2.9298122131091007,
      longitude: 101.78416058419532,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 6,
      verified: true,
    },
    {
      name: "Blok K19C",
      type: "block" as const,
      latitude: 2.9295681162630314,
      longitude: 101.78362317005381,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 7,
      verified: true,
    },
    {
      name: "Blok K19D",
      type: "block" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.930107134828381,
      longitude: 101.78351908389322,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 8,
      verified: true,
    },
    {
      name: "Blok K20A",
      type: "block" as const,
      // New block not previously tracked by the app at all — added from a
      // real Google Maps pin. Confirm whether it should also exist as a
      // `ResidenceBlock` for room allocation (separate from AR Directory).
      latitude: 2.9290112805963364,
      longitude: 101.78385078908265,
      indoor: false,
      building: null,
      description: "Residence block",
      sortOrder: 9,
      verified: true,
    },
    {
      name: "KIZ Student Premier Housing",
      type: "block" as const,
      latitude: 2.9294398733165177,
      longitude: 101.78200006479473,
      indoor: true,
      building: null,
      description: "Premium student housing",
      sortOrder: 10,
      verified: true,
    },
    {
      name: "Dewan Sutera",
      type: "hall" as const,
      // Real pin is "Sutera Banquet Hall, Kolej Ibu Zain" — same place.
      latitude: 2.930287347972209,
      longitude: 101.78421121088282,
      indoor: true,
      building: null,
      description: "Main college hall — assembly, events, exams",
      sortOrder: 11,
      verified: true,
    },
    {
      // Split from a single merged "Bilik Seminar" pin — the Facility
      // Booking system already has two distinct bookable rooms here
      // ("Seminar Room 1" / "Seminar Room 2"), so one pin couldn't
      // represent both. Real pins, confirmed on a real device 2026-09-18.
      name: "Seminar Room 1",
      type: "seminar" as const,
      latitude: 2.9306842356083567,
      longitude: 101.78352577124345,
      indoor: true,
      building: "Bangunan Pentadbiran",
      description: "Seminar room",
      sortOrder: 12,
      verified: true,
    },
    {
      name: "Seminar Room 2",
      type: "seminar" as const,
      latitude: 2.9306480731448965,
      longitude: 101.78343055283324,
      indoor: true,
      building: "Bangunan Pentadbiran",
      description: "Seminar room",
      sortOrder: 13,
      verified: true,
    },
    {
      name: "Meeting Room",
      type: "meeting" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.9306279828866035,
      longitude: 101.78398711117794,
      indoor: true,
      building: "Bangunan Pentadbiran",
      description: "KIZ main meeting room",
      sortOrder: 13,
      verified: true,
    },
    {
      name: "Pejabat Pentadbiran KIZ",
      type: "admin" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.9306233131499115,
      longitude: 101.78362813872378,
      indoor: true,
      building: "Bangunan Pentadbiran",
      description: "College administration — registration, resident matters, forms",
      sortOrder: 14,
      verified: true,
    },
    {
      name: "Pejabat UKM Real Estate",
      type: "office" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.930515477435248,
      longitude: 101.78393883142064,
      indoor: true,
      building: "Bangunan Pentadbiran",
      description: "Property, facility and building management matters",
      sortOrder: 15,
      verified: true,
    },
    {
      name: "Cafeteria",
      type: "facility" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.9307771453468856,
      longitude: 101.78386930253198,
      indoor: false,
      building: null,
      description: "College cafeteria",
      sortOrder: 16,
      verified: true,
    },
    {
      name: "Surau",
      type: "facility" as const,
      // Real pin is "Surau Kolej Ibu Zain".
      latitude: 2.930657678453316,
      longitude: 101.78370552510506,
      indoor: true,
      building: null,
      description: "Shared prayer space",
      sortOrder: 17,
      verified: true,
    },
    {
      name: "Laundry Room",
      type: "facility" as const,
      // Real pin is "Simple Laundry" — same location. Re-confirmed on a
      // real device 2026-09-18 (near-identical to the prior reading).
      latitude: 2.93058912821439,
      longitude: 101.78410579863174,
      indoor: false,
      building: null,
      description: "Self-service washing and drying (Simple Laundry)",
      sortOrder: 18,
      verified: true,
    },
    {
      name: "Futsal Court",
      type: "facility" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.928857434190247,
      longitude: 101.78440010436634,
      indoor: false,
      building: null,
      description: "Outdoor futsal and recreation court",
      sortOrder: 20,
      verified: true,
    },
    {
      name: "Sick Bay",
      type: "facility" as const,
      // Real pin, confirmed on a real device 2026-09-18.
      latitude: 2.9306668212466565,
      longitude: 101.78337763953546,
      indoor: true,
      building: "Bangunan Pentadbiran",
      description: "Rest and basic assistance for residents",
      sortOrder: 21,
      verified: true,
    },
    {
      name: "Plaza Majlis Eksekutif Pelajar",
      type: "facility" as const,
      latitude: 2.9307132614989753,
      longitude: 101.78323854959933,
      indoor: true,
      building: null,
      description: "Student executive council plaza",
      sortOrder: 23,
      verified: true,
    },
    {
      name: "Panas Express Kolej Ibu Zain",
      type: "facility" as const,
      latitude: 2.9306878138399277,
      longitude: 101.78392823782659,
      indoor: true,
      building: null,
      description: "Food and drinks kiosk",
      sortOrder: 24,
      verified: true,
    },
  ]

  const destIds = destinationData.map((d) => `${d.type}-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
  for (const d of destinationData) {
    const destId = `${d.type}-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    await prisma.destination.upsert({
      where: { id: destId },
      update: {
        name: d.name,
        type: d.type,
        latitude: d.latitude,
        longitude: d.longitude,
        indoor: d.indoor,
        building: d.building,
        description: d.description,
        sortOrder: d.sortOrder,
        icon: iconForType[d.type] ?? "place",
        deletedAt: null,
        // Like every other field here, `verified` is fully synced from this
        // list on every seed run — this script is the code-defined source of
        // truth for demo/dev data, not a one-way bootstrap.
        verified: d.verified,
      },
      create: {
        id: destId,
        name: d.name,
        type: d.type,
        latitude: d.latitude,
        longitude: d.longitude,
        indoor: d.indoor,
        building: d.building,
        description: d.description,
        sortOrder: d.sortOrder,
        icon: iconForType[d.type] ?? "place",
        verified: d.verified,
      },
    })
  }

  // A destination renamed in this list gets a new id (derived from
  // type+name), so the upsert above creates a fresh row and leaves the old
  // one behind rather than replacing it — e.g. renaming "Bilik Seminar" to
  // "Seminar Room 1"/"Seminar Room 2" orphaned the original row instead of
  // updating it. Soft-delete anything in the table that's no longer in this
  // list, matching the app's normal delete pattern (`deletedAt`, not a hard
  // delete), so this script stays a true source of truth run after run.
  await prisma.destination.updateMany({
    where: { id: { notIn: destIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  })

  console.log("AR Directory destinations seeded")

  // ── Facilities directory ──────────────────────────────────────────────────
  // Categories (grouped by section) then the facilities shown to residents.
  // Bookable section = reservation required ("View & Book"); shared section =
  // kemudahan umum, available without advance booking ("View Details").
  const facilityCategoryData: { name: string; section: "bookable" | "shared"; sortOrder: number }[] = [
    // Bookable Facilities
    { name: "Event & Meeting Spaces", section: "bookable", sortOrder: 1 },
    { name: "Sports & Recreation", section: "bookable", sortOrder: 2 },
    { name: "Cooking Facilities", section: "bookable", sortOrder: 3 },
    // Shared Facilities
    { name: "Prayer Facilities", section: "shared", sortOrder: 1 },
    { name: "Resident Services", section: "shared", sortOrder: 2 },
    { name: "Health & Well-being", section: "shared", sortOrder: 3 },
  ]

  const categoryMap = new Map<string, { id: string; bookable: boolean }>()
  for (const c of facilityCategoryData) {
    const cat = await prisma.facilityCategory.upsert({
      where: { section_name: { section: c.section, name: c.name } },
      update: { sortOrder: c.sortOrder, deletedAt: null },
      create: { name: c.name, section: c.section, sortOrder: c.sortOrder },
    })
    categoryMap.set(c.name, { id: cat.id, bookable: c.section === "bookable" })
  }

  const blocks = await prisma.block.findMany()
  const blockMap = Object.fromEntries(blocks.map((b) => [b.name, b.id]))

  const facilityData = [
    // ── Bookable Facilities ─────────────────────────────────────────────────
    { name: "Dewan Sutera", blockName: "Blok Pentadbiran", category: "Event & Meeting Spaces", description: "Multipurpose hall for events, programmes and large-group activities.", capacity: 300, requiresApproval: true, status: "open" as const },
    { name: "Seminar Room 1", blockName: "Blok Pentadbiran", category: "Event & Meeting Spaces", description: "Seminar space for presentations, discussions and group activities.", capacity: 40, requiresApproval: true, status: "open" as const },
    { name: "Seminar Room 2", blockName: "Blok Pentadbiran", category: "Event & Meeting Spaces", description: "Seminar space for presentations, discussions and group activities.", capacity: 40, requiresApproval: true, status: "open" as const },
    { name: "Meeting Room", blockName: "Blok Pentadbiran", category: "Event & Meeting Spaces", description: "Meeting space for small-group discussions and official meetings.", capacity: 20, requiresApproval: true, status: "open" as const },
    { name: "Futsal Court", blockName: "Block E", category: "Sports & Recreation", description: "Outdoor court for futsal and recreational activities.", capacity: 20, requiresApproval: true, status: "open" as const },
    { name: "Dapur Siswa", blockName: "Block A", category: "Cooking Facilities", description: "A shared cooking space for KIZ residents.", capacity: null, requiresApproval: true, status: "coming_soon" as const },
    // ── Shared Facilities (kemudahan umum) ──────────────────────────────────
    { name: "Surau", blockName: "Block A", category: "Prayer Facilities", description: "A shared prayer space for KIZ residents.", capacity: 40, requiresApproval: false, status: "open" as const },
    { name: "Laundry Room", blockName: "Block A", category: "Resident Services", description: "Self-service washing and drying facilities for residents.", capacity: null, requiresApproval: false, status: "open" as const },
    { name: "Parcel Locker", blockName: "KIZ Office", category: "Resident Services", description: "A secure and convenient self-service parcel collection facility.", capacity: null, requiresApproval: false, status: "coming_soon" as const },
    { name: "Sick Bay", blockName: "Blok Pentadbiran", category: "Health & Well-being", description: "A designated space for residents who require temporary rest or basic assistance.", capacity: null, requiresApproval: false, status: "coming_soon" as const },
  ]

  for (const f of facilityData) {
    const blockId = blockMap[f.blockName]
    const category = f.category ? categoryMap.get(f.category) : undefined
    if (!blockId || !category) {
      console.warn(`Block/category not found: ${f.blockName} / ${f.category}`)
      continue
    }
    const bookable = category.bookable
    await prisma.facility.upsert({
      where: { name: f.name },
      update: {
        blockId,
        categoryId: category.id,
        description: f.description,
        capacity: f.capacity,
        requiresApproval: f.requiresApproval,
        status: f.status,
        bookable,
        deletedAt: null,
      },
      create: {
        name: f.name,
        blockId,
        categoryId: category.id,
        description: f.description,
        capacity: f.capacity,
        requiresApproval: f.requiresApproval,
        status: f.status,
        bookable,
      },
    })
  }

  console.log("Facility categories + facilities seeded")

  const guestHouseData = [
    {
      name: "Rumah Tamu KIZ",
      description: "Main guest house next to KIZ Square. En-suite rooms with air-conditioning.",
      price: 80,
      capacity: 4,
      maxDays: 14,
      requiresApproval: true,
    },
    {
      name: "Rumah Tamu VIP",
      description: "Executive suite for official college guests — living room and private bathroom.",
      price: 120,
      capacity: 2,
      maxDays: 7,
      requiresApproval: true,
    },
  ]

  for (const gh of guestHouseData) {
    await prisma.guestHouse.upsert({
      where: { name: gh.name },
      update: {},
      create: gh,
    })
  }

  console.log("Guest houses seeded")

  const student = await prisma.user.findUnique({ where: { matricId: "A123456" } })
  const admin = await prisma.user.findUnique({ where: { matricId: "ADMIN002" } })

  if (student && admin) {
    const facilities = await prisma.facility.findMany()

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const bookingData = [
      {
        facilityName: "Meeting Room",
        timeSlotStart: tomorrow,
        status: "approved" as const,
      },
      {
        facilityName: "Futsal Court",
        timeSlotStart: nextWeek,
        status: "pending" as const,
      },
      {
        facilityName: "Dewan Sutera",
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
        title: "Welcome to the New Semester 2024/2025!",
        content: "KIZ would like to welcome all students...",
        tag: "general",
        isPinned: true,
      },
      {
        title: "Water Supply Disruption — Blocks A & B — 17 July",
        content: "The management office would like to inform residents...",
        tag: "important",
        isPinned: true,
      },
      {
        title: "eCard Registration Required Before 31 August",
        content: "All residents are required...",
        tag: "general",
        isPinned: false,
      },
      {
        title: "KIZ Community Clean-Up — This Saturday",
        content: "Join the flagship community clean-up...",
        tag: "event",
        isPinned: false,
      },
      {
        title: "Guest House Bookings Now Open!",
        content: "Residents can now book...",
        tag: "general",
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

    // Reactions + read state for the demo student, so the member feed shows
    // reaction counts, a "Noted"-acknowledged important card, and a mix of
    // read/unread cards. Idempotent: re-runs restore, never duplicate.
    const demoStudents = await prisma.user.findMany({
      where: {
        matricId: { in: ["A200001", "A200002", "A200003", "A200016", "A200023", "A200027"] },
      },
      select: { id: true },
    })
    const demoPeers = demoStudents.map((u) => u.id)

    const seededAnnouncements = await prisma.announcement.findMany({
      where: { title: { in: announcementData.map((a) => a.title) }, deletedAt: null },
      select: { id: true, title: true },
    })
    const byTitle = Object.fromEntries(seededAnnouncements.map((s) => [s.title, s]))
    const water = byTitle["Water Supply Disruption — Blocks A & B — 17 July"]
    const cleanUp = byTitle["KIZ Community Clean-Up — This Saturday"]
    const welcome = byTitle["Welcome to the New Semester 2024/2025!"]

    const notedOn = async (announcementId: string, userId: string) => {
      await prisma.announcementReaction.upsert({
        where: { userId_announcementId_type: { userId, announcementId, type: "noted" } },
        update: { deletedAt: null },
        create: { userId, announcementId, type: "noted" },
      })
    }

    if (water && student) {
      // The demo student acknowledged the important disruption notice.
      await notedOn(water.id, student.id)
      await prisma.announcementAcknowledgment.upsert({
        where: { userId_announcementId: { userId: student.id, announcementId: water.id } },
        update: { deletedAt: null },
        create: { userId: student.id, announcementId: water.id },
      })
      for (const pid of demoPeers) await notedOn(water.id, pid)
    }
    if (cleanUp) {
      for (const pid of demoPeers.slice(0, 3)) {
        await prisma.announcementReaction.upsert({
          where: { userId_announcementId_type: { userId: pid, announcementId: cleanUp.id, type: "interested" } },
          update: { deletedAt: null },
          create: { userId: pid, announcementId: cleanUp.id, type: "interested" },
        })
      }
    }
    if (welcome) {
      for (const pid of demoPeers.slice(3)) {
        await prisma.announcementReaction.upsert({
          where: { userId_announcementId_type: { userId: pid, announcementId: welcome.id, type: "excited" } },
          update: { deletedAt: null },
          create: { userId: pid, announcementId: welcome.id, type: "excited" },
        })
      }
    }
    if (student) {
      for (const a of [welcome, water, byTitle["Guest House Bookings Now Open!"]]) {
        if (!a) continue
        await prisma.announcementRead.upsert({
          where: { userId_announcementId: { userId: student.id, announcementId: a.id } },
          update: { deletedAt: null },
          create: { userId: student.id, announcementId: a.id },
        })
      }
    }

    console.log("Dummy announcement reactions seeded")
  }

  // ── Dashboard content + upcoming activities ────────────────────────────────
  // Content items feed the "Emergency Contact" / "Life at KIZ" dashboard
  // widgets; events feed "Upcoming at KIZ". Idempotent by (kind, title).
  const contentSeed: {
    kind: "emergency_contact" | "living_guide"
    title: string
    subtitle: string | null
    phone: string | null
    link: string | null
    body: string | null
    sortOrder: number
  }[] = [
    { kind: "emergency_contact", title: "Security Guard Post", subtitle: "24 hours · Main Gate", phone: "03-8921 5000", link: null, body: null, sortOrder: 1 },
    { kind: "emergency_contact", title: "KIZ Management Office", subtitle: "Mon–Fri, 8am–5pm", phone: "03-8921 4000", link: null, body: null, sortOrder: 2 },
    { kind: "emergency_contact", title: "Duty Fellow (on-call)", subtitle: "After hours", phone: "012-345 6789", link: null, body: null, sortOrder: 3 },
    { kind: "living_guide", title: "Resident Handbook", subtitle: null, phone: null, link: "/pengumuman", body: "Rules, facilities & the do’s and don’ts of college life.", sortOrder: 1 },
  ]
  for (const c of contentSeed) {
    const existing = await prisma.contentItem.findFirst({ where: { kind: c.kind, title: c.title, deletedAt: null } })
    if (!existing) {
      await prisma.contentItem.create({ data: c })
    }
  }
  console.log("Dashboard content seeded")

  const eventSeed = [
    { title: "KIZ Community Clean-Up", venue: "KIZ Square", daysAhead: 3, description: "Join the flagship community clean-up — gloves and trash bags provided." },
    { title: "Tea Time with the Principal", venue: "Dewan Sutera", daysAhead: 10, description: "An informal session to share ideas with the college principal." },
  ]
  const eventBase = new Date()
  for (const ev of eventSeed) {
    const existing = await prisma.event.findFirst({ where: { title: ev.title, deletedAt: null } })
    if (!existing) {
      const startsAt = new Date(eventBase.getTime() + ev.daysAhead * 24 * 60 * 60 * 1000)
      startsAt.setHours(9, 0, 0, 0)
      await prisma.event.create({
        data: { title: ev.title, description: ev.description, venue: ev.venue, startsAt },
      })
    }
  }
  console.log("Upcoming activities seeded")

  // ── Room selection (bilik) ────────────────────────────────────────────────
  // Residence blocks (gender-restricted), rooms + auto beds, an active intake,
  // and an open selection window so the picker is demoable right after seeding.

  // Block codes match the campus-map zones (campus-block-map.tsx). Gender is
  // admin-determined per block; students only ever see blocks of their own gender.
  const residenceBlocks = [
    { name: "K19A", gender: "male" as const, floors: 3, sortOrder: 1 },
    { name: "K19B", gender: "male" as const, floors: 3, sortOrder: 2 },
    { name: "K19C", gender: "female" as const, floors: 3, sortOrder: 3 },
    { name: "K19D", gender: "female" as const, floors: 3, sortOrder: 4 },
    { name: "K18A", gender: "male" as const, floors: 3, sortOrder: 5 },
    { name: "K18B", gender: "female" as const, floors: 3, sortOrder: 6 },
    { name: "K18C", gender: "female" as const, floors: 3, sortOrder: 7 },
    { name: "K18D", gender: "female" as const, floors: 3, sortOrder: 8 },
  ]

  const ROOMS_PER_FLOOR = 6
  for (const rb of residenceBlocks) {
    const block = await prisma.residenceBlock.upsert({
      where: { name: rb.name },
      update: { gender: rb.gender, floors: rb.floors, sortOrder: rb.sortOrder },
      create: { name: rb.name, gender: rb.gender, floors: rb.floors, sortOrder: rb.sortOrder },
    })

    // Layout per block: floors 1 & 2 are all double rooms, the top floor (3) is
    // all single rooms.
    for (let floor = 1; floor <= rb.floors; floor++) {
      const type: "single" | "double" = floor === rb.floors ? "single" : "double"
      for (let i = 1; i <= ROOMS_PER_FLOOR; i++) {
        const number = `${rb.name}-${floor}${String(i).padStart(2, "0")}`
        const existing = await prisma.residenceRoom.findFirst({
          where: { blockId: block.id, number },
        })
        if (existing) {
          // Reconcile a room whose type changed (only while it's empty).
          if (existing.type !== type) {
            const occupied = await prisma.bed.count({
              where: { roomId: existing.id, occupantId: { not: null }, deletedAt: null },
            })
            if (occupied === 0) {
              await prisma.residenceRoom.update({ where: { id: existing.id }, data: { type } })
              const beds = await prisma.bed.findMany({ where: { roomId: existing.id } })
              for (const bed of beds) {
                const keep =
                  type === "single" ? bed.position === "single" : bed.position !== "single"
                if (!keep) {
                  await prisma.bed.update({ where: { id: bed.id }, data: { deletedAt: new Date() } })
                } else if (bed.deletedAt) {
                  await prisma.bed.update({ where: { id: bed.id }, data: { deletedAt: null } })
                }
              }
              for (const position of type === "single" ? (["single"] as const) : (["left", "right"] as const)) {
                if (!beds.some((b) => b.position === position)) {
                  await prisma.bed.create({ data: { roomId: existing.id, position } })
                }
              }
            } else {
              console.warn(`Room ${number} still has occupants — type kept as ${existing.type}`)
            }
          }
          continue
        }
        const room = await prisma.residenceRoom.create({
          data: { blockId: block.id, floor, number, type, sortOrder: i },
        })
        const positions =
          type === "single" ? (["single"] as const) : (["left", "right"] as const)
        for (const position of positions) {
          await prisma.bed.create({ data: { roomId: room.id, position } })
        }
      }
    }
  }

  console.log("Residence blocks + rooms seeded")

  // Active intake with a realistic batch of accepted students. Every student gets
  // a login account (password kiz123) so any of them can be used to test the
  // accommodation application. A123456 is the demo login and stays unassigned
  // so the student application flow can be tested. A999999 (Stable Student) is
  // included too so the stable account can also exercise the flow.
  const eligibleData = [
    { matricId: "A999999", name: "Stable Student", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A123456", name: "Example Student", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200001", name: "Nurul Aisyah Rahman", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200002", name: "Tan Mei Ling", gender: "female" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200003", name: "Ahmad Firdaus Ali", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200004", name: "Siti Nurhaliza Zainal", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200005", name: "Devi Sharmini Ramesh", gender: "female" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200006", name: "Sarah Jane Wong", gender: "female" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200007", name: "Nor Amirah Hassan", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200008", name: "Lim Wei Shan", gender: "female" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200009", name: "Aisyah Humaira Mohd Nor", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200010", name: "Lee Jia En", gender: "female" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200011", name: "Anis Safiya Ismail", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200012", name: "Priya Darshini Kumar", gender: "female" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200013", name: "Farah Izzati Aziz", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200014", name: "Chong Li Mei", gender: "female" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200015", name: "Nurul Huda Salleh", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200016", name: "Muhammad Izzat Rahman", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200017", name: "Daniel Tan Wei Ming", gender: "male" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200018", name: "Muhammad Faiz Omar", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200019", name: "Viknesh Murugan", gender: "male" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200020", name: "Adam Hakimi Yusof", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200021", name: "Ong Chee Hong", gender: "male" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200022", name: "Muhammad Syafiq Abdullah", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200023", name: "Arvin Raj Sivanandan", gender: "male" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200024", name: "Joshua Lee Kar Wai", gender: "male" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200025", name: "Amirul Hakim Roslan", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200026", name: "Harith Iskandar Zulkifli", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200027", name: "Kavin Ananth Raju", gender: "male" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200028", name: "Muhd Aiman Mohd Ariffin", gender: "male" as const, religion: "Islam", race: "Malay" },
  ]

  let intake = await prisma.intake.findFirst({ where: { status: "active", deletedAt: null } })
  if (!intake) {
    const admin = await prisma.user.findUnique({ where: { matricId: "ADMIN002" } })
    intake = await prisma.intake.create({
      data: {
        name: "Session 2026/2027",
        status: "active",
        importedById: admin?.id ?? null,
        rowCount: 0,
      },
    })
  }

  const eligibleIds = new Map<string, string>()
  for (const e of eligibleData) {
    const user = await prisma.user.upsert({
      where: { matricId: e.matricId },
      update: { role: "ahli", deletedAt: null },
      create: {
        matricId: e.matricId,
        name: e.name,
        email: `${e.matricId.toLowerCase()}@siswa.ukm.edu.my`,
        passwordHash,
        role: "ahli",
        residentCardQr: e.matricId,
      },
    })
    const eligible = await prisma.eligibleStudent.upsert({
      where: { intakeId_matricId: { intakeId: intake.id, matricId: e.matricId } },
      update: { userId: user.id },
      create: {
        intakeId: intake.id,
        matricId: e.matricId,
        name: e.name,
        gender: e.gender,
        religion: e.religion,
        race: e.race,
        nationality: "Malaysia",
        faculty: "FTSM",
        yearOfStudy: "1",
        userId: user.id,
      },
    })
    eligibleIds.set(e.matricId, eligible.id)
  }

  await prisma.intake.update({
    where: { id: intake.id },
    data: { rowCount: eligibleData.length },
  })
  console.log(`Active intake + ${eligibleData.length} eligible students seeded`)

  // ── Community chat demo thread ───────────────────────────────────────────
  // Only seeded into an empty room so repeated reseeds never duplicate the
  // thread. Gives the redesigned room (role badges, reactions, replies) some
  // life out of the box.
  const existingChat = await prisma.communityChatMessage.count({ where: { deletedAt: null } })
  if (existingChat === 0) {
    const demo = await prisma.user.findMany({
      where: { matricId: { in: ["ADMIN001", "ADMIN002", "STAF001", "FEL001", "A123456", "A999999", "SUPER001"] } },
    })
    const byMatric = new Map(demo.map((u) => [u.matricId, u]))
    const admin1 = byMatric.get("ADMIN001")
    const admin2 = byMatric.get("ADMIN002")
    const staf = byMatric.get("STAF001")
    const fellow = byMatric.get("FEL001")
    const student = byMatric.get("A123456")
    const stableStudent = byMatric.get("A999999")
    if (admin1 && admin2 && staf && fellow && student && stableStudent) {
      const t = Date.now() - 1000 * 60 * 30
      const mk = (i: number) => new Date(t + i * 1000 * 90)
      const welcome = await prisma.communityChatMessage.create({
        data: {
          userId: admin1.id,
          message:
            "Welcome to the KIZ Community Chat! 🎉 This is our shared room for everything college — events, roommates, quick questions and daily life at KIZ.",
          createdAt: mk(0),
        },
      })
      await prisma.communityChatMessage.create({
        data: {
          userId: student.id,
          message: "Hi everyone! Just moved into K18A this week — anyone know when the laundry room is quietest? 😅",
          replyToId: welcome.id,
          createdAt: mk(1),
        },
      })
      await prisma.communityChatMessage.create({
        data: {
          userId: stableStudent.id,
          message: "Usually late morning on weekdays! I did my laundry yesterday around 10am and had it all to myself.",
          replyToId: welcome.id,
          createdAt: mk(2),
        },
      })
      await prisma.communityChatMessage.create({
        data: {
          userId: admin2.id,
          message:
            "Great to see everyone chatting! Reminder: complaints and damage reports belong in Helpdesk (Support → Help & Support) so the office can track them properly.",
          createdAt: mk(3),
        },
      })
      await prisma.communityChatMessage.create({
        data: {
          userId: fellow.id,
          message:
            "And if you need a quiet study corner, the seminar rooms are bookable on weekdays — check Facilities in the menu. Have a great semester, KIZ! 📚",
          createdAt: mk(4),
        },
      })
      await prisma.communityChatMessage.create({
        data: {
          userId: staf.id,
          message: "Seconding the laundry tip — weekday mornings are your best bet. Enjoy the new semester, everyone!",
          createdAt: mk(5),
        },
      })

      const reacts: Array<{ userId: string; messageId: string; emoji: string }> = [
        { userId: stableStudent.id, messageId: welcome.id, emoji: "🎉" },
        { userId: fellow.id, messageId: welcome.id, emoji: "❤️" },
        { userId: student.id, messageId: welcome.id, emoji: "👍" },
        { userId: student.id, messageId: admin2.id, emoji: "🙏" },
        { userId: stableStudent.id, messageId: fellow.id, emoji: "👍" },
        { userId: staf.id, messageId: welcome.id, emoji: "🎉" },
        { userId: admin1.id, messageId: student.id, emoji: "😂" },
      ]
      for (const r of reacts) {
        await prisma.chatMessageReaction.create({ data: r })
      }
      console.log("Community chat demo thread seeded")
    }
  }

  // ── Pre-placed occupants (roommates) ──────────────────────────────────────
  // Fill beds across the male blocks (K19A/K19B) and female blocks
  // (K19C/K19D/K18B) so the picker shows a live mix of full / partial /
  // available rooms with occupant cards. Singles only exist on floor 3;
  // floors 1 & 2 are doubles (left/right).
  const occupancyPlan: Array<{ room: string; position: "left" | "right" | "single"; matricId: string }> = [
    { room: "K19A-101", position: "left", matricId: "A200003" },
    { room: "K19A-101", position: "right", matricId: "A200016" },
    { room: "K19A-102", position: "left", matricId: "A200017" },
    { room: "K19A-102", position: "right", matricId: "A200018" },
    { room: "K19A-201", position: "left", matricId: "A200019" },
    { room: "K19A-201", position: "right", matricId: "A200020" },
    { room: "K19A-202", position: "left", matricId: "A200021" },
    { room: "K19A-301", position: "single", matricId: "A200022" },
    { room: "K19B-101", position: "left", matricId: "A200023" },
    { room: "K19B-101", position: "right", matricId: "A200024" },
    { room: "K19B-102", position: "left", matricId: "A200025" },
    { room: "K19B-102", position: "right", matricId: "A200026" },
    { room: "K19B-201", position: "left", matricId: "A200027" },
    { room: "K19B-301", position: "single", matricId: "A200028" },

    { room: "K19C-101", position: "left", matricId: "A200001" },
    { room: "K19C-101", position: "right", matricId: "A200004" },
    { room: "K19C-102", position: "left", matricId: "A200005" },
    { room: "K19C-102", position: "right", matricId: "A200006" },
    { room: "K19C-201", position: "left", matricId: "A200007" },
    { room: "K19C-201", position: "right", matricId: "A200008" },
    { room: "K19C-202", position: "left", matricId: "A200009" },
    { room: "K19C-301", position: "single", matricId: "A200010" },
    { room: "K19D-101", position: "left", matricId: "A200002" },
    { room: "K19D-101", position: "right", matricId: "A200011" },
    { room: "K19D-102", position: "left", matricId: "A200012" },
    { room: "K19D-102", position: "right", matricId: "A200013" },
    { room: "K19D-201", position: "left", matricId: "A200014" },
    { room: "K18B-101", position: "left", matricId: "A200015" },
  ]

  const now = new Date()
  for (const row of occupancyPlan) {
    const studentId = eligibleIds.get(row.matricId)
    if (!studentId) continue
    const bed = await prisma.bed.findFirst({
      where: { room: { number: row.room, deletedAt: null }, position: row.position, deletedAt: null },
    })
    if (!bed) {
      console.warn(`Bed not found for occupancy plan: ${row.room} / ${row.position}`)
      continue
    }
    await prisma.$transaction(async (tx) => {
      // Move the student out of any previously held bed, then place them.
      await tx.bed.updateMany({ where: { occupantId: studentId }, data: { occupantId: null } })
      await tx.bed.update({ where: { id: bed.id }, data: { occupantId: studentId } })
      await tx.eligibleStudent.update({
        where: { id: studentId },
        // These are final-allocation fixtures for the admin inventory view, not
        // student applications. Keep them unpublished by default.
        data: { selectedAt: now, assignedByAdmin: true },
      })
    })
  }
  console.log(`Dummy final allocations placed (${occupancyPlan.length} beds)`)

  await prisma.appSetting.upsert({
    where: { key: "bilik_allocations_published" },
    update: { value: "false" },
    create: { key: "bilik_allocations_published", value: "false" },
  })

  // Open accommodation application window: opened yesterday, closes in 7 days.
  const existingWindow = await prisma.selectionWindow.findFirst({ where: { isActive: true } })
  if (!existingWindow) {
    const now = new Date()
    await prisma.selectionWindow.create({
      data: {
        name: "Session 2026/2027",
        opensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        closingSoonHours: 24,
        isActive: true,
      },
    })
    console.log("Selection window seeded (open now)")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
