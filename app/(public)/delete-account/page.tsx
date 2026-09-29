import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { deletionDoc } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Pemadaman Akaun",
  description:
    "Cara memadam akaun MyKIZ anda dan data berkaitan, sama ada dalam aplikasi atau melalui pejabat KIZ.",
  alternates: { canonical: "/delete-account" },
}

export default function DeleteAccountPage() {
  return <LegalPage docSet={deletionDoc} />
}
