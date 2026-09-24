import { useTheme } from "@shopify/restyle"
import { Modal, Platform, ScrollView } from "react-native"
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"

import { useLayout } from "@/lib/responsive"
import { KIconButton } from "./controls"
import { Box, Text, type Theme } from "./theme"

/**
 * Bottom sheet — the single modal language for the app.
 *
 * Seven screens hand-rolled this pattern, each ending with a bare
 * `<Text variant="caption">Close</Text>` (~18px tall, no hit area, no
 * accessibility role). Consolidating gives all of them a 44px close button, a
 * grab handle, a scrim, entrance motion, and a tablet-appropriate width in one
 * place.
 *
 * On tablet the sheet centres and caps its width instead of spanning 1024pt,
 * which is what makes a modal read as designed rather than stretched.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  /** Cap the body height so long forms scroll inside the sheet. */
  maxHeightRatio = 0.86,
}: {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxHeightRatio?: number
}) {
  const theme = useTheme<Theme>()
  const { height, isTablet } = useLayout()

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Scrim — tapping it dismisses, matching platform expectation. */}
      <Animated.View
        entering={FadeIn.duration(160)}
        style={{ flex: 1, backgroundColor: "rgba(9,9,11,0.45)", justifyContent: "flex-end" }}
      >
        <Box flex={1} justifyContent="flex-end" onTouchEnd={onClose} />

        <Animated.View entering={SlideInDown.springify().damping(20).stiffness(180)}>
          <Box
            backgroundColor="surface"
            borderTopLeftRadius="sheet"
            borderTopRightRadius="sheet"
            style={{
              maxHeight: height * maxHeightRatio,
              width: "100%",
              maxWidth: isTablet ? 620 : undefined,
              alignSelf: "center",
              // A tablet sheet reads better with all four corners rounded.
              borderBottomLeftRadius: isTablet ? theme.borderRadii.sheet : 0,
              borderBottomRightRadius: isTablet ? theme.borderRadii.sheet : 0,
              marginBottom: isTablet ? 24 : 0,
            }}
          >
            {/* Grab handle */}
            <Box alignItems="center" paddingTop="s">
              <Box width={38} height={4} borderRadius="pill" backgroundColor="borderStrong" />
            </Box>

            <Box
              flexDirection="row"
              alignItems="flex-start"
              gap="m"
              paddingHorizontal="l"
              paddingTop="m"
              paddingBottom="s"
            >
              <Box flex={1} minWidth={0}>
                <Text variant="heading" numberOfLines={2}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="caption" marginTop="xs">
                    {subtitle}
                  </Text>
                ) : null}
              </Box>
              <KIconButton icon="close" label="Close" onPress={onClose} />
            </Box>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer ? (
              <Box
                paddingHorizontal="l"
                paddingTop="m"
                borderTopWidth={1}
                borderTopColor="border"
                gap="s"
              >
                {footer}
              </Box>
            ) : null}

            <SafeAreaView edges={Platform.OS === "ios" && !isTablet ? ["bottom"] : []}>
              <Box height={12} />
            </SafeAreaView>
          </Box>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

/**
 * Full-screen modal for flows too large for a sheet (report forms, galleries).
 * Shares the sheet's header language so closing is always a 44px button in the
 * same corner.
 */
export function FullScreenModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const { contentMaxWidth } = useLayout()

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <Box flex={1} backgroundColor="canvas">
          <Box
            flexDirection="row"
            alignItems="flex-start"
            gap="m"
            paddingHorizontal="l"
            paddingVertical="m"
            borderBottomWidth={1}
            borderBottomColor="border"
          >
            <Box flex={1} minWidth={0}>
              <Text variant="heading" numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" marginTop="xs">
                  {subtitle}
                </Text>
              ) : null}
            </Box>
            <KIconButton icon="close" label="Close" onPress={onClose} />
          </Box>

          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 32,
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? (
            <Box
              paddingHorizontal="l"
              paddingVertical="m"
              borderTopWidth={1}
              borderTopColor="border"
              gap="s"
              style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }}
            >
              {footer}
            </Box>
          ) : null}
        </Box>
      </SafeAreaView>
    </Modal>
  )
}
