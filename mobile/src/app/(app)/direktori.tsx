import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  bearingDeg,
  fetchWalkingRoute,
  formatDistanceMeters,
  haversineMeters,
  headingDelta,
  nextRouteTarget,
  routeRemainingMeters,
  turnHint,
  typeIcon,
  typeLabel,
} from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as Location from "expo-location"
import { useEffect, useMemo, useRef, useState } from "react"
import { Linking, Modal, Pressable, ScrollView } from "react-native"

import { ArFullMap, ArRadar } from "@/components/ar-minimap"
import { useDestinations } from "@/lib/hooks"
import type { Destination } from "@/lib/types"
import { Box, KButton, KEmpty, LoadingScreen, Screen, StatusChip, Text } from "@/ui"
import { Icon } from "@/ui/icon"

const INTRO_KEY = "kiz-ar-intro-seen"
const ARRIVE_M = 15
const ROUTING_MIN_M = 60
const ROUTE_REFETCH_M = 25

type Group = "all" | "blocks" | "facilities" | "places"

function groupOf(type: string): Exclude<Group, "all"> {
  if (type === "block") return "blocks"
  if (type === "facility") return "facilities"
  return "places"
}

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export default function DirectoryScreen() {
  const theme = useTheme()
  const { data, isLoading } = useDestinations()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

  const [introSeen, setIntroSeen] = useState<boolean | null>(null)
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const [heading, setHeading] = useState<number | null>(null)
  const headingRef = useRef<number | null>(null)
  const [selected, setSelected] = useState<Destination | null>(null)
  const [group, setGroup] = useState<Group>("all")
  const [nearestFirst, setNearestFirst] = useState(false)
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[] | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const lastFetch = useRef<{ lat: number; lng: number; destId: string } | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY).then((v) => setIntroSeen(v === "1"))
  }, [])

  const ready = introSeen === true

  // Location + compass, only after the intro is dismissed.
  useEffect(() => {
    if (!ready) return
    let positionSub: Location.LocationSubscription | null = null
    let headingSub: Location.LocationSubscription | null = null
    let active = true

    ;(async () => {
      const perm = await Location.requestForegroundPermissionsAsync()
      if (!active) return
      if (!perm.granted) {
        setLocationDenied(true)
        return
      }
      positionSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 3000 },
        (pos) => {
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
          })
        }
      )
      headingSub = await Location.watchHeadingAsync((h) => {
        const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading
        if (value == null || value < 0) return
        const prev = headingRef.current
        if (prev == null) {
          headingRef.current = value
        } else {
          const delta = ((value - prev + 540) % 360) - 180
          headingRef.current = (((prev + delta * 0.15) % 360) + 360) % 360
        }
        setHeading(headingRef.current)
      })
    })()

    return () => {
      active = false
      positionSub?.remove()
      headingSub?.remove()
    }
  }, [ready])

  const destinations = useMemo(() => data?.destinations ?? [], [data?.destinations])

  const visible = useMemo(() => {
    let list = destinations.filter((d) => group === "all" || groupOf(d.type) === group)
    if (nearestFirst && position) {
      list = [...list].sort(
        (a, b) =>
          haversineMeters(position, { latitude: a.latitude, longitude: a.longitude }) -
          haversineMeters(position, { latitude: b.latitude, longitude: b.longitude })
      )
    }
    return list
  }, [destinations, group, nearestFirst, position])

  const target = selected ?? destinations[0] ?? null
  const targetPoint = useMemo(
    () => (target ? { latitude: target.latitude, longitude: target.longitude } : null),
    [target]
  )
  const straightMeters = position && targetPoint ? haversineMeters(position, targetPoint) : null
  const routingApplicable = Boolean(
    target && !target.indoor && position && straightMeters != null && straightMeters > ROUTING_MIN_M
  )

  // Fetch a walking route (OSRM) for outdoor destinations — mirrors the web.
  useEffect(() => {
    if (!ready || !position || !targetPoint || !target || !routingApplicable) return
    const last = lastFetch.current
    const moved =
      !last ||
      last.destId !== target.id ||
      haversineMeters({ latitude: last.lat, longitude: last.lng }, position) > ROUTE_REFETCH_M
    if (!moved) return

    lastFetch.current = { lat: position.latitude, lng: position.longitude, destId: target.id }
    let active = true
    fetchWalkingRoute(position, targetPoint).then((r) => {
      if (active && r) setRoute(r)
    })
    return () => {
      active = false
    }
  }, [ready, position, target, targetPoint, routingApplicable])

  const displayRoute =
    routingApplicable && route && route.length > 1
      ? route
      : position && targetPoint
        ? [position, targetPoint]
        : null

  const aimPoint =
    routingApplicable && route && route.length > 1 && position
      ? nextRouteTarget(route, position)
      : targetPoint

  const meters =
    routingApplicable && route && route.length > 1 && position
      ? routeRemainingMeters(route, position)
      : straightMeters
  const bearing = position && aimPoint ? bearingDeg(position, aimPoint) : null
  const turn = bearing != null && heading != null ? headingDelta(bearing, heading) : null
  const arrived = meters != null && meters < ARRIVE_M

  if (isLoading || introSeen === null) return <LoadingScreen label="Loading the directory…" />

  if (!ready) {
    return (
      <Screen scroll edges={[]}>
        <Box paddingTop="l" gap="l">
          <Text variant="heading">AR Directory</Text>
          <Text variant="body">
            Point your phone at the world and follow an arrow to any KIZ destination. The app uses
            your camera, location and compass — nothing leaves your device.
          </Text>
          <KButton
            label="Get started"
            onPress={() => {
              AsyncStorage.setItem(INTRO_KEY, "1")
              setIntroSeen(true)
            }}
          />
        </Box>
      </Screen>
    )
  }

  const cameraOn = Boolean(cameraPermission?.granted)

  return (
    <Screen padded={false} edges={[]}>
      <Box flex={1}>
        {/* AR stage */}
        <Box flex={1} backgroundColor="ink900" overflow="hidden">
          {cameraOn ? (
            <CameraView style={{ flex: 1 }} facing="back" />
          ) : (
            <Box flex={1} alignItems="center" justifyContent="center" padding="xl">
              <Icon name="photo_camera" size={40} color={theme.colors.ink300} />
              <Text variant="caption" marginTop="s" textAlign="center" style={{ color: theme.colors.ink300 }}>
                Camera off — the list and map below still work.
              </Text>
            </Box>
          )}

          {/* Top info card */}
          {target ? (
            <Box position="absolute" top={12} left={12} right={12}>
              <Box backgroundColor="surface" borderRadius="cardLg" padding="m">
                <Box flexDirection="row" alignItems="center" gap="s">
                  <StatusChip label={typeLabel(target.type)} tone="brand" icon={typeIcon(target.type)} />
                  <Text variant="caption" style={{ marginLeft: "auto" }}>
                    {meters != null ? formatDistanceMeters(meters) : "Locating…"}
                  </Text>
                </Box>
                <Text variant="subheading" marginTop="s" numberOfLines={1}>
                  {target.name}
                </Text>
                {arrived ? (
                  <Text variant="caption" marginTop="xs" style={{ color: theme.colors.successInk }}>
                    You&apos;ve arrived.
                  </Text>
                ) : turn != null ? (
                  <Text variant="caption" marginTop="xs">
                    {turnHint(turn)} · {Math.round(Math.abs(turn))}°
                  </Text>
                ) : (
                  <Text variant="caption" marginTop="xs">
                    Point your phone around to find the direction.
                  </Text>
                )}
              </Box>
            </Box>
          ) : null}

          {/* Arrow */}
          {turn != null ? (
            <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
              <Box
                width={132}
                height={132}
                borderRadius="pill"
                borderWidth={2}
                borderColor="brand500"
                alignItems="center"
                justifyContent="center"
                style={{ opacity: 0.9 }}
              >
                <Box style={{ transform: [{ rotate: `${turn}deg` }] }}>
                  <Icon name="navigation" size={72} color={theme.colors.brand600} />
                </Box>
              </Box>
            </Box>
          ) : null}

          {/* Minimap radar */}
          <Box position="absolute" bottom={16} right={16}>
            <ArRadar
              user={position}
              destination={targetPoint}
              heading={heading ?? 0}
              route={displayRoute}
              onExpand={() => setMapOpen(true)}
            />
          </Box>

          {/* Fallback / permission row */}
          {!cameraOn || heading == null || locationDenied ? (
            <Box position="absolute" bottom={16} left={12} right={148} gap="s">
              {!cameraOn ? (
                <KButton label="Enable camera view" icon="photo_camera" onPress={requestCameraPermission} />
              ) : null}
              {locationDenied ? (
                <Box backgroundColor="warningSoft" borderRadius="input" padding="m">
                  <Text variant="caption" style={{ color: theme.colors.warningInk }}>
                    Location is off — allow it in Settings for live distance and direction.
                  </Text>
                </Box>
              ) : null}
              {heading == null && !locationDenied ? (
                <Box backgroundColor="surface" borderRadius="input" padding="m">
                  <Text variant="caption">
                    Waiting for the compass… wave the phone in a figure-eight to calibrate.
                  </Text>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>

        {/* Destination picker */}
        <Box padding="l" gap="s" borderTopWidth={1} borderTopColor="border">
          <Box flexDirection="row" alignItems="center" gap="s">
            <Text variant="label" style={{ flex: 1 }}>
              DESTINATION
            </Text>
            {target ? (
              <Pressable onPress={() => Linking.openURL(mapsUrl(target.latitude, target.longitude))}>
                <Text variant="caption" style={{ color: theme.colors.brand700 }}>
                  Google Maps
                </Text>
              </Pressable>
            ) : null}
          </Box>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Box flexDirection="row" gap="s">
              {(["all", "blocks", "facilities", "places"] as Group[]).map((g) => {
                const active = g === group
                return (
                  <Pressable key={g} onPress={() => setGroup(g)}>
                    <Box
                      paddingHorizontal="m"
                      paddingVertical="s"
                      borderRadius="pill"
                      borderWidth={1}
                      borderColor={active ? "brand600" : "border"}
                      backgroundColor={active ? "brand50" : "surface"}
                    >
                      <Text
                        variant="caption"
                        style={{ color: active ? theme.colors.brand700 : theme.colors.ink500, textTransform: "capitalize" }}
                      >
                        {g}
                      </Text>
                    </Box>
                  </Pressable>
                )
              })}
              <Pressable onPress={() => setNearestFirst((v) => !v)}>
                <Box
                  paddingHorizontal="m"
                  paddingVertical="s"
                  borderRadius="pill"
                  borderWidth={1}
                  borderColor={nearestFirst ? "brand600" : "border"}
                  backgroundColor={nearestFirst ? "brand50" : "surface"}
                >
                  <Text variant="caption" style={{ color: nearestFirst ? theme.colors.brand700 : theme.colors.ink500 }}>
                    Nearest first
                  </Text>
                </Box>
              </Pressable>
            </Box>
          </ScrollView>

          {visible.length === 0 ? (
            <KEmpty title="No destinations" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              <Box flexDirection="row" gap="s">
                {visible.map((d) => {
                  const active = d.id === target?.id
                  const dist = position
                    ? formatDistanceMeters(haversineMeters(position, { latitude: d.latitude, longitude: d.longitude }))
                    : null
                  return (
                    <Pressable key={d.id} onPress={() => setSelected(d)}>
                      <Box
                        width={160}
                        borderRadius="card"
                        borderWidth={1}
                        borderColor={active ? "brand600" : "border"}
                        backgroundColor={active ? "brand50" : "surface"}
                        padding="m"
                      >
                        <Icon name={d.icon || typeIcon(d.type)} size={20} color={theme.colors.brand600} />
                        <Text variant="bodyStrong" marginTop="xs" numberOfLines={1}>
                          {d.name}
                        </Text>
                        <Text variant="caption" numberOfLines={1}>
                          {dist ?? typeLabel(d.type)}
                        </Text>
                      </Box>
                    </Pressable>
                  )
                })}
              </Box>
            </ScrollView>
          )}
        </Box>
      </Box>

      {/* Full-screen map */}
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <Box flex={1} backgroundColor="canvas">
          <Box flex={1}>
            <ArFullMap
              user={position}
              destination={targetPoint}
              heading={heading ?? 0}
              route={displayRoute}
            />
          </Box>
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            padding="l"
            borderTopWidth={1}
            borderTopColor="border"
          >
            <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {target?.name ?? "Map"}
            </Text>
            {target ? (
              <Pressable onPress={() => Linking.openURL(mapsUrl(target.latitude, target.longitude))}>
                <Text variant="caption" style={{ color: theme.colors.brand700 }}>
                  Directions
                </Text>
              </Pressable>
            ) : null}
            <KButton label="Close" variant="secondary" onPress={() => setMapOpen(false)} fullWidth={false} />
          </Box>
        </Box>
      </Modal>
    </Screen>
  )
}
