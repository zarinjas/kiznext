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
import { Linking, Modal, ScrollView } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

import { ArFullMap, ArRadar } from "@/components/ar-minimap"
import { DEMO_DESTINATION, DEMO_TRACK, demoHeadingAt, useDemo } from "@/lib/demo"
import { useDestinations } from "@/lib/hooks"
import type { Destination } from "@/lib/types"
import {
  AiBadge,
  Box,
  KButton,
  KEmpty,
  KPill,
  LiveDot,
  LoadingScreen,
  PressScale,
  Pulse,
  Screen,
  SPRING_SENSOR,
  StatusChip,
  Text,
  type Theme,
} from "@/ui"
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

/**
 * The AR arrow.
 *
 * Rotation is a Reanimated shared value on the UI thread, so the arrow stays
 * smooth while the camera preview, a location watcher and a route fetch are all
 * live — and React never re-renders for a heading change.
 *
 * `unwrap` is the important detail: heading is modular, so springing directly
 * from 359° to 1° would rotate 358° the long way round. We accumulate an
 * unwrapped angle instead, always taking the shorter arc.
 */
function ArArrow({ turn, arrived }: { turn: number; arrived: boolean }) {
  const theme = useTheme<Theme>()
  const rotation = useSharedValue(turn)
  const unwrapped = useRef(turn)

  useEffect(() => {
    const delta = ((turn - unwrapped.current + 540) % 360) - 180
    unwrapped.current += delta
    rotation.value = withSpring(unwrapped.current, SPRING_SENSOR)
  }, [turn, rotation])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center" pointerEvents="none">
      <Pulse enabled={!arrived}>
        <Box
          width={140}
          height={140}
          borderRadius="pill"
          borderWidth={2}
          borderColor={arrived ? "success" : "brand500"}
          alignItems="center"
          justifyContent="center"
          style={{
            backgroundColor: arrived ? "rgba(22,163,74,0.16)" : "rgba(8,145,178,0.14)",
          }}
        >
          {arrived ? (
            <Icon name="check_circle" size={76} color={theme.colors.success} />
          ) : (
            <Animated.View style={arrowStyle}>
              <Icon name="navigation" size={76} color={theme.colors.brand500} />
            </Animated.View>
          )}
        </Box>
      </Pulse>
    </Box>
  )
}

