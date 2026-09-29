/**
 * Legal content for the public Privacy Policy, Terms & Conditions and Account
 * Deletion pages.
 *
 * Store submission (App Store / Google Play) requires a reachable, public
 * privacy-policy URL and — for apps that let users create an account — an
 * account-deletion resource. These strings are deliberately data-only so the
 * same content feeds the web pages and is easy to translate/audit, and so both
 * store reviewers and residents can read everything in one language toggle.
 *
 * Language is Malay-first (locale is `ms`), with an English mirror for
 * international reviewers.
 */

export const LEGAL = {
  /** Web product name. */
  brand: "KIZ Super App",
  /** Mobile app name shown on the App Store / Play Store. */
  product: "MyKIZ",
  college: "Kolej Ibu Zain",
  university: "Universiti Kebangsaan Malaysia",
  /** Party responsible for the personal data (the data controller). */
  controller: "Kolej Ibu Zain, Universiti Kebangsaan Malaysia",
  contactEmail: "support@mykiz.my",
  /** Last material update — update this whenever the text changes. */
  updated: "29 September 2026",
} as const

export type LegalLang = "ms" | "en"

export interface LegalSection {
  heading: string
  /** Body paragraphs, rendered in order. */
  paragraphs?: string[]
  /** Bullet list, rendered after the paragraphs. */
  bullets?: string[]
}

export interface LegalDoc {
  title: string
  summary: string
  sections: LegalSection[]
}

export interface LegalDocSet {
  ms: LegalDoc
  en: LegalDoc
}

const contactLine = (lang: LegalLang) =>
  lang === "ms"
    ? `E-mel ${LEGAL.contactEmail} atau hubungi pejabat pengurusan ${LEGAL.college} (waktu pejabat: Isnin–Jumaat, 8:00 pagi – 5:00 petang, waktu Malaysia).`
    : `Email ${LEGAL.contactEmail} or contact the ${LEGAL.college} management office (office hours: Monday–Friday, 8:00 am – 5:00 pm, Malaysian time).`

// ── Privacy Policy ──────────────────────────────────────────────────────────

