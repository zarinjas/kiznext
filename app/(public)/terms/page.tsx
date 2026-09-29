import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { termsDoc } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Terma & Syarat",
  description:
    "Terma & Syarat penggunaan KIZ Super App (MyKIZ) oleh warga dan kakitangan Kolej Ibu Zain, UKM.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return <LegalPage docSet={termsDoc} />
}
