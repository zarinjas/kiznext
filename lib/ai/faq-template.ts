import { buildXlsx, type XlsxSheet } from "@/lib/xlsx"
import { FAQ_SEED, FAQ_CSV_HEADERS, FAQ_CATEGORIES, FAQ_CATEGORY_LABELS, FAQ_EXAMPLES } from "./faq-seed"

/**
 * Builds the downloadable FAQ template as an Excel workbook (no server round
 * trip, no spreadsheet library — uses the in-house `buildXlsx` writer).
 *
 * Sheet 1 "Panduan" — Malay instructions + examples + the category list.
 * Sheet 2 "FAQ"     — the fillable table (header row + starter questions).
 */

function panduanSheet(): XlsxSheet {
  const categoryList = FAQ_CATEGORIES.map((c) => `${c} (${FAQ_CATEGORY_LABELS[c] ?? ""})`).join("; ")
  const rows: string[][] = [
    ["Cara guna fail ini", ""],
    ["Langkah 1", "Buka sheet 'FAQ' (bukan sheet ini). Jangan ubah atau hapus baris tajuk."],
    ["Langkah 2", "Soalan sudah disediakan. Isi jawapan rasmi dalam lajur 'answer'."],
    ["Langkah 3", "Untuk tambah soalan baru: taip soalan (Bahasa Melayu) dalam 'question', jawapan dalam 'answer', dan pilih 'category'."],
    ["Langkah 4", "'keywords' (pilihan): taip perkataan Inggeris/Cina untuk membantu AI memadankan soalan."],
    ["Langkah 5", "'language': biarkan 'ms'. 'published': 'true' untuk aktif selepas re-index, 'false' simpan sebagai draf."],
    ["Langkah 6", "Simpan fail, kemudian upload di app: AI → FAQ Knowledge → Import."],
    ["Langkah 7", "Akhir sekali, pergi ke AI → KIZ-AI dan tekan 'Re-index now'."],
    ["", ""],
    ["Penting", "Jangan reka fakta (yuran, nombor telefon, waktu). Dapatkan jawapan rasmi daripada pejabat KIZ."],
    ["", ""],
    ["Senarai kategori", categoryList],
    ["", ""],
    ["Contoh soalan & jawapan", "(Contoh sahaja — jangan salin bulat-bulat. Gantikan dengan maklumat sebenar KIZ.)"],
    ["Contoh 1 — Soalan", FAQ_EXAMPLES[0].question],
    ["Contoh 1 — Jawapan", FAQ_EXAMPLES[0].answer],
    ["Contoh 2 — Soalan", FAQ_EXAMPLES[1].question],
    ["Contoh 2 — Jawapan", FAQ_EXAMPLES[1].answer],
    ["Contoh 3 — Soalan", FAQ_EXAMPLES[2].question],
    ["Contoh 3 — Jawapan", FAQ_EXAMPLES[2].answer],
  ]
  return { name: "Panduan", headers: ["Perkara", "Penerangan"], rows }
}

function faqSheet(): XlsxSheet {
  return {
    name: "FAQ",
    headers: [...FAQ_CSV_HEADERS],
    rows: FAQ_SEED.map((s) => [s.category, s.question, "", s.keywords, "ms", "true"]),
  }
}

export function buildFaqTemplateXlsx(): Blob {
  return buildXlsx([panduanSheet(), faqSheet()])
}
