import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Box from "@mui/material/Box"
import { ArTranslate } from "@/components/shared/ar/ar-translate"
import { getSuggestedLang } from "@/lib/ar-translate"
import { AR_LANGUAGES } from "@/lib/ar-translate-meta"

export default async function ArTerjemahPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const suggestedLang = await getSuggestedLang(session.user.id)

  return (
    <Box sx={{ pt: 0.5 }}>
      <ArTranslate languages={AR_LANGUAGES} suggestedLang={suggestedLang} />
    </Box>
  )
}