export const privacyDoc: LegalDocSet = {
  ms: {
    title: "Dasar Privasi",
    summary: `${LEGAL.brand} (${LEGAL.product}) dikendalikan oleh ${LEGAL.controller}. Dasar ini menerangkan data peribadi yang kami kumpul, sebab kami mengumpulnya, dan hak anda di bawah Akta Perlindungan Data Peribadi 2010 (PDPA).`,
    sections: [
      {
        heading: "1. Pengenalan",
        paragraphs: [
          `${LEGAL.brand} ialah platform digital untuk warga ${LEGAL.college}, ${LEGAL.university}. Kami komited untuk melindungi Data Peribadi anda dan mematuhi Akta Perlindungan Data Peribadi 2010 (Akta 709).`,
          `Dengan mendaftar atau menggunakan aplikasi ini, anda bersetuju dengan pengumpulan dan penggunaan maklumat seperti yang diterangkan dalam dasar ini.`,
        ],
      },
      {
        heading: "2. Data yang kami kumpul",
        bullets: [
          "Identiti & hubungan: nama penuh, No. Matrik, alamat e-mel (termasuk e-mel @siswa.ukm.edu.my), nombor telefon dan peranan anda.",
          "Maklumat kolej: blok dan nombor bilik, status kediaman, gambar kad pengenalan pelajar digital dan kod QR kad penduduk.",
          "Maklumat akaun: kata laluan disimpan dalam bentuk cincangan (bcrypt) — kami tidak pernah melihat kata laluan asal anda — serta status akaun dan token pengesahan/reset yang telah dicincang.",
          "Aktiviti dalam aplikasi: tempahan fasiliti dan rumah tetamu, tiket dan mesej helpdesk, mesej chat komuniti, bungkusan, barang tercicir, pengumuman yang dibaca/diakui, rekod daftar masuk, laundry dan pesanan kafe.",
          "Peranti & teknikal: token pemberitahuan push (Expo), jenis platform, nama peranti dan masa akses terakhir.",
          "Imej: gambar profil anda dan imej yang anda muat naik sendiri (contohnya lampiran barang tercicir atau helpdesk).",
        ],
      },
      {
        heading: "3. Data lokasi",
        paragraphs: [
          "Ciri AR Wayfinder dan peta mini menggunakan lokasi peranti anda untuk menunjukkan arah dan kedudukan semasa. Lokasi diproses pada peranti anda dan tidak disimpan pada pelayan kami.",
        ],
      },
      {
        heading: "4. Bagaimana kami menggunakan data",
        bullets: [
          "Menyediakan dan menguruskan akaun anda serta mengesahkan identiti anda.",
          "Memproses tempahan, permohonan, aduan, bungkusan dan urusan kediaman.",
          "Menghantar pemberitahuan berkaitan perkhidmatan (contohnya kelulusan tempahan atau pengumuman kolej).",
          "Menambah baik keselamatan, kebolehpercayaan dan ciri aplikasi.",
          "Mematuhi keperluan undang-undang dan rekod institusi.",
        ],
      },
      {
        heading: "5. Asas pemprosesan",
        paragraphs: [
          "Kami memproses Data Peribadi anda berdasarkan persetujuan anda, keperluan kontrak/penyediaan perkhidmatan kediaman, kepentingan sah pentadbiran kolej, dan pematuhan kewajipan undang-undang.",
        ],
      },
      {
        heading: "6. Perkongsian data",
        paragraphs: [
          "Data anda boleh dikongsi dalam kalangan pentadbiran kolej dan universiti yang berkaitan untuk tujuan pentadbiran dan keselamatan. Kami juga menggunakan penyedia perkhidmatan pihak ketiga: Resend (penghantaran e-mel), Expo (pemberitahuan push) dan Google Sheets (penyelarasan senarai penghuni yang diluluskan) — penyedia ini memproses data bagi pihak kami sahaja.",
          "Kami tidak menjual atau menyewa Data Peribadi anda. Data hanya didedahkan kepada pihak berkuasa apabila diwajibkan oleh undang-undang.",
        ],
      },
      {
        heading: "7. Penyimpanan data",
        paragraphs: [
          "Kami menyimpan Data Peribadi anda selagi akaun anda aktif. Apabila anda memadamkan akaun, rekod anda ditandakan sebagai dipadam (soft delete) dan data peribadi anda dinyahaktifkan daripada akses harian. Rekod tertentu mungkin dikekalkan untuk tempoh yang munasabah bagi tujuan rekod institusi, audit, penyelesaian pertikaian dan pematuhan undang-undang.",
        ],
      },
      {
        heading: "8. Keselamatan",
        paragraphs: [
          "Kata laluan dan token disimpan dalam bentuk cincangan, sambungan dilindungi HTTPS, dan akses dalam sistem dikawal mengikut peranan (RBAC). Walaupun tiada sistem yang 100% selamat, kami mengambil langkah munasabah untuk melindungi data anda.",
        ],
      },
      {
        heading: "9. Hak anda",
        paragraphs: [
          "Di bawah PDPA, anda berhak untuk mengakses dan mendapatkan salinan Data Peribadi anda, membetulkan data yang tidak tepat, menarik balik persetujuan anda, dan menghadkan pemprosesan tertentu. Anda juga boleh meminta pemadaman akaun seperti dijelaskan dalam halaman Pemadaman Akaun.",
          contactLine("ms"),
        ],
      },
      {
        heading: "10. Kanak-kanak",
        paragraphs: [
          "Perkhidmatan ini disediakan untuk warga dan kakitangan UKM. Jika anda di bawah umur 18 tahun, anda perlu mendapatkan kebenaran ibu bapa atau penjaga sebelum menggunakan aplikasi ini.",
        ],
      },
      {
        heading: "11. Pautan pihak ketiga",
        paragraphs: [
          "Aplikasi ini mengandungi pautan ke perkhidmatan pihak ketiga (contohnya WhatsApp dan peta OpenStreetMap). Dasar privasi pihak ketiga terpakai apabila anda melawat pautan tersebut.",
        ],
      },
      {
        heading: "12. Perubahan kepada dasar ini",
        paragraphs: [
          "Kami boleh mengemas kini dasar ini dari semasa ke semasa. Versi terkini akan sentiasa disiarkan di halaman ini dengan tarikh kemas kini yang tertera.",
        ],
      },
      {
        heading: "13. Hubungi kami",
        paragraphs: [contactLine("ms")],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    summary: `${LEGAL.brand} (${LEGAL.product}) is operated by ${LEGAL.controller}. This policy explains what personal data we collect, why we collect it, and your rights under Malaysia's Personal Data Protection Act 2010 (PDPA).`,
    sections: [
      {
        heading: "1. Introduction",
        paragraphs: [
          `${LEGAL.brand} is a digital platform for the residents and staff of ${LEGAL.college}, ${LEGAL.university}. We are committed to protecting your Personal Data and to complying with the Personal Data Protection Act 2010 (Act 709).`,
          `By registering for or using this application, you consent to the collection and use of your information as described in this policy.`,
        ],
      },
      {
        heading: "2. Data we collect",
        bullets: [
          "Identity & contact: full name, Matric No., email address (including your @siswa.ukm.edu.my address), phone number and role.",
          "College information: block and room number, residency status, digital student ID image and resident card QR code.",
          "Account information: your password stored as a bcrypt hash — we never see your original password — plus account status and hashed verification/reset tokens.",
          "In-app activity: facility and guest-house bookings, helpdesk tickets and messages, community chat messages, parcels, lost & found, announcements read/acknowledged, check-in records, laundry and cafe orders.",
          "Device & technical: push notification token (Expo), platform type, device name and last-seen time.",
          "Images: your profile photo and images you upload yourself (for example lost & found or helpdesk attachments).",
        ],
      },
      {
        heading: "3. Location data",
        paragraphs: [
          "The AR Wayfinder and mini-map use your device location to show directions and your current position. Location is processed on your device and is not stored on our servers.",
        ],
      },
      {
        heading: "4. How we use your data",
        bullets: [
          "To provide and manage your account and verify your identity.",
          "To process bookings, applications, complaints, parcels and residence administration.",
          "To send service-related notifications (for example booking approvals or college announcements).",
          "To improve the security, reliability and features of the application.",
          "To meet legal requirements and institutional record-keeping obligations.",
        ],
      },
      {
        heading: "5. Basis for processing",
        paragraphs: [
          "We process your Personal Data on the basis of your consent, the performance of our residence services, the legitimate interests of college administration, and compliance with legal obligations.",
        ],
      },
      {
        heading: "6. Sharing your data",
        paragraphs: [
          "Your data may be shared within the relevant college and university administration for administrative and safety purposes. We also use third-party service providers: Resend (email delivery), Expo (push notifications) and Google Sheets (syncing the approved-resident list) — these providers process data only on our behalf.",
          "We do not sell or rent your Personal Data. Data is disclosed to authorities only where required by law.",
        ],
      },
      {
        heading: "7. Data retention",
        paragraphs: [
          "We retain your Personal Data while your account is active. When you delete your account, your records are marked as deleted (soft delete) and your personal data is deactivated from day-to-day access. Certain records may be retained for a reasonable period for institutional record-keeping, audit, dispute resolution and legal compliance.",
        ],
      },
      {
        heading: "8. Security",
        paragraphs: [
          "Passwords and tokens are stored as hashes, connections are protected with HTTPS, and access within the system is role-based (RBAC). While no system is 100% secure, we take reasonable steps to protect your data.",
        ],
      },
      {
        heading: "9. Your rights",
        paragraphs: [
          "Under the PDPA you have the right to access and obtain a copy of your Personal Data, correct inaccurate data, withdraw your consent, and limit certain processing. You may also request deletion of your account as described on the Account Deletion page.",
          contactLine("en"),
        ],
      },
      {
        heading: "10. Children",
        paragraphs: [
          "This service is provided for UKM residents and staff. If you are under 18, you must obtain the permission of a parent or guardian before using the application.",
        ],
      },
      {
        heading: "11. Third-party links",
        paragraphs: [
          "The application contains links to third-party services (for example WhatsApp and OpenStreetMap). Those third parties' privacy policies apply when you visit their links.",
        ],
      },
      {
        heading: "12. Changes to this policy",
        paragraphs: [
          "We may update this policy from time to time. The latest version will always be published on this page with the update date shown.",
        ],
      },
      {
        heading: "13. Contact us",
        paragraphs: [contactLine("en")],
      },
    ],
  },
}

// ── Terms & Conditions ──────────────────────────────────────────────────────

export const termsDoc: LegalDocSet = {
  ms: {
    title: "Terma & Syarat",
    summary: `Syarat penggunaan ${LEGAL.brand} (${LEGAL.product}), platform digital ${LEGAL.college}, ${LEGAL.university}.`,
    sections: [
      {
        heading: "1. Penerimaan terma",
        paragraphs: [
          `Dengan mengakses atau menggunakan ${LEGAL.brand}, anda bersetuju untuk terikat dengan Terma & Syarat ini. Jika anda tidak bersetuju, jangan gunakan perkhidmatan ini.`,
        ],
      },
      {
        heading: "2. Kelayakan",
        paragraphs: [
          `Perkhidmatan ini terbuka kepada pelajar yang menetap di, kakitangan, dan pentadbir ${LEGAL.college}, ${LEGAL.university}, serta pihak lain yang diluluskan oleh pihak pengurusan.`,
        ],
      },
      {
        heading: "3. Akaun & keselamatan",
        bullets: [
          "Anda bertanggungjawab menjaga kerahsiaan kata laluan anda.",
          "Satu akaun adalah untuk satu individu; jangan kongsikan akses anda.",
          "Maklumat yang anda berikan mestilah tepat dan dikemas kini.",
          "Laporkan segera kepada pejabat KIZ jika anda mengesyaki akaun anda telah digunakan tanpa kebenaran.",
        ],
      },
      {
        heading: "4. Penggunaan yang dibenarkan",
        paragraphs: ["Anda bersetuju untuk TIDAK:"],
        bullets: [
          "Menghantar kandungan yang mengganggu, mengancam, berunsur kebencian atau menyalahi undang-undang.",
          "Mendedahkan maklumat peribadi orang lain tanpa kebenaran (doxxing).",
          "Mengganggu, memalsukan atau menyalahgunakan sistem, termasuk cubaan mengakses akaun orang lain.",
          "Menggunakan aplikasi untuk tujuan komersial atau penipuan tanpa kebenaran bertulis.",
        ],
      },
      {
        heading: "5. Tempahan fasiliti & rumah tetamu",
        paragraphs: [
          "Semua tempahan tertakluk kepada ketersediaan dan kelulusan pihak pengurusan KIZ. Pembayaran diselesaikan secara manual di kaunter atau mengikut arahan pejabat. Tempahan yang tidak hadir atau lewat membatalkan boleh menyebabkan sekatan pada masa hadapan.",
        ],
      },
      {
        heading: "6. Chat komuniti & kandungan pengguna",
        paragraphs: [
          "Anda bertanggungjawab sepenuhnya ke atas kandungan yang anda hantar. Admin boleh memadamkan mesej (soft delete), menutup laporan, dan mengambil tindakan terhadap penyalahgunaan. Dengan menghantar kandungan, anda memberi kami lesen terhad untuk memaparkannya dalam aplikasi bagi tujuan perkhidmatan.",
        ],
      },
      {
        heading: "7. Pesanan kafe",
        paragraphs: [
          "Pesanan kafe dihantar melalui pautan WhatsApp dan transaksi dibuat terus dengan pengendali kafe. KIZ tidak bertanggungjawab ke atas transaksi tersebut. Menu, harga dan ketersediaan tertakluk kepada perubahan.",
        ],
      },
      {
        heading: "8. Ciri AI & AR",
        paragraphs: [
          "Beberapa ciri menggunakan kecerdasan buatan (contohnya terjemahan dan pembantu AI). Hasilnya mungkin tidak tepat atau tidak lengkap dan disediakan 'seadanya'. Jangan bergantung pada ciri ini untuk keputusan penting atau kecemasan.",
        ],
      },
      {
        heading: "9. Harta intelek",
        paragraphs: [
          `Semua tanda dagangan, logo, kandungan dan bahan dalam aplikasi ini adalah milik ${LEGAL.college}/${LEGAL.university} atau pemberi lesennya, dan tidak boleh disalin tanpa kebenaran.`,
        ],
      },
      {
        heading: "10. Ketersediaan perkhidmatan",
        paragraphs: [
          "Kami boleh mengubah, menangguh atau menamatkan sebahagian daripada perkhidmatan pada bila-bila masa. Kami tidak menjamin perkhidmatan akan bebas daripada gangguan atau ralat.",
        ],
      },
      {
        heading: "11. Penggantungan & penamatan",
        paragraphs: [
          "Kami boleh menggantung atau menamatkan akses anda jika anda melanggar Terma & Syarat ini atau jika perlu untuk keselamatan dan integriti sistem.",
        ],
      },
      {
        heading: "12. Penafian & had liabiliti",
        paragraphs: [
          `Perkhidmatan disediakan 'seadanya'. Setakat yang dibenarkan oleh undang-undang, ${LEGAL.controller} tidak bertanggungjawab ke atas sebarang kerugian tidak langsung, sampingan atau berbangkit yang timbul daripada penggunaan aplikasi.`,
        ],
      },
      {
        heading: "13. Undang-undang yang mentadbir",
        paragraphs: [
          "Terma ini ditadbir oleh undang-undang Malaysia. Sebarang pertikaian tertakluk kepada bidang kuasa mahkamah di Malaysia.",
        ],
      },
      {
        heading: "14. Perubahan terma",
        paragraphs: [
          "Kami boleh mengemas kini Terma ini dari semasa ke semasa. Penggunaan berterusan selepas perubahan bermakna anda menerima terma yang dikemas kini.",
        ],
      },
      {
        heading: "15. Hubungi kami",
        paragraphs: [contactLine("ms")],
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    summary: `Terms of use for ${LEGAL.brand} (${LEGAL.product}), the digital platform of ${LEGAL.college}, ${LEGAL.university}.`,
    sections: [
      {
        heading: "1. Acceptance of terms",
        paragraphs: [
          `By accessing or using ${LEGAL.brand}, you agree to be bound by these Terms & Conditions. If you do not agree, do not use the service.`,
        ],
      },
      {
        heading: "2. Eligibility",
        paragraphs: [
          `This service is open to students residing at, staff of, and administrators at ${LEGAL.college}, ${LEGAL.university}, and to others approved by the management.`,
        ],
      },
      {
        heading: "3. Account & security",
        bullets: [
          "You are responsible for keeping your password confidential.",
          "One account is for one individual; do not share your access.",
          "The information you provide must be accurate and kept up to date.",
          "Report suspected unauthorised use of your account to the KIZ office immediately.",
        ],
      },
      {
        heading: "4. Acceptable use",
        paragraphs: ["You agree NOT to:"],
        bullets: [
          "Post content that is harassing, threatening, hateful or unlawful.",
          "Reveal another person's private information without permission (doxxing).",
          "Disrupt, spoof or abuse the system, including attempting to access another account.",
          "Use the application for unauthorised commercial or fraudulent purposes.",
        ],
      },
      {
        heading: "5. Facility & guest-house bookings",
        paragraphs: [
          "All bookings are subject to availability and approval by KIZ management. Payment is settled manually at the counter or as directed by the office. No-shows or late cancellations may lead to restrictions in future.",
        ],
      },
      {
        heading: "6. Community chat & user content",
        paragraphs: [
          "You are fully responsible for the content you post. Admins may delete messages (soft delete), close reports and act on abuse. By posting content, you grant us a limited licence to display it within the application for service purposes.",
        ],
      },
      {
        heading: "7. Cafe orders",
        paragraphs: [
          "Cafe orders are sent via a WhatsApp link and the transaction is made directly with the cafe operator. KIZ is not responsible for that transaction. Menu, prices and availability are subject to change.",
        ],
      },
      {
        heading: "8. AI & AR features",
        paragraphs: [
          "Some features use artificial intelligence (for example translation and the AI assistant). Results may be inaccurate or incomplete and are provided 'as is'. Do not rely on them for important decisions or emergencies.",
        ],
      },
      {
        heading: "9. Intellectual property",
        paragraphs: [
          `All trademarks, logos, content and materials in this application are owned by ${LEGAL.college}/${LEGAL.university} or its licensors and may not be copied without permission.`,
        ],
      },
      {
        heading: "10. Service availability",
        paragraphs: [
          "We may change, suspend or discontinue part of the service at any time. We do not guarantee the service will be free of interruption or error.",
        ],
      },
      {
        heading: "11. Suspension & termination",
        paragraphs: [
          "We may suspend or terminate your access if you breach these Terms & Conditions or where necessary for the security and integrity of the system.",
        ],
      },
      {
        heading: "12. Disclaimer & limitation of liability",
        paragraphs: [
          `The service is provided 'as is'. To the extent permitted by law, ${LEGAL.controller} is not liable for any indirect, incidental or consequential loss arising from your use of the application.`,
        ],
      },
      {
        heading: "13. Governing law",
        paragraphs: [
          "These Terms are governed by the laws of Malaysia. Any dispute is subject to the jurisdiction of the courts of Malaysia.",
        ],
      },
      {
        heading: "14. Changes to the terms",
        paragraphs: [
          "We may update these Terms from time to time. Continued use after a change means you accept the updated terms.",
        ],
      },
      {
        heading: "15. Contact us",
        paragraphs: [contactLine("en")],
      },
    ],
  },
}

// ── Account Deletion ────────────────────────────────────────────────────────

export const deletionDoc: LegalDocSet = {
  ms: {
    title: "Pemadaman Akaun",
    summary: `Cara memadam akaun ${LEGAL.product} anda dan data yang berkaitan, sama ada dalam aplikasi atau melalui pejabat KIZ.`,
    sections: [
      {
        heading: "Ringkasan",
        paragraphs: [
          `Anda boleh memadam akaun ${LEGAL.product} anda sendiri pada bila-bila masa. Pemadaman dilakukan dengan segera apabila anda mengesahkan permintaan dalam aplikasi.`,
        ],
      },
      {
        heading: "Cara 1 — Dalam aplikasi (disyorkan)",
        bullets: [
          "Buka aplikasi MyKIZ dan log masuk.",
          "Pergi ke tab Profil.",
          "Pilih “Delete account” di bahagian bawah.",
          "Sahkan pemadaman apabila diminta.",
        ],
      },
      {
        heading: "Cara 2 — Melalui e-mel",
        paragraphs: [
          `Jika anda tidak dapat mengakses aplikasi, hantar e-mel kepada ${LEGAL.contactEmail} dari alamat e-mel berdaftar anda, dengan subjek “Account Deletion” dan sertakan No. Matrik anda. Kami akan memproses permintaan dalam tempoh 7 hari bekerja.`,
        ],
      },
      {
        heading: "Apa yang berlaku apabila akaun dipadam",
        bullets: [
          "Akaun anda dinyahaktifkan serta-merta dan anda tidak boleh log masuk lagi.",
          "Semua sesi peranti dan token pemberitahuan push anda dibatalkan.",
          "Tempat kediaman/bilik anda dilepaskan untuk kegunaan pelajar lain.",
          "Rekod lampau (tempahan, helpdesk, chat, pendaftaran, dsb.) ditandakan sebagai dipadam dan disimpan sebagai rekod institusi untuk tujuan audit dan pematuhan undang-undang.",
        ],
      },
      {
        heading: "Yang mungkin dikekalkan",
        paragraphs: [
          "Oleh kerana keperluan rekod institusi, sesetengah data mungkin tidak dipadam sepenuhnya serta-merta. Data tersebut dinyahaktifkan daripada akses harian dan hanya disimpan selagi diperlukan untuk tujuan undang-undang, audit atau penyelesaian pertikaian.",
        ],
      },
      {
        heading: "Membuat akaun baharu",
        paragraphs: [
          "Selepas pemadaman, anda boleh mendaftar semula dengan No. Matrik yang sama jika anda masih layak. Akaun baharu akan bermula sebagai akaun baharu dan tidak dikaitkan secara automatik dengan rekod lama.",
        ],
      },
      {
        heading: "Soalan",
        paragraphs: [contactLine("ms")],
      },
    ],
  },
  en: {
    title: "Account Deletion",
    summary: `How to delete your ${LEGAL.product} account and associated data, either in the app or through the KIZ office.`,
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          `You can delete your ${LEGAL.product} account yourself at any time. Deletion happens immediately once you confirm the request in the app.`,
        ],
      },
      {
        heading: "Option 1 — In the app (recommended)",
        bullets: [
          "Open the MyKIZ app and sign in.",
          "Go to the Profile tab.",
          "Choose “Delete account” at the bottom.",
          "Confirm the deletion when prompted.",
        ],
      },
      {
        heading: "Option 2 — By email",
        paragraphs: [
          `If you cannot access the app, email ${LEGAL.contactEmail} from your registered email address with the subject “Account Deletion” and include your Matric No. We will process the request within 7 working days.`,
        ],
      },
      {
        heading: "What happens when your account is deleted",
        bullets: [
          "Your account is deactivated immediately and you can no longer sign in.",
          "All your device sessions and push notification tokens are revoked.",
          "Your residence place/room is released for other students.",
          "Past records (bookings, helpdesk, chat, registrations, etc.) are marked as deleted and retained as institutional records for audit and legal compliance.",
        ],
      },
      {
        heading: "What may be retained",
        paragraphs: [
          "Because of institutional record-keeping requirements, some data may not be erased completely right away. Such data is deactivated from day-to-day access and kept only as long as necessary for legal, audit or dispute-resolution purposes.",
        ],
      },
      {
        heading: "Creating a new account",
        paragraphs: [
          "After deletion you may register again with the same Matric No. if you remain eligible. The new account starts fresh and is not automatically linked to your old records.",
        ],
      },
      {
        heading: "Questions",
        paragraphs: [contactLine("en")],
      },
    ],
  },
}
