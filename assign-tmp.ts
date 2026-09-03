import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./app/generated/prisma/client"
async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const intake = await prisma.intake.findFirst({ where: { status: "active" } })
  const student = intake ? await prisma.eligibleStudent.findFirst({ where: { intakeId: intake.id, matricId: "A123456" } }) : null
  if (!student) { console.log("student not found"); return }
  const bed = await prisma.bed.findFirst({ where: { occupantId: null, room: { number: "K18A-101" } }, include: { room: true } })
  if (!bed) { console.log("bed not found"); return }
  await prisma.bed.update({ where: { id: bed.id }, data: { occupantId: student.id } })
  await prisma.eligibleStudent.update({ where: { id: student.id }, data: { selectedAt: new Date() } })
  console.log("assigned", student.matricId, "->", bed.room.number)
  await pool.end()
}
main()
