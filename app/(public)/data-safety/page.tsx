import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { dataSafetyDoc } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Keselamatan Data",
  description:
    "Data Safety KIZ Super App (MyKIZ) — ringkasan data yang dikumpul dan dikongsi oleh Kolej Ibu Zain, UKM serta amalan keselamatan kami.",
  alternates: { canonical: "/data-safety" },
}

export default function DataSafetyPage() {
  return <LegalPage docSet={dataSafetyDoc} />
}
