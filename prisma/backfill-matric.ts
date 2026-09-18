/**
 * One-off data backfill: normalise every stored matric ID to its canonical form
 * (uppercase A–Z / 0–9 only). eKolej sheet exports sometimes append footnote
 * markers — e.g. an international-student flag "A222765*" — which broke
 * check-in lookup, account matching and the accommodation sheet sync because
 * the student types the clean "A222765".
 *
 *   npx tsx prisma/backfill-matric.ts
 *
 * Safe to re-run — it only touches rows that differ from the canonical form,
 * and skips (with a warning) any row whose cleaned value would collide with an
 * existing unique key instead of failing the whole run.
 */
import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import { cleanMatric } from "../lib/room-selection"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * A matric ID is letters + digits only (e.g. "A222765"). If the stored value
 * contains "@" or "." it's almost certainly an email that was typed into the
 * matric field by mistake — cleaning it would turn "a218899@siswa.ukm.edu.my"
 * into unreadable junk, so leave it for a human to fix.
 */
function looksLikeEmail(raw: string): boolean {
  return /[@.]/.test(raw)
}

async function main() {
  let fixed = 0
  let skipped = 0

  // ── eligible_students (unique per intake) ─────────────────────────────────
  const students = await prisma.eligibleStudent.findMany({
    select: { id: true, intakeId: true, matricId: true },
  })
  const studentKeys = new Set(students.map((s) => `${s.intakeId}:${s.matricId}`))
  for (const s of students) {
    if (looksLikeEmail(s.matricId)) {
      console.warn(`  skip  eligible_student "${s.matricId}" — looks like an email, not a matric`)
      skipped++
      continue
    }
    const clean = cleanMatric(s.matricId)
    if (clean === s.matricId) continue
    const key = `${s.intakeId}:${clean}`
    if (studentKeys.has(key)) {
      console.warn(`  skip  eligible_student ${s.matricId} → ${clean} — target already exists in this intake`)
      skipped++
      continue
    }
    studentKeys.delete(`${s.intakeId}:${s.matricId}`)
    studentKeys.add(key)
    await prisma.eligibleStudent.update({ where: { id: s.id }, data: { matricId: clean } })
    console.log(`  fix   eligible_student ${s.matricId} → ${clean}`)
    fixed++
  }

  // ── users (globally unique) ───────────────────────────────────────────────
  const users = await prisma.user.findMany({ select: { id: true, matricId: true } })
  const userMatrics = new Set(users.map((u) => u.matricId))
  for (const u of users) {
    if (looksLikeEmail(u.matricId)) {
      console.warn(`  skip  user "${u.matricId}" — looks like an email, not a matric`)
      skipped++
      continue
    }
    const clean = cleanMatric(u.matricId)
    if (clean === u.matricId) continue
    if (userMatrics.has(clean)) {
      console.warn(`  skip  user ${u.matricId} → ${clean} — target already exists`)
      skipped++
      continue
    }
    userMatrics.delete(u.matricId)
    userMatrics.add(clean)
    await prisma.user.update({ where: { id: u.id }, data: { matricId: clean } })
    console.log(`  fix   user ${u.matricId} → ${clean}`)
    fixed++
  }

  // ── check_in_records (snapshots, no unique key) ───────────────────────────
  const records = await prisma.checkInRecord.findMany({ select: { id: true, matricId: true } })
  for (const r of records) {
    if (looksLikeEmail(r.matricId)) {
      console.warn(`  skip  check_in_record "${r.matricId}" — looks like an email, not a matric`)
      skipped++
      continue
    }
    const clean = cleanMatric(r.matricId)
    if (clean === r.matricId) continue
    await prisma.checkInRecord.update({ where: { id: r.id }, data: { matricId: clean } })
    console.log(`  fix   check_in_record ${r.matricId} → ${clean}`)
    fixed++
  }

  // ── invitations (nullable, no unique key) ─────────────────────────────────
  const invitations = await prisma.invitation.findMany({
    where: { matricId: { not: null } },
    select: { id: true, matricId: true },
  })
  for (const inv of invitations) {
    const raw = inv.matricId ?? ""
    if (looksLikeEmail(raw)) {
      console.warn(`  skip  invitation "${raw}" — looks like an email, not a matric`)
      skipped++
      continue
    }
    const clean = cleanMatric(raw)
    if (!clean || clean === raw) continue
    await prisma.invitation.update({ where: { id: inv.id }, data: { matricId: clean } })
    console.log(`  fix   invitation ${raw} → ${clean}`)
    fixed++
  }

  console.log(`Backfill complete — ${fixed} row(s) normalised${skipped ? `, ${skipped} skipped` : ""}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
