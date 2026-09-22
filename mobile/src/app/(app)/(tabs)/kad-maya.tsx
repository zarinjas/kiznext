import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { useEffect, useRef } from "react"
import QRCode from "react-native-qrcode-svg"

import { absoluteUrl } from "@/lib/config"
import { useEcard, useRegisterEcard } from "@/lib/hooks"
import { Box, LoadingScreen, Screen, StatusChip, Text } from "@/ui"

function LogoSlot({ uri, fallback }: { uri: string | null; fallback: string }) {
  const resolved = absoluteUrl(uri)
  return (
    <Box width={44} height={44} alignItems="center" justifyContent="center">
      {resolved ? (
        <Image source={{ uri: resolved }} style={{ width: 44, height: 44 }} contentFit="contain" />
      ) : (
        <Box
          width={40}
          height={40}
          borderRadius="input"
          backgroundColor="canvasSunk"
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="label">{fallback}</Text>
        </Box>
      )}
    </Box>
  )
}

export default function EcardScreen() {
  const theme = useTheme()
  const { data, isLoading } = useEcard()
  const register = useRegisterEcard()
  const fired = useRef(false)

  // First view registers the eCard (clears the dashboard checklist task).
  useEffect(() => {
    if (!fired.current && data && !data.ecardRegistered) {
      fired.current = true
      register.mutate()
    }
  }, [data, register])

  if (isLoading || !data) return <LoadingScreen label="Loading your eCard…" />

  const c = data.card
  const avatar = absoluteUrl(c.avatarUrl)
  const background = absoluteUrl(c.cardBackgroundUrl)
  const roomLine = c.block
    ? c.roomNumber
      ? `Block ${c.block} · Room ${c.roomNumber}${c.bed ? ` · ${c.bed}` : ""}`
      : `Block ${c.block}`
    : null

  return (
    <Screen scroll edges={["top"]}>
      <Box alignItems="center" paddingTop="l">
        <Box
          width="100%"
          maxWidth={380}
          borderRadius="cardLg"
          borderWidth={1}
          borderColor="border"
          backgroundColor="surface"
          overflow="hidden"
        >
          {background ? (
            <Image
              source={{ uri: background }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
            />
          ) : null}
          {background ? (
            <Box
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.86)" }}
            />
          ) : null}

          <Box padding="l">
            <Box flexDirection="row" alignItems="center" justifyContent="center" gap="s">
              <LogoSlot uri={c.ukmLogoUrl} fallback="UKM" />
              <LogoSlot uri={c.kizLogoUrl} fallback="KIZ" />
            </Box>

            <Box alignItems="center" marginTop="m">
              <Text variant="subheading" style={{ letterSpacing: 1 }}>
                KOLEJ IBU ZAIN
              </Text>
              <Text variant="caption">MYKIZ DIGITAL RESIDENT ID</Text>
            </Box>

            <Box alignItems="center" marginTop="s">
              <StatusChip
                label={c.roleLabel ? c.roleLabel.toUpperCase() : "ACTIVE STUDENT"}
                tone={c.roleLabel ? "brand" : "success"}
                icon="badge"
              />
            </Box>

            <Box alignItems="center" marginTop="l">
              <Box
                width={110}
                height={136}
                borderRadius="card"
                overflow="hidden"
                backgroundColor="brand50"
                alignItems="center"
                justifyContent="center"
              >
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={{ width: 110, height: 136 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text variant="title" style={{ color: theme.colors.brand600 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </Box>
            </Box>

            <Box alignItems="center" marginTop="m">
              <Text variant="subheading" style={{ textTransform: "uppercase", textAlign: "center" }}>
                {c.name}
              </Text>
              <Text variant="caption" marginTop="xs">
                {c.matricId}
              </Text>
            </Box>

            <Box height={1} backgroundColor="border" marginVertical="m" alignSelf="center" width="60%" />

            {roomLine ? (
              <Text variant="caption" textAlign="center">
                {roomLine}
              </Text>
            ) : null}
            {c.session ? (
              <Text variant="caption" textAlign="center" marginTop="xs">
                Residential Session {c.session}
              </Text>
            ) : null}

            <Box alignItems="center" marginTop="l">
              <QRCode value={c.matricId} size={120} />
            </Box>

            {c.validUntil ? (
              <Text variant="caption" textAlign="center" marginTop="m">
                Valid until {c.validUntil}
              </Text>
            ) : null}
          </Box>
        </Box>

        <Box
          width="100%"
          maxWidth={380}
          marginTop="l"
          borderRadius="cardLg"
          backgroundColor="infoSoft"
          padding="m"
        >
          <Text variant="caption" style={{ color: theme.colors.infoInk }}>
            Show this QR code to security officers or KIZ staff for identity verification.
          </Text>
        </Box>

        {background ? (
          <Text variant="caption" textAlign="center" marginTop="m">
            Your eCard uses the KIZ card design.
          </Text>
        ) : null}

        <Box height={32} />
      </Box>
    </Screen>
  )
}
