/**
 * Starter FAQ questions for KIZ-AI, in Bahasa Melayu (staff-facing), focused on
 * Kolej Ibu Zain procedures and residential-college life. Answers are blank —
 * staff fill them in. `keywords` carry English/Chinese terms so KIZ-AI can still
 * match questions asked in other languages.
 *
 * Used for: the downloadable Excel template (instructions + examples + these
 * questions) and the "Add starter questions" button in `urus-faq`.
 *
 * Note: these are procedural prompts, not answers. Do NOT bake in specifics
 * (fees, phone numbers, times) — those must come from the KIZ office.
 */

export interface FaqSeedItem {
  category: string
  /** Question in Bahasa Melayu (the canonical wording stored + indexed). */
  question: string
  /** English/Chinese terms to help cross-language matching. */
  keywords: string
}

export const FAQ_CATEGORIES = [
  "Registration & Check-in",
  "Room & Facilities",
  "Fees & Payments",
  "Rules & Discipline",
  "Visitors & Guests",
  "Cleanliness & Maintenance",
  "Safety & Emergencies",
  "Welfare & Support",
  "Food & Dining",
  "Activities & Community",
  "Transport & Parking",
  "General & Contact",
] as const

/** Malay gloss for each category, shown in the template instructions sheet. */
export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  "Registration & Check-in": "Pendaftaran & Daftar Masuk",
  "Room & Facilities": "Bilik & Kemudahan",
  "Fees & Payments": "Yuran & Pembayaran",
  "Rules & Discipline": "Peraturan & Disiplin",
  "Visitors & Guests": "Pelawat & Tetamu",
  "Cleanliness & Maintenance": "Kebersihan & Penyelenggaraan",
  "Safety & Emergencies": "Keselamatan & Kecemasan",
  "Welfare & Support": "Kebajikan & Sokongan",
  "Food & Dining": "Makanan & Kafeteria",
  "Activities & Community": "Aktiviti & Komuniti",
  "Transport & Parking": "Pengangkutan & Parkir",
  "General & Contact": "Umum & Hubungan",
}

