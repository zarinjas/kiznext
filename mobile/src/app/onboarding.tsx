import { APP_TAGLINE, getOnboardingGradient } from "@kiz/shared"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useRef, useState } from "react"
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { GradientBg } from "@/components/gradient"
import { absoluteUrl } from "@/lib/config"
import { tapSelection } from "@/lib/feedback"
import { useOnboardingSlides } from "@/lib/hooks"
import { markOnboardingSeen } from "@/lib/storage"
import type { OnboardingSlide } from "@/lib/types"
import { Box, FadeInUp, Icon, KButton, PressScale, Text } from "@/ui"

/**
 * First-launch carousel.
 *
 * Two changes from the original, both about the first 30 seconds:
 *
 * 1. **Bundled fallback slides.** The carousel previously rendered only what the
 *    admin CMS returned, so an unreachable backend produced a blank white screen
 *    with a single unlabelled button — or skipped onboarding entirely. The CMS
 *    now *overrides* a built-in set rather than being required for one to exist.
 * 2. **The copy sells the innovation.** The fallback slides lead with KIZ Lens,
 *    AR wayfinding and KIZ-AI, so the app states what makes it different before
 *    asking anyone to log in.
 *
 * Text is left-aligned (right-aligned body copy was hard to read) and sits on a
 * mandatory bottom scrim, so legibility no longer depends on an admin-chosen
 * overlay opacity that can be set too low for a light photo.
 */

interface Slide {
  id: string
  title: string
  body: string | null
  imageUrl: string | null
  gradient: string | null
  gradientOpacity: number | null
  buttonLabel: string | null
  /** Bundled slides show a glyph instead of a photo. */
  icon?: string
}

const FALLBACK_SLIDES: Slide[] = [
  {
    id: "fb-welcome",
    title: "Welcome to MyKIZ",
    body: APP_TAGLINE,
    imageUrl: null,
    gradient: "teal",
    gradientOpacity: 100,
    buttonLabel: null,
    icon: "school",
  },
  {
    id: "fb-lens",
    title: "Read any sign in your language",
    body: "Point your camera at a Malay noticeboard or form. KIZ Lens reads it and shows the translation right over the original text — and can read it aloud.",
    imageUrl: null,
    gradient: "lavender",
    gradientOpacity: 100,
    buttonLabel: null,
    icon: "translate",
  },
  {
    id: "fb-ar",
    title: "Follow an arrow to anywhere",
    body: "Lost on campus? AR Wayfinder uses your camera and compass to point you to any block, office or facility, with live walking distance.",
    imageUrl: null,
    gradient: "sky",
    gradientOpacity: 100,
    buttonLabel: null,
    icon: "view_in_ar",
  },
  {
    id: "fb-ai",
    title: "Ask KIZ-AI anything",
    body: "Room fees, laundry hours, how to report a repair — get an answer instantly instead of queueing at the office.",
    imageUrl: null,
    gradient: "forest",
    gradientOpacity: 100,
    buttonLabel: "Get started",
    icon: "smart_toy",
  },
]