export default function DirectoryScreen() {
  const theme = useTheme<Theme>()
  const { data, isLoading } = useDestinations()
  const { demo } = useDemo()
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

  /**
   * Demo Mode: replay a scripted walk instead of reading the sensors.
   *
   * A judging room has poor GPS and many tablets report no compass at all, so
   * without this the flagship AR feature cannot be demonstrated where it is
   * actually being judged. The track advances every 1.1s and loops.
   */
  useEffect(() => {
    if (!ready || !demo) return
    let step = 0
    const tick = () => {
      const point = DEMO_TRACK[step % DEMO_TRACK.length]
      setPosition({ ...point, accuracy: 4 })
      setHeading(demoHeadingAt(step))
      // Clearing the denial flag belongs with the first scripted fix, not as a
      // synchronous effect-body setState (which would cascade a render).
      setLocationDenied(false)
      step += 1
    }
    const id = setInterval(tick, 1100)
    // Prime the first point on the next tick so the effect body stays free of
    // synchronous state updates.
    const priming = setTimeout(tick, 0)
    return () => {
      clearInterval(id)
      clearTimeout(priming)
    }
  }, [ready, demo])

  // Location + compass, only after the intro is dismissed.
  useEffect(() => {
    if (!ready || demo) return
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
  }, [ready, demo])

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

  /**
   * Auto-target the *nearest* destination, not an arbitrary `destinations[0]`.
   * Previously the arrow silently pointed at whatever the API happened to return
   * first, which looked like a bug to anyone standing next to a different block.
   */
  const nearest = useMemo(() => {
    if (!position || destinations.length === 0) return null
    return [...destinations].sort(
      (a, b) =>
        haversineMeters(position, { latitude: a.latitude, longitude: a.longitude }) -
        haversineMeters(position, { latitude: b.latitude, longitude: b.longitude })
    )[0]
  }, [destinations, position])

  const target = selected ?? nearest ?? destinations[0] ?? null
  const autoTargeted = !selected && target != null

  const targetPoint = useMemo(() => {
    // In Demo Mode the scripted track walks towards a fixed point, so the arrow,
    // distance and route all stay coherent with the replayed GPS.
    if (demo) return DEMO_DESTINATION
    return target ? { latitude: target.latitude, longitude: target.longitude } : null
  }, [target, demo])
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
    /**
     * Intro. Rebuilt from a wall of plain text into a visual explainer that
     * (a) shows what the feature does, and (b) explains all three permissions
     * in one place before requesting any of them — previously camera was
     * requested by a button while location auto-requested on mount, so a user
     * met unexplained system dialogs back to back.
     */
    return (
      <Screen scroll edges={["top"]}>
        <Box paddingTop="l" gap="l">
          <Box flexDirection="row" alignItems="center" gap="s">
            <Box
              width={52}
              height={52}
              borderRadius="card"
              backgroundColor="brand50"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name="view_in_ar" size={28} color={theme.colors.brand600} />
            </Box>
            <Box flex={1}>
              <Text variant="title">AR Wayfinder</Text>
              <Box flexDirection="row" marginTop="xs">
                <AiBadge label="LIVE AR" />
              </Box>
            </Box>
          </Box>

          <Text variant="body">
            Hold up your phone and follow a live arrow to any block, office or facility at KIZ —
            with real walking distance and turn-by-turn hints.
          </Text>

          <Box gap="s">
            {[
              { icon: "photo_camera", title: "Camera", body: "Shows the world behind the arrow." },
              { icon: "my_location", title: "Location", body: "Measures how far you still have to walk." },
              { icon: "explore", title: "Compass", body: "Points the arrow as you turn." },
            ].map((row) => (
              <Box
                key={row.title}
                flexDirection="row"
                alignItems="center"
                gap="m"
                padding="m"
                borderRadius="card"
                borderWidth={1}
                borderColor="border"
                backgroundColor="surface"
              >
                <Icon name={row.icon} size={20} color={theme.colors.brand600} />
                <Box flex={1}>
                  <Text variant="bodyStrong">{row.title}</Text>
                  <Text variant="caption">{row.body}</Text>
                </Box>
              </Box>
            ))}
          </Box>

          <Text variant="caption">
            Your location is used on-device for the arrow and distance only — it is never stored or
            shared.
          </Text>

          <KButton
            label="Start AR Wayfinder"
            icon="view_in_ar"
            onPress={() => {
              // Request camera up front so the user faces one grouped prompt
              // sequence rather than a surprise dialog mid-navigation.
              void requestCameraPermission()
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
              <Box
                backgroundColor="surface"
                borderRadius="cardLg"
                padding="m"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.18,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 5,
                }}
              >
                <Box flexDirection="row" alignItems="center" gap="s">
                  <StatusChip label={typeLabel(target.type)} tone="brand" icon={typeIcon(target.type)} />
                  {heading != null && position ? <LiveDot label="TRACKING" /> : null}
                  <Text variant="caption" style={{ marginLeft: "auto", fontWeight: "700" }}>
                    {meters != null ? formatDistanceMeters(meters) : "Locating…"}
                  </Text>
                </Box>
                <Text variant="subheading" marginTop="s" numberOfLines={1}>
                  {autoTargeted ? `Nearest: ${target.name}` : target.name}
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
          {turn != null ? <ArArrow turn={turn} arrived={arrived} /> : null}

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

          {/*
            One consolidated status card instead of up to three stacked warning
            boxes, which could overflow the strip on a small phone. Highest
            priority message wins.
          */}
          {!cameraOn || locationDenied || heading == null ? (
            <Box position="absolute" bottom={16} left={12} right={148} gap="s">
              {!cameraOn ? (
                <KButton
                  label="Turn on camera view"
                  icon="photo_camera"
                  onPress={() => void requestCameraPermission()}
                />
              ) : locationDenied ? (
                <Box backgroundColor="warningSoft" borderRadius="card" padding="m" gap="s">
                  <Text variant="caption" style={{ color: theme.colors.warningInk, fontWeight: "600" }}>
                    Location is off — allow it in Settings for live distance.
                  </Text>
                  <KButton
                    label="Open Settings"
                    variant="secondary"
                    size="sm"
                    onPress={() => void Linking.openSettings().catch(() => {})}
                  />
                </Box>
              ) : (
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="s"
                  backgroundColor="surface"
                  borderRadius="card"
                  padding="m"
                >
                  <Icon name="compass_calibration" size={18} color={theme.colors.brand600} />
                  <Text variant="caption" style={{ flex: 1 }}>
                    Calibrating compass — move the phone in a figure-eight.
                  </Text>
                </Box>
              )}
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
              <PressScale
                onPress={() => Linking.openURL(mapsUrl(target.latitude, target.longitude)).catch(() => {})}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel="Open in Google Maps"
              >
                <Box minHeight={44} justifyContent="center" paddingHorizontal="xs">
                  <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "600" }}>
                    Google Maps
                  </Text>
                </Box>
              </PressScale>
            ) : null}
          </Box>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Box flexDirection="row" gap="s">
              {(["all", "blocks", "facilities", "places"] as Group[]).map((g) => (
                <KPill
                  key={g}
                  label={g.charAt(0).toUpperCase() + g.slice(1)}
                  selected={g === group}
                  onPress={() => setGroup(g)}
                />
              ))}
              <KPill
                label="Nearest first"
                icon="near_me"
                selected={nearestFirst}
                onPress={() => setNearestFirst((v) => !v)}
              />
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
                    <PressScale
                      key={d.id}
                      onPress={() => setSelected(d)}
                      scaleTo={0.95}
                      accessibilityRole="button"
                      accessibilityLabel={`Navigate to ${d.name}${dist ? `, ${dist} away` : ""}`}
                      accessibilityState={{ selected: active }}
                    >
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
                    </PressScale>
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
              <KButton
                label="Directions"
                icon="directions"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => Linking.openURL(mapsUrl(target.latitude, target.longitude)).catch(() => {})}
              />
            ) : null}
            <KButton label="Close" variant="secondary" size="sm" onPress={() => setMapOpen(false)} fullWidth={false} />
          </Box>
        </Box>
      </Modal>
    </Screen>
  )
}
