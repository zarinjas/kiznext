import { NextResponse } from "next/server"
import { getOnboardingSlides } from "@/lib/onboarding"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Public onboarding slides for the mobile first-launch carousel (no auth). */
export async function GET() {
  try {
    const slides = await getOnboardingSlides()
    return NextResponse.json({
      data: {
        slides: slides.map((s) => ({
          id: s.id,
          title: s.title,
          body: s.body,
          imageUrl: s.imageUrl,
          gradient: s.gradient,
          gradientOpacity: s.gradientOpacity,
          buttonLabel: s.buttonLabel,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/onboarding] failed", err)
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Couldn't load onboarding." } }, { status: 500 })
  }
}
