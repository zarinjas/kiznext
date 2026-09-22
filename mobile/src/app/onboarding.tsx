import { getOnboardingGradient } from "@kiz/shared"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useRef, useState } from "react"
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { GradientBg } from "@/components/gradient"
import { absoluteUrl } from "@/lib/config"
import { useOnboardingSlides } from "@/lib/hooks"
import { markOnboardingSeen } from "@/lib/storage"
import type { OnboardingSlide } from "@/lib/types"
import { Box, KButton, LoadingScreen, Text } from "@/ui"

export default function OnboardingScreen() {
  const { width } = useWindowDimensions()
  const { data, isLoading } = useOnboardingSlides()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const slides = data?.slides ?? []

  async function finish() {
    await markOnboardingSeen()
    router.replace("/login")
  }

  if (isLoading) return <LoadingScreen label="Getting things ready…" />

  if (slides.length === 0) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" backgroundColor="canvas" padding="xl">
        <KButton label="Continue" onPress={finish} />
      </Box>
    )
  }

  const isLast = index >= slides.length - 1

  function next() {
    if (isLast) {
      void finish()
      return
    }
    const target = Math.min(index + 1, slides.length - 1)
    scrollRef.current?.scrollTo({ x: target * width, animated: true })
    setIndex(target)
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    if (i !== index) setIndex(i)
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
          <Slide key={slide.id} slide={slide} width={width} />
        ))}
      </ScrollView>

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none" edges={["top", "bottom"]}>
        <Box flex={1} justifyContent="space-between" padding="l">
          <Box flexDirection="row" justifyContent="flex-end">
            <Pressable onPress={finish} hitSlop={12}>
              <Box paddingHorizontal="m" paddingVertical="s" borderRadius="pill" style={{ backgroundColor: "rgba(0,0,0,0.25)" }}>
                <Text variant="button" style={styles.white}>
                  Skip
                </Text>
              </Box>
            </Pressable>
          </Box>

          <Box gap="l">
            <Box flexDirection="row" gap="xs" justifyContent="center">
              {slides.map((s, i) => (
                <Box
                  key={s.id}
                  width={i === index ? 22 : 8}
                  height={8}
                  borderRadius="pill"
                  backgroundColor="white"
                  opacity={i === index ? 1 : 0.45}
                />
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

function Slide({ slide, width }: { slide: OnboardingSlide; width: number }) {
  const g = getOnboardingGradient(slide.gradient)
  const image = absoluteUrl(slide.imageUrl)
  const overlayOpacity = Math.max(0, Math.min(100, slide.gradientOpacity ?? 60)) / 100

  return (
    <Box width={width} flex={1} overflow="hidden" backgroundColor="ink900">
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}

      {/* Gradient overlay in front of the image — strength adjustable in admin. */}
      <GradientBg
        id={`onb-${slide.id}`}
        colors={g.colors}
        direction="br"
        opacity={image ? overlayOpacity : 1}
      />

      {/* Title + text at the bottom, right-aligned. */}
      <Box flex={1} justifyContent="flex-end" padding="l">
        <Box alignItems="flex-end" gap="s">
          <Text variant="title" textAlign="right" style={styles.white}>
            {slide.title}
          </Text>
          {slide.body ? (
            <Text variant="body" textAlign="right" style={styles.whiteSoft}>
              {slide.body}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.92)" },
})
