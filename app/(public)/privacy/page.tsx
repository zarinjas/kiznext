import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { privacyDoc } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Dasar Privasi",
  description:
    "Dasar Privasi KIZ Super App (MyKIZ) — bagaimana Kolej Ibu Zain, UKM mengumpul, menggunakan dan melindungi data peribadi anda.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return <LegalPage docSet={privacyDoc} />
}
