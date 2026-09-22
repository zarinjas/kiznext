/**
 * Onboarding meta (web twin of `packages/shared/src/onboarding-meta.ts`).
 * The curated gradient presets an admin can pick for each welcome slide.
 * Kept in sync with the shared copy consumed by the mobile app.
 */

export interface OnboardingGradient {
  key: string
  label: string
  /** Hex stops, dark → light. At least two. */
  colors: string[]
}

export const ONBOARDING_GRADIENTS: OnboardingGradient[] = [
  { key: "teal", label: "Teal", colors: ["#0E7490", "#0891B2", "#22D3EE"] },
  { key: "lavender", label: "Lavender", colors: ["#5B4BC4", "#7C6FE0", "#C4B5FD"] },
  { key: "sky", label: "Sky", colors: ["#1D4ED8", "#3B82F6", "#93C5FD"] },
  { key: "sunset", label: "Sunset", colors: ["#C2410C", "#F97316", "#F9A8D4"] },
  { key: "forest", label: "Forest", colors: ["#065F46", "#10B981", "#6EE7B7"] },
  { key: "midnight", label: "Midnight", colors: ["#0F172A", "#1E293B", "#64748B"] },
]

export const DEFAULT_ONBOARDING_GRADIENT = "teal"

export function getOnboardingGradient(key: string | null | undefined): OnboardingGradient {
  return (
    ONBOARDING_GRADIENTS.find((g) => g.key === key) ??
    ONBOARDING_GRADIENTS.find((g) => g.key === DEFAULT_ONBOARDING_GRADIENT)!
  )
}

/** CSS `linear-gradient(...)` string for the web admin preview. */
export function gradientCss(g: OnboardingGradient): string {
  return `linear-gradient(135deg, ${g.colors.join(", ")})`
}
