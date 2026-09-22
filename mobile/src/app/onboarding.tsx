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
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { absoluteUrl } from "@/lib/config"
import { useOnboardingSlides } from "@/lib/hooks"
import { markOnboardingSeen } from "@/lib/storage"
import type { OnboardingSlide } from "@/lib/types"
import { Box, KButton, LoadingScreen, Text } from "@/ui"

function GradientBg({ colors }: { colors: string[] }) {
  const stops = colors.length > 1 ? colors : [colors[0] ?? "#0891B2", colors[0] ?? "#0891B2"]
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="onboarding-grad" x1="0" y1="0" x2="1" y2="1">
          {stops.map((c, i) => (
            <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#onboarding-grad)" />
    </Svg>
  )
}

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
              <Text variant="button" style={styles.white}>
                Skip
              </Text>
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

  return (
    <Box width={width} flex={1}>
      <GradientBg colors={g.colors} />
      <Box flex={1} alignItems="center" justifyContent="center" padding="xl" gap="l">
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: 240, height: 240, borderRadius: 24 }}
            contentFit="contain"
          />
        ) : null}
        <Text variant="title" textAlign="center" style={styles.white}>
          {slide.title}
        </Text>
        {slide.body ? (
          <Text variant="body" textAlign="center" style={styles.whiteSoft}>
            {slide.body}
          </Text>
        ) : null}
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.9)" },
})
