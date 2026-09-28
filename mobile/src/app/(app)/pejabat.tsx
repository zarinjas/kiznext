import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useState } from "react"
import { ScrollView } from "react-native"

import { absoluteUrl } from "@/lib/config"
import { useOffices } from "@/lib/hooks"
import type { Office } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  FullScreenModal,
  Icon,
  KButton,
  KEmpty,
  PressScale,
  Screen,
  Skeleton,
  Surface,
  Text,
} from "@/ui"

const PANO_HEIGHT = 190
/** Fallback strip width before the image reports its intrinsic aspect ratio. */
const PANO_MIN_WIDTH = 320
/** Callouts are capped at this width; used to keep them inside the strip. */
const LABEL_MAX_WIDTH = 180

/** Small icon tile shown in place of an image that failed to load. */
function ImageFallback({
  height,
  width,
  radius = "card",
  label = "Photo unavailable",
}: {
  height: number | `${number}%`
  width?: number | `${number}%`
  radius?: "input" | "card" | "cardLg"
  label?: string
}) {
  const theme = useTheme()
  return (
    <Box
      width={width ?? "100%"}
      height={height}
      borderRadius={radius}
      backgroundColor="canvasSunk"
      alignItems="center"
      justifyContent="center"
      accessibilityLabel={label}
    >
      <Icon name="domain" size={24} color={theme.colors.ink300} />
    </Box>
  )
}

/**
 * A single panorama callout, positioned in pixels against the rendered strip.
 *
 * It measures itself so the edge clamp uses the label's real width instead of
 * the `LABEL_MAX_WIDTH` cap — clamping every label by the cap would shove short
 * ones far left of their target whenever the anchor sits near the right edge.
 */
function PanoLabel({
  label,
  percent,
  stripWidth,
}: {
  label: string
  percent: number
  stripWidth: number | undefined
}) {
  const [labelWidth, setLabelWidth] = useState(0)

  if (stripWidth === undefined) return null

  const anchor = (percent / 100) * stripWidth
  const left =
    labelWidth > 0
      ? Math.max(8, Math.min(anchor, stripWidth - labelWidth - 8))
      : Math.max(8, Math.min(anchor, Math.max(8, stripWidth - LABEL_MAX_WIDTH - 8)))

  return (
    <Box
      position="absolute"
      left={left}
      top={16}
      maxWidth={LABEL_MAX_WIDTH}
      onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
    >
      <Box backgroundColor="surface" borderRadius="pill" paddingHorizontal="s" paddingVertical="xs">
        <Text variant="caption" numberOfLines={1}>
          {label}
        </Text>
      </Box>
    </Box>
  )
}

function Panorama({
  image,
  leftLabel,
  leftX,
  rightLabel,
  rightX,
}: {
  image: string
  leftLabel: string
  leftX: number
  rightLabel: string
  rightX: number
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const uri = absoluteUrl(image)

  // The rendered strip width. `leftX`/`rightX` are percentages of the ORIGINAL
  // photo, so positioning the callouts with a `%` string measured them against
  // whatever the parent happened to be — on a wide screen the parent grows but
  // the 190pt-tall image does not, and every label drifts off its target.
  // Resolving the same percentages against the ACTUAL rendered width keeps each
  // callout pinned to its building at any size.
  const renderedWidth = natural
    ? Math.max(PANO_HEIGHT * (natural.w / natural.h), PANO_MIN_WIDTH)
    : undefined

  return (
    <Box>
      <Text variant="label" marginBottom="s" marginLeft="xs">
        BLOCK PANORAMA · SWIPE TO SEE MORE
      </Text>
      <Box borderRadius="cardLg" borderWidth={1} borderColor="border" overflow="hidden">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Block panorama, swipe horizontally to see more"
        >
          <Box width={renderedWidth} height={PANO_HEIGHT} backgroundColor="canvasSunk">
            {uri && !failed ? (
              <Image
                source={{ uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                onError={() => setFailed(true)}
                onLoad={(e) => {
                  const src = e.source
                  if (src?.width && src?.height) setNatural({ w: src.width, h: src.height })
                }}
              />
            ) : (
              <Box width={PANO_MIN_WIDTH} height={PANO_HEIGHT}>
                <ImageFallback height="100%" radius="cardLg" label="Panorama unavailable" />
              </Box>
            )}

            {/* Callouts only render once the true width is known — placing them
                against an unknown width is what produced the drift. */}
            <PanoLabel label={leftLabel} percent={leftX} stripWidth={renderedWidth} />
            <PanoLabel label={rightLabel} percent={rightX} stripWidth={renderedWidth} />
          </Box>
        </ScrollView>
      </Box>
    </Box>
  )
}

function GalleryModal({ office, onClose }: { office: Office | null; onClose: () => void }) {
  const theme = useTheme()
  const images = office ? ([office.featuredImage, ...office.gallery].filter(Boolean) as string[]) : []
  const [main, setMain] = useState(0)
  const [broken, setBroken] = useState<Record<number, boolean>>({})
  // The modal stays mounted between openings, so the selected index and the
  // broken-image map (both keyed by position) would leak from the previously
  // viewed office. Reset them during render when the office changes.
  const [lastOfficeId, setLastOfficeId] = useState<string | null>(null)
  if (office && office.id !== lastOfficeId) {
    setLastOfficeId(office.id)
    setMain(0)
    setBroken({})
  }

  const current = images[main] ? absoluteUrl(images[main]) : null

  function markBroken(index: number) {
    setBroken((prev) => ({ ...prev, [index]: true }))
  }

  return (
    <FullScreenModal
      visible={Boolean(office)}
      onClose={onClose}
      title={office?.name ?? "Office"}
      subtitle={images.length > 1 ? `${images.length} photos` : undefined}
    >
      {current && !broken[main] ? (
        <Image
          source={{ uri: current }}
          style={{ width: "100%", height: 220, borderRadius: theme.borderRadii.card }}
          contentFit="cover"
          onError={() => markBroken(main)}
          accessibilityLabel={`${office?.name ?? "Office"} photo ${main + 1}`}
        />
      ) : (
        <ImageFallback height={220} />
      )}

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <Box flexDirection="row" gap="s">
            {images.map((img, i) => {
              const uri = absoluteUrl(img)
              return (
                <PressScale
                  key={i}
                  onPress={() => setMain(i)}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={`Show photo ${i + 1} of ${images.length}`}
                  accessibilityState={{ selected: i === main }}
                  // The thumbnail is 72×54; the wrapper is padded out to the
                  // 44pt minimum in both axes so it is comfortably tappable.
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    justifyContent: "center",
                    borderRadius: theme.borderRadii.input,
                    borderWidth: 2,
                    borderColor: i === main ? theme.colors.brand600 : theme.colors.transparent,
                    overflow: "hidden",
                  }}
                >
                  {uri && !broken[i] ? (
                    <Image
                      source={{ uri }}
                      style={{ width: 72, height: 54 }}
                      contentFit="cover"
                      onError={() => markBroken(i)}
                    />
                  ) : (
                    <ImageFallback width={72} height={54} radius="input" />
                  )}
                </PressScale>
              )
            })}
          </Box>
        </ScrollView>
      ) : null}

      {office?.description ? (
        <Text variant="body" marginTop="l">
          {office.description}
        </Text>
      ) : null}
    </FullScreenModal>
  )
}

