import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { useState } from "react"
import { Modal, Pressable, ScrollView } from "react-native"

import { absoluteUrl } from "@/lib/config"
import { useOffices } from "@/lib/hooks"
import type { Office } from "@/lib/types"
import { Box, KEmpty, LoadingScreen, Screen, Surface, Text } from "@/ui"

const PANO_HEIGHT = 190

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
  const uri = absoluteUrl(image)
  const width = natural ? Math.max(PANO_HEIGHT * (natural.w / natural.h), 320) : undefined

  return (
    <Box>
      <Text variant="label" marginBottom="s" marginLeft="xs">
        BLOCK PANORAMA · DRAG TO EXPLORE
      </Text>
      <Box borderRadius="cardLg" borderWidth={1} borderColor="border" overflow="hidden">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Box width={width} height={PANO_HEIGHT} backgroundColor="canvasSunk">
            {uri ? (
              <Image
                source={{ uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                onLoad={(e) => {
                  const src = e.source
                  if (src?.width && src?.height) setNatural({ w: src.width, h: src.height })
                }}
              />
            ) : null}
            <Box position="absolute" left={`${leftX}%`} top={16} maxWidth={180}>
              <Box backgroundColor="surface" borderRadius="pill" paddingHorizontal="s" paddingVertical="xs">
                <Text variant="caption" numberOfLines={1}>
                  {leftLabel}
                </Text>
              </Box>
            </Box>
            <Box position="absolute" left={`${rightX}%`} top={16} maxWidth={180}>
              <Box backgroundColor="surface" borderRadius="pill" paddingHorizontal="s" paddingVertical="xs">
                <Text variant="caption" numberOfLines={1}>
                  {rightLabel}
                </Text>
              </Box>
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </Box>
  )
}

function GalleryModal({ office, onClose }: { office: Office | null; onClose: () => void }) {
  const images = office ? [office.featuredImage, ...office.gallery].filter(Boolean) as string[] : []
  const [main, setMain] = useState(0)
  const current = images[main] ? absoluteUrl(images[main]) : null

  return (
    <Modal visible={Boolean(office)} transparent animationType="slide" onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end">
        <Box backgroundColor="surface" borderTopLeftRadius="sheet" borderTopRightRadius="sheet" maxHeight="92%">
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text variant="heading" flex={1} numberOfLines={1}>
                {office?.name}
              </Text>
              <Pressable onPress={onClose}>
                <Text variant="caption">Close</Text>
              </Pressable>
            </Box>

            {current ? (
              <Image
                source={{ uri: current }}
                style={{ width: "100%", height: 220, borderRadius: 14, marginTop: 16 }}
                contentFit="cover"
              />
            ) : null}

            {images.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <Box flexDirection="row" gap="s">
                  {images.map((img, i) => {
                    const uri = absoluteUrl(img)
                    return (
                      <Pressable key={i} onPress={() => setMain(i)}>
                        <Box
                          borderRadius="input"
                          borderWidth={2}
                          borderColor={i === main ? "brand600" : "transparent"}
                          overflow="hidden"
                        >
                          {uri ? (
                            <Image source={{ uri }} style={{ width: 72, height: 54 }} contentFit="cover" />
                          ) : null}
                        </Box>
                      </Pressable>
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
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  )
}

export default function OfficesScreen() {
  const theme = useTheme()
  const { data, isLoading } = useOffices()
  const [selected, setSelected] = useState<Office | null>(null)

  if (isLoading || !data) return <LoadingScreen label="Loading offices…" />

  return (
    <Screen scroll edges={[]}>
      {data.panorama ? (
        <Box marginTop="l">
          <Panorama
            image={data.panorama.image}
            leftLabel={data.panorama.leftLabel}
            leftX={data.panorama.leftX}
            rightLabel={data.panorama.rightLabel}
            rightX={data.panorama.rightX}
          />
        </Box>
      ) : null}

      {data.offices.length === 0 ? (
        <KEmpty icon="domain" title="No offices yet" />
      ) : (
        <Box gap="m" marginTop="l">
          {data.offices.map((office) => {
            const featured = absoluteUrl(office.featuredImage)
            return (
              <Pressable key={office.id} onPress={() => setSelected(office)}>
                <Surface padded={false}>
                  {featured ? (
                    <Image
                      source={{ uri: featured }}
                      style={{ width: "100%", height: 150, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}
                      contentFit="cover"
                    />
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
              </Pressable>
            )
          })}
        </Box>
      )}

      <Box height={32} />

      <GalleryModal office={selected} onClose={() => setSelected(null)} />
    </Screen>
  )
}
