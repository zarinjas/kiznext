import {
  KIZ_LOCATIONS,
  LOST_FOUND_TYPES,
  OTHER_LOCATION,
  lostFoundTypeMeta,
  lostFoundWhenLabel,
  todayMalaysiaDate,
} from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useState } from "react"
import { Alert } from "react-native"

import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { absoluteUrl } from "@/lib/config"
import { useClaimItem, useLostFound, useReportItem } from "@/lib/hooks"
import { useLayout } from "@/lib/responsive"
import type { LostFoundItem } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  CardGrid,
  DateField,
  FullScreenModal,
  KButton,
  KEmpty,
  KPill,
  PillRail,
  Screen,
  Skeleton,
  StatusChip,
  Surface,
  Text,
  TextField,
  TimeField,
  useToast,
  type ChipTone,
} from "@/ui"

/** A 160pt-tall photo is right on a phone but absurd stretched across an iPad. */
const PHOTO_MAX_WIDTH = 420

function statusTone(status: string): ChipTone {
  if (status === "lost") return "info"
  if (status === "found") return "success"
  return "neutral"
}

export default function LostFoundScreen() {
  const theme = useTheme()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useLostFound()
  const claim = useClaimItem()
  const toast = useToast()

  const [open, setOpen] = useState(false)

  return (
    <Screen scroll edges={[]}>
      <Box paddingTop="m">
        <KButton label="New report" icon="add" onPress={() => setOpen(true)} />
      </Box>

      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={() => refetch()}
        skeleton={<Skeleton.CardList count={3} />}
        errorTitle="Couldn't load Lost & Found"
      >
        {(loaded) =>
          loaded.items.length === 0 ? (
            <KEmpty
              icon="search"
              title="Nothing reported yet"
              message="Lost something or picked something up? Let the community know."
              action={<KButton label="New report" icon="add" onPress={() => setOpen(true)} />}
            />
          ) : (
            <Box marginTop="l">
              <CardGrid
                items={loaded.items}
                phoneColumns={1}
                keyExtractor={(item) => item.id}
                renderItem={(item) => (
                  <ItemCard
                    item={item}
                    mine={item.reportedBy === user?.id}
                    onClaim={() =>
                      Alert.alert("Mark as claimed?", "This removes the item from the active list.", [
                        { text: "Not yet", style: "cancel" },
                        {
                          text: "Mark claimed",
                          onPress: () =>
                            claim.mutate(item.id, {
                              onSuccess: () => toast.success("Marked as claimed."),
                              onError: () => toast.error("Couldn't update the item. Try again."),
                            }),
                        },
                      ])
                    }
                    claiming={claim.isPending}
                    theme={theme}
                  />
                )}
              />
            </Box>
          )
        }
      </AsyncBoundary>

      <Box height={32} />

      <ReportModal visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}

function ItemCard({
  item,
  mine,
  onClaim,
  claiming,
  theme,
}: {
  item: LostFoundItem
  mine: boolean
  onClaim: () => void
  claiming: boolean
  theme: ReturnType<typeof useTheme>
}) {
  const meta = lostFoundTypeMeta(item.status)
  const photo = absoluteUrl(item.photoUrl)
  const when = lostFoundWhenLabel(
    item.status,
    item.happenedDate ? new Date(item.happenedDate) : null,
    item.happenedTime
  )

  return (
    <Surface>
      <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
        <StatusChip label={meta.verb} tone={statusTone(item.status)} icon={meta.icon} />
        {item.status === "claimed" ? <StatusChip label="Claimed" tone="neutral" /> : null}
      </Box>

      <Text variant="subheading" marginTop="s">
        {item.itemName}
      </Text>
      <Text variant="caption" marginTop="xs">
        {item.description}
      </Text>

      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{
            width: "100%",
            maxWidth: PHOTO_MAX_WIDTH,
            alignSelf: "center",
            height: 160,
            borderRadius: theme.borderRadii.card,
            marginTop: 12,
          }}
          contentFit="cover"
        />
      ) : null}

      {when ? (
        <Box flexDirection="row" alignItems="center" gap="xs" marginTop="m">
          <Text variant="caption">{when}</Text>
        </Box>
      ) : null}
      {item.locationFound ? (
        <Text variant="caption" marginTop="xs">
          {item.locationFound}
        </Text>
      ) : null}
      <Text variant="caption" marginTop="xs" style={{ color: theme.colors.ink300 }}>
        Reported by {item.reporterName ?? "a resident"}
      </Text>

      {mine && item.status === "found" ? (
        <Box marginTop="m">
          <KButton label="Mark as claimed" variant="secondary" onPress={onClaim} loading={claiming} />
        </Box>
      ) : null}
    </Surface>
  )
}

function ReportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme()
  const report = useReportItem()
  const toast = useToast()
  const { isTablet } = useLayout()

  const [type, setType] = useState<"lost" | "found" | null>(null)
  const [itemName, setItemName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [locationOther, setLocationOther] = useState("")
  const [happenedDate, setHappenedDate] = useState("")
  const [happenedTime, setHappenedTime] = useState("")
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setType(null)
    setItemName("")
    setDescription("")
    setLocation("")
    setLocationOther("")
    setHappenedDate("")
    setHappenedTime("")
    setPhoto(null)
    setError(null)
  }

  function dismiss() {
    reset()
    onClose()
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError("Photo library access is needed to attach a photo.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    })
    if (result.canceled || !result.assets[0]) return
    setPhoto(result.assets[0])
  }

  function submit() {
    setError(null)
    if (!type) return setError("Pick one first — did you lose or find something?")
    if (!itemName.trim()) return setError("Tell us what the item is.")
    if (!description.trim()) return setError("Add a short description so it can be recognised.")
    if (!location) return setError("Pick a location.")
    if (location === OTHER_LOCATION && !locationOther.trim()) return setError("Tell us the exact location.")
    if (!happenedDate) return setError("Pick the date this happened.")

    const form = new FormData()
    form.append("type", type)
    form.append("itemName", itemName.trim())
    form.append("description", description.trim())
    form.append("location", location)
    if (location === OTHER_LOCATION) form.append("locationOtherText", locationOther.trim())
    form.append("happenedDate", happenedDate)
    if (happenedTime) form.append("happenedTime", happenedTime)
    if (photo) {
      form.append("photo", {
        uri: photo.uri,
        name: photo.fileName ?? "photo.jpg",
        type: photo.mimeType ?? "image/jpeg",
      } as unknown as Blob)
    }

    report.mutate(form, {
      onSuccess: () => {
        reset()
        onClose()
        // `toast.success` fires `notifySuccess()` internally — calling it here
        // as well would double-buzz on the same event.
        toast.success("Report submitted. Thanks for helping out.")
      },
      onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't save the report."),
    })
  }

  const selectedMeta = type ? lostFoundTypeMeta(type) : null

  return (
    <FullScreenModal
      visible={visible}
      onClose={dismiss}
      title="New report"
      subtitle="Lost something, or picked something up around KIZ?"
      footer={
        type ? <KButton label="Submit report" onPress={submit} loading={report.isPending} /> : undefined
      }
    >
      <Box gap="l">
        <Box>
          <Text variant="label" marginBottom="s" marginLeft="xs">
            WHAT HAPPENED?
          </Text>
          <PillRail>
            {LOST_FOUND_TYPES.map((t) => (
              <KPill
                key={t.value}
                label={t.title}
                icon={t.icon}
                selected={type === t.value}
                onPress={() => setType(t.value)}
              />
            ))}
          </PillRail>
          {selectedMeta ? (
            <Text variant="caption" marginTop="s" marginLeft="xs">
              {selectedMeta.hint}
            </Text>
          ) : null}
        </Box>

        {type && selectedMeta ? (
          <>
            <TextField label="Item" value={itemName} onChangeText={setItemName} autoCapitalize="sentences" />
            <TextField
              label="Description"
              value={description}
              onChangeText={setDescription}
              autoCapitalize="sentences"
            />

            <Box>
              <Text variant="label" marginBottom="s" marginLeft="xs">
                {selectedMeta.locationLabel.toUpperCase()}
              </Text>
              <PillRail>
                {[...KIZ_LOCATIONS, OTHER_LOCATION].map((loc) => (
                  <KPill
                    key={loc}
                    label={loc === OTHER_LOCATION ? "Other location…" : loc}
                    selected={loc === location}
                    onPress={() => setLocation(loc)}
                  />
                ))}
              </PillRail>
              {location === OTHER_LOCATION ? (
                <Box marginTop="s">
                  <TextField
                    label="Exact location"
                    value={locationOther}
                    onChangeText={setLocationOther}
                    autoCapitalize="sentences"
                  />
                </Box>
              ) : null}
            </Box>

            <DateField
              label={selectedMeta.whenLabel}
              value={happenedDate}
              onChange={setHappenedDate}
              maximumDate={todayMalaysiaDate()}
            />
            <TimeField label="Approx. time (optional)" value={happenedTime} onChange={setHappenedTime} />

            <Box>
              <KButton
                label={photo ? "Change photo" : "Attach a photo"}
                variant="secondary"
                icon="photo_camera"
                onPress={pickPhoto}
              />
              {photo ? (
                <Box marginTop="s">
                  <Image
                    source={{ uri: photo.uri }}
                    style={{
                      width: "100%",
                      maxWidth: isTablet ? PHOTO_MAX_WIDTH : undefined,
                      alignSelf: "center",
                      height: 160,
                      borderRadius: theme.borderRadii.card,
                    }}
                    contentFit="cover"
                    accessibilityLabel="Attached photo preview"
                  />
                  <Text variant="caption" marginTop="xs" marginLeft="xs">
                    {photo.fileName ?? "photo attached"}
                  </Text>
                </Box>
              ) : null}
            </Box>

            {error ? (
              <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                {error}
              </Text>
            ) : null}
          </>
        ) : null}
      </Box>
    </FullScreenModal>
  )
}