function OfficeCard({ office, onPress }: { office: Office; onPress: () => void }) {
  const theme = useTheme()
  const [broken, setBroken] = useState(false)
  const featured = absoluteUrl(office.featuredImage)

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${office.name}, view photos`}
      style={{ minHeight: 44 }}
    >
      <Surface padded={false}>
        {featured && !broken ? (
          <Image
            source={{ uri: featured }}
            style={{
              width: "100%",
              height: 150,
              borderTopLeftRadius: theme.borderRadii.cardLg,
              borderTopRightRadius: theme.borderRadii.cardLg,
            }}
            contentFit="cover"
            onError={() => setBroken(true)}
          />
        ) : featured ? (
          <Box
            width="100%"
            height={150}
            backgroundColor="canvasSunk"
            alignItems="center"
            justifyContent="center"
            style={{
              borderTopLeftRadius: theme.borderRadii.cardLg,
              borderTopRightRadius: theme.borderRadii.cardLg,
            }}
            accessibilityLabel="Photo unavailable"
          >
            <Icon name="domain" size={24} color={theme.colors.ink300} />
          </Box>
        ) : null}
        <Box padding="l">
          <Text variant="subheading">{office.name}</Text>
          {office.description ? (
            <Text variant="caption" marginTop="xs">
              {office.description}
            </Text>
          ) : null}
          <Text variant="caption" marginTop="s" style={{ color: theme.colors.brand700 }}>
            Photos
          </Text>
        </Box>
      </Surface>
    </PressScale>
  )
}

export default function OfficesScreen() {
  const { data, isLoading, isError, refetch } = useOffices()
  const [selected, setSelected] = useState<Office | null>(null)

  return (
    <Screen scroll edges={[]}>
      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={() => refetch()}
        skeleton={<Skeleton.CardList count={3} />}
        errorTitle="Couldn't load the offices"
      >
        {(loaded) => (
          <>
            {loaded.panorama ? (
              <Box marginTop="l">
                <Panorama
                  image={loaded.panorama.image}
                  leftLabel={loaded.panorama.leftLabel}
                  leftX={loaded.panorama.leftX}
                  rightLabel={loaded.panorama.rightLabel}
                  rightX={loaded.panorama.rightX}
                />
              </Box>
            ) : null}

            {loaded.offices.length === 0 ? (
              <KEmpty
                icon="domain"
                title="No offices yet"
                message="Office listings and photos haven't been published yet. The KIZ office can point you in the right direction in the meantime."
                action={
                  <KButton
                    label="Ask the KIZ office"
                    icon="support_agent"
                    onPress={() => router.push("/helpdesk")}
                  />
                }
              />
            ) : (
              <Box gap="m" marginTop="l">
                {loaded.offices.map((office) => (
                  <OfficeCard key={office.id} office={office} onPress={() => setSelected(office)} />
                ))}
              </Box>
            )}
          </>
        )}
      </AsyncBoundary>

      <Box height={32} />

      <GalleryModal office={selected} onClose={() => setSelected(null)} />
    </Screen>
  )
}