export const FAQ_SEED: FaqSeedItem[] = [
  // Registration & Check-in
  { category: "Registration & Check-in", question: "Apakah prosedur daftar masuk (check-in) apabila saya tiba di KIZ?", keywords: "check-in procedure arrival registration" },
  { category: "Registration & Check-in", question: "Dokumen apa yang perlu saya bawa untuk daftar masuk?", keywords: "documents required check in" },
  { category: "Registration & Check-in", question: "Di mana kaunter KIZ dan bilakah waktu operasinya?", keywords: "counter location office hours" },
  { category: "Registration & Check-in", question: "Apa perlu saya buat jika saya tiba selepas kaunter tutup?", keywords: "arrive after hours late counter closed" },
  { category: "Registration & Check-in", question: "Bagaimana saya mengambil kunci bilik saya?", keywords: "collect room key" },
  { category: "Registration & Check-in", question: "Apakah prosedur daftar keluar (check-out) pada hujung semester?", keywords: "check-out procedure end semester" },
  { category: "Registration & Check-in", question: "Apa yang berlaku jika saya daftar keluar lewat?", keywords: "late check out penalty fine" },
  { category: "Registration & Check-in", question: "Bolehkah saya masuk lebih awal daripada tarikh daftar masuk rasmi?", keywords: "move in early before check in date" },

  // Room & Facilities
  { category: "Room & Facilities", question: "Apakah jenis bilik yang tersedia di KIZ?", keywords: "room types single twin sharing" },
  { category: "Room & Facilities", question: "Bagaimana bilik diagihkan kepada pelajar?", keywords: "room allocation how assigned" },
  { category: "Room & Facilities", question: "Bolehkah saya memilih bilik atau rakan sebilik sendiri?", keywords: "choose own room roommate" },
  { category: "Room & Facilities", question: "Perabot dan kemudahan apa yang disediakan dalam setiap bilik?", keywords: "furniture facilities provided in room" },
  { category: "Room & Facilities", question: "Adakah penghawa dingin disediakan di dalam bilik?", keywords: "air conditioner aircond" },
  { category: "Room & Facilities", question: "Bolehkah saya membawa perkakas elektrik sendiri seperti cerek, seterika atau peti sejuk?", keywords: "electrical appliances kettle iron fridge allowed" },
  { category: "Room & Facilities", question: "Adakah terdapat dapur atau pantri berkongsi?", keywords: "shared kitchen pantry" },
  { category: "Room & Facilities", question: "Di mana bilik dobi dan berapakah kosnya?", keywords: "laundry room cost washing" },
  { category: "Room & Facilities", question: "Adakah terdapat surau atau bilik solat di KIZ?", keywords: "surau prayer room musolla" },
  { category: "Room & Facilities", question: "Adakah terdapat bilik belajar atau ruang perbincangan?", keywords: "study room discussion area" },

  // Fees & Payments
  { category: "Fees & Payments", question: "Berapakah yuran kolej kediaman?", keywords: "college fees amount room fee" },
  { category: "Fees & Payments", question: "Bilakah dan bagaimana saya membayar yuran kolej?", keywords: "pay fees when how payment" },
  { category: "Fees & Payments", question: "Adakah terdapat deposit, dan bolehkah ia dipulangkan?", keywords: "deposit refundable" },
  { category: "Fees & Payments", question: "Apa yang berlaku jika saya membayar lewat?", keywords: "late payment penalty" },
  { category: "Fees & Payments", question: "Bolehkah saya mendapatkan resit pembayaran?", keywords: "payment receipt" },
  { category: "Fees & Payments", question: "Adakah bantuan kewangan atau pengecualian yuran disediakan?", keywords: "financial aid exemption assistance" },
  { category: "Fees & Payments", question: "Apakah penalti kerana merosakkan harta kolej?", keywords: "damage property penalty" },

  // Rules & Discipline
  { category: "Rules & Discipline", question: "Apakah waktu perintah berkurung atau waktu pintu pagar ditutup?", keywords: "curfew gate closing time" },
  { category: "Rules & Discipline", question: "Bolehkah saya memasak di dalam bilik?", keywords: "cooking in room allowed" },
  { category: "Rules & Discipline", question: "Apakah peraturan mengenai merokok dan vape?", keywords: "smoking vaping rules" },
  { category: "Rules & Discipline", question: "Adakah haiwan peliharaan dibenarkan di kolej?", keywords: "pets allowed" },
  { category: "Rules & Discipline", question: "Apakah dasar mengenai alkohol dan barang terlarang?", keywords: "alcohol prohibited items policy" },
  { category: "Rules & Discipline", question: "Apa yang berlaku jika saya melanggar peraturan kolej?", keywords: "break rules consequences disciplinary" },
  { category: "Rules & Discipline", question: "Adakah terdapat kod pakaian di KIZ?", keywords: "dress code attire" },
  { category: "Rules & Discipline", question: "Bolehkah saya menyimpan basikal atau motosikal di KIZ?", keywords: "bicycle motorcycle storage" },
  { category: "Rules & Discipline", question: "Apakah waktu senyap (quiet hours)?", keywords: "quiet hours noise" },

  // Visitors & Guests
  { category: "Visitors & Guests", question: "Apakah waktu melawat di KIZ?", keywords: "visiting hours" },
  { category: "Visitors & Guests", question: "Bagaimana saya mendaftarkan pelawat di pintu pagar?", keywords: "register visitor at gate" },
  { category: "Visitors & Guests", question: "Bolehkah pelawat menginap semalaman?", keywords: "overnight visitors stay" },
  { category: "Visitors & Guests", question: "Bolehkah saya menempah rumah tetamu untuk keluarga saya?", keywords: "guest house booking family" },
  { category: "Visitors & Guests", question: "Adakah pelawat lelaki dibenarkan masuk blok wanita, dan sebaliknya?", keywords: "male visitors female block policy opposite gender" },
  { category: "Visitors & Guests", question: "Apakah peraturan untuk penghantar makanan dan penghantaran?", keywords: "food delivery rider grab panda rules" },
  { category: "Visitors & Guests", question: "Apa yang berlaku jika pelawat saya melanggar peraturan?", keywords: "visitor breaks rule" },

  // Cleanliness & Maintenance
  { category: "Cleanliness & Maintenance", question: "Bagaimana saya melaporkan masalah penyelenggaraan di bilik saya?", keywords: "report maintenance issue room repair" },
  { category: "Cleanliness & Maintenance", question: "Siapa yang membersihkan kawasan umum dan tandas?", keywords: "who cleans common areas toilets" },
  { category: "Cleanliness & Maintenance", question: "Bilakah sampah dikutip?", keywords: "garbage collection schedule waste" },
  { category: "Cleanliness & Maintenance", question: "Bagaimana saya melaporkan masalah serangga atau perosak?", keywords: "pest problem cockroach rat report" },
  { category: "Cleanliness & Maintenance", question: "Apa perlu saya buat jika berlaku gangguan air atau elektrik?", keywords: "water electricity disruption power outage" },
  { category: "Cleanliness & Maintenance", question: "Bagaimana saya melaporkan penghawa dingin atau kipas yang rosak?", keywords: "faulty aircond fan report" },
  { category: "Cleanliness & Maintenance", question: "Bolehkah saya meminta pembaikan bilik selepas waktu pejabat?", keywords: "repair after office hours emergency" },

  // Safety & Emergencies
  { category: "Safety & Emergencies", question: "Nombor apa yang perlu saya hubungi dalam kecemasan di KIZ?", keywords: "emergency number call" },
  { category: "Safety & Emergencies", question: "Di mana pos pengawal atau pejabat keselamatan?", keywords: "guard post security office" },
  { category: "Safety & Emergencies", question: "Apakah prosedur pemindahan kebakaran?", keywords: "fire evacuation procedure" },
  { category: "Safety & Emergencies", question: "Di mana alat pemadam api dan pintu kecemasan?", keywords: "fire extinguisher emergency exit" },
  { category: "Safety & Emergencies", question: "Bagaimana saya melaporkan insiden keselamatan?", keywords: "report security incident" },
  { category: "Safety & Emergencies", question: "Apa perlu saya buat jika saya hilang kunci bilik?", keywords: "lost room key replacement" },
  { category: "Safety & Emergencies", question: "Adakah CCTV dipasang di kolej?", keywords: "cctv camera installed" },
  { category: "Safety & Emergencies", question: "Siapa yang perlu saya hubungi untuk kecemasan perubatan?", keywords: "medical emergency contact ambulance" },

  // Welfare & Support
  { category: "Welfare & Support", question: "Di mana bilik rawatan (sick bay) atau bilik bantuan awal?", keywords: "sick bay first aid room" },
  { category: "Welfare & Support", question: "Adakah kaunselor atau pegawai kebajikan di KIZ?", keywords: "counsellor welfare officer" },
  { category: "Welfare & Support", question: "Siapa yang boleh saya hubungi jika saya ada masalah peribadi?", keywords: "personal problems who to talk counselling" },
  { category: "Welfare & Support", question: "Adakah terdapat program sokongan pembelajaran atau mentor?", keywords: "study support mentorship programme" },
  { category: "Welfare & Support", question: "Apakah sokongan untuk pelajar antarabangsa?", keywords: "international student support" },
  { category: "Welfare & Support", question: "Bagaimana saya melaporkan buli atau gangguan?", keywords: "report bullying harassment" },
  { category: "Welfare & Support", question: "Adakah terdapat bank makanan atau bantuan kewangan?", keywords: "food bank financial assistance" },

  // Food & Dining
  { category: "Food & Dining", question: "Adakah terdapat kafeteria atau kafe di KIZ?", keywords: "cafeteria cafe canteen" },
  { category: "Food & Dining", question: "Bilakah waktu operasi kafeteria?", keywords: "cafeteria opening hours" },
  { category: "Food & Dining", question: "Bolehkah saya memasak makanan sendiri?", keywords: "cook own food cooking" },
  { category: "Food & Dining", question: "Adakah kedai serbaneka berdekatan?", keywords: "convenience store nearby shop" },

  // Activities & Community
  { category: "Activities & Community", question: "Apakah aktiviti pelajar yang dianjurkan di KIZ?", keywords: "student activities programme" },
  { category: "Activities & Community", question: "Bagaimana saya menyertai jawatankuasa pelajar KIZ (JKK)?", keywords: "join JKK student committee" },
  { category: "Activities & Community", question: "Adakah kemudahan sukan di KIZ?", keywords: "sports facilities" },
  { category: "Activities & Community", question: "Bagaimana saya menempah gelanggang futsal atau kemudahan sukan?", keywords: "book futsal court sports facility" },
  { category: "Activities & Community", question: "Di mana saya boleh melihat pengumuman tentang aktiviti KIZ?", keywords: "see announcements events" },

  // Transport & Parking
  { category: "Transport & Parking", question: "Adakah parkir untuk pelajar di KIZ?", keywords: "parking students car" },
  { category: "Transport & Parking", question: "Bagaimana saya ke KIZ dari kampus utama UKM?", keywords: "how to get to KIZ from main campus directions" },
  { category: "Transport & Parking", question: "Adakah perkhidmatan bas ulang-alik?", keywords: "shuttle bus service" },
  { category: "Transport & Parking", question: "Di mana saya boleh meletakkan motosikal saya?", keywords: "motorcycle parking" },

  // General & Contact
  { category: "General & Contact", question: "Apakah alamat penuh Kolej Ibu Zain?", keywords: "full address location" },
  { category: "General & Contact", question: "Siapa Pengetua KIZ?", keywords: "principal pengetua name" },
  { category: "General & Contact", question: "Siapa yang perlu saya hubungi untuk pertanyaan umum?", keywords: "general enquiries contact" },
  { category: "General & Contact", question: "Bilakah waktu pejabat pentadbiran KIZ?", keywords: "office hours administration" },
  { category: "General & Contact", question: "Di mana pejabat pentadbiran KIZ?", keywords: "admin office location" },
  { category: "General & Contact", question: "Bagaimana saya boleh merayu keputusan kolej?", keywords: "appeal decision" },
]

/** Example Q&A shown in the template instructions sheet (Malay). */
export const FAQ_EXAMPLES: { question: string; answer: string }[] = [
  {
    question: "Bilakah waktu melawat di KIZ?",
    answer: "Waktu melawat ialah setiap hari dari 8:00 pagi hingga 10:00 malam. Pelawat mesti mendaftar di pos pengawal dan menyerahkan kad pengenalan sebelum masuk.",
  },
  {
    question: "Bagaimana saya melaporkan paip bocor di bilik saya?",
    answer: "Hantar permohonan melalui Helpdesk → Support Ticket, pilih kategori 'Maintenance & Repair', dan nyatakan blok serta nombor bilik anda. Pihak penyelenggaraan akan hadir pada hari bekerja berikutnya.",
  },
  {
    question: "Berapakah yuran kolej kediaman?",
    answer: "Tulis kadar yuran yang betul di sini (contoh: RM ___ sebulan). Rujuk pejabat KIZ untuk kadar terkini sebelum menerbitkan jawapan ini.",
  },
]

/** Column headers used by the CSV/Excel template and the importer. */
export const FAQ_CSV_HEADERS = ["category", "question", "answer", "keywords", "language", "published"] as const