function toSlide(s: OnboardingSlide): Slide {
  return {
    id: s.id,
    title: s.title,
    body: s.body,
    imageUrl: s.imageUrl,
    gradient: s.gradient,
    gradientOpacity: s.gradientOpacity,
    buttonLabel: s.buttonLabel,
  }
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions()
  const { data } = useOnboardingSlides()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const remote = data?.slides ?? []
  const slides: Slide[] = remote.length > 0 ? remote.map(toSlide) : FALLBACK_SLIDES

  async function finish() {
    await markOnboardingSeen()
    router.replace("/login")
  }

  const isLast = index >= slides.length - 1

  function goTo(target: number) {
    const clamped = Math.max(0, Math.min(target, slides.length - 1))
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true })
    setIndex(clamped)
    tapSelection()
  }

  function next() {
    if (isLast) {
      void finish()
      return
    }
    goTo(index + 1)
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    if (i !== index) {
      setIndex(i)
      tapSelection()
    }
  }

  return (
    <Box flex={1}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {slides.map((slide) => (
          <SlideView key={slide.id} slide={slide} width={width} />
        ))}
      </ScrollView>

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none" edges={["top", "bottom"]}>
        <Box flex={1} justifyContent="space-between" padding="l">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            {index > 0 ? (
              <PressScale onPress={() => goTo(index - 1)} haptic={false} scaleTo={0.9}>
                <Box
                  width={44}
                  height={44}
                  borderRadius="pill"
                  alignItems="center"
                  justifyContent="center"
                  style={styles.scrimPill}
                >
                  <Icon name="chevron_left" size={24} color="#FFFFFF" />
                </Box>
              </PressScale>
            ) : (
              <Box width={44} height={44} />
            )}

            <PressScale onPress={finish} haptic={false} scaleTo={0.94}>
              <Box
                paddingHorizontal="m"
                minHeight={44}
                justifyContent="center"
                borderRadius="pill"
                style={styles.scrimPill}
              >
                <Text variant="button" style={styles.white}>
                  Skip
                </Text>
              </Box>
            </PressScale>
          </Box>

          <Box gap="l">
            <Box flexDirection="row" gap="xs" justifyContent="center">
              {slides.map((s, i) => (
                <PressScale key={s.id} onPress={() => goTo(i)} haptic={false} scaleTo={0.8}>
                  <Box paddingVertical="s" paddingHorizontal="xs">
                    <Box
                      width={i === index ? 24 : 8}
                      height={8}
                      borderRadius="pill"
                      backgroundColor="white"
                      opacity={i === index ? 1 : 0.45}
                    />
                  </Box>
                </PressScale>
              ))}
            </Box>

            <KButton
              label={isLast ? slides[index]?.buttonLabel || "Get started" : "Next"}
              onPress={next}
            />
          </Box>
        </Box>
      </SafeAreaView>
    </Box>
  )
}

function SlideView({ slide, width }: { slide: Slide; width: number }) {
  const g = getOnboardingGradient(slide.gradient)
  const image = absoluteUrl(slide.imageUrl)
  const overlayOpacity = Math.max(0, Math.min(100, slide.gradientOpacity ?? 60)) / 100

  return (
    <Box width={width} flex={1} overflow="hidden" backgroundColor="ink900">
      {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}

      {/* Gradient wash — full strength when there is no photo behind it. */}
      <GradientBg
        id={`onb-${slide.id}`}
        colors={g.colors}
        direction="br"
        opacity={image ? overlayOpacity : 1}
      />

      {/*
        Legibility scrim. A smooth fade to dark — the previous version was a
        solid `rgba(0,0,0,0.42)` box whose hard top edge read as a misplaced
        band across the slide rather than an overlay. Independent of the
        admin-controlled gradient above, so a light photo plus a low opacity
        setting can never produce white text on a white background.
      */}
      <Box style={styles.textScrim} pointerEvents="none">
        <GradientBg
          id={`onb-scrim-${slide.id}`}
          colors={["#000000", "#000000"]}
          stopOpacities={[0, 0.72]}
          direction="tb"
        />
      </Box>

      <Box flex={1} justifyContent="flex-end" padding="xl" paddingBottom="xxxl">
        {slide.icon ? (
          <FadeInUp>
            <Box
              width={64}
              height={64}
              borderRadius="cardLg"
              alignItems="center"
              justifyContent="center"
              marginBottom="l"
              style={styles.glyphTile}
            >
              <Icon name={slide.icon} size={32} color="#FFFFFF" />
            </Box>
          </FadeInUp>
        ) : null}

        <FadeInUp index={1}>
          <Box gap="s" style={{ maxWidth: 460 }}>
            <Text variant="title" style={styles.white}>
              {slide.title}
            </Text>
            {slide.body ? (
              <Text variant="body" style={styles.whiteSoft}>
                {slide.body}
              </Text>
            ) : null}
          </Box>
        </FadeInUp>
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.94)" },
  scrimPill: { backgroundColor: "rgba(0,0,0,0.42)" },
  glyphTile: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  textScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Tall enough for the fade to be seamless at its top edge.
    height: "65%",
  },
})
