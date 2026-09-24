import { formatWallClockTime, nowHhmmMalaysia } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { useEffect, useRef, useState } from "react"
import { Linking, Platform, Pressable } from "react-native"
import QRCode from "react-native-qrcode-svg"

import { useBoostBrightness } from "@/lib/brightness"
import { absoluteUrl } from "@/lib/config"
import { useEcard, useRegisterEcard, useWalletLinks } from "@/lib/hooks"
import {
  Box,
  FadeInUp,
  Icon,
  KButton,
  KEmpty,
  LiveDot,
  LoadingScreen,
  Screen,
  SectionTitle,
  StatusChip,
  Text,
  useToast,
  type Theme,
} from "@/ui"

function WalletButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme<Theme>()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 44,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: theme.borderRadii.button,
        // Apple/Google Wallet badges are brand-mandated black — not a theme colour.
        backgroundColor: "#000000",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name="account_balance_wallet" size={18} color={theme.colors.white} />
      <Text variant="button" style={{ color: theme.colors.white }}>
        {label}
      </Text>
    </Pressable>
  )
}

function LogoSlot({ uri, fallback }: { uri: string | null; fallback: string }) {
  const resolved = absoluteUrl(uri)
  return (
    <Box width={70} height={70} alignItems="center" justifyContent="center">
      {resolved ? (
        <Image source={{ uri: resolved }} style={{ width: 70, height: 70 }} contentFit="contain" />
      ) : (
        <Box
          width={70}
          height={70}
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
  const { data, isLoading, isError, refetch } = useEcard()
  const register = useRegisterEcard()
  const wallet = useWalletLinks()
  const appleWalletUrl = wallet.data?.appleWalletUrl ?? null
  const googleWalletUrl = wallet.data?.googleWalletUrl ?? null
  // In dev the buttons show even without server credentials so the design is
  // visible; in production they only appear once a provider is configured.
  const showWallet = Boolean(appleWalletUrl || googleWalletUrl) || __DEV__
  const fired = useRef(false)
  // Live wall-clock stamp under the QR — makes a screenshot of the card
  // visibly distinguishable from the live card for the officer checking it.
  const [shownAt, setShownAt] = useState(() => nowHhmmMalaysia())
  const toast = useToast()

  // Full brightness while the card is on screen, so the QR scans outdoors.
  // Restored automatically on leave.
  useBoostBrightness(Boolean(data))

  function openWallet(url: string) {
    Linking.openURL(url).catch(() => toast.error("Couldn't open Wallet. Try again in a moment."))
  }

  // First view registers the eCard (clears the dashboard checklist task).
  useEffect(() => {
    if (!fired.current && data && !data.ecardRegistered) {
      fired.current = true
      register.mutate()
    }
  }, [data, register])

  useEffect(() => {
    const id = setInterval(() => setShownAt(nowHhmmMalaysia()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (isLoading) return <LoadingScreen label="Loading your eCard…" />

  if (isError || !data) {
    return (
      <Screen scroll edges={["top"]}>
        <KEmpty
          icon="error_outline"
          tone="danger"
          title="Couldn't load your eCard"
          message="Check your connection and try again."
          action={<KButton label="Try again" icon="refresh" onPress={() => refetch()} />}
        />
      </Screen>
    )
  }

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
        {/* The wrapper carries the sizing so the animated view doesn't collapse
            the card's percentage width; maxWidth keeps it centred on tablet. */}
        <FadeInUp style={{ width: "100%", maxWidth: 380 }}>
          <Box
            width="100%"
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

            <Box padding="m">
              <Box flexDirection="row" alignItems="center" justifyContent="center" gap="s">
                <LogoSlot uri={c.ukmLogoUrl} fallback="UKM" />
                <LogoSlot uri={c.kizLogoUrl} fallback="KIZ" />
              </Box>

              <Box alignItems="center" marginTop="s">
                <Text variant="subheading" style={{ letterSpacing: 1 }}>
                  KOLEJ IBU ZAIN
                </Text>
                <Text variant="caption">MYKIZ DIGITAL RESIDENT ID</Text>
              </Box>

              <Box alignItems="center" marginTop="xs">
                <StatusChip
                  label={c.roleLabel ? c.roleLabel.toUpperCase() : "ACTIVE STUDENT"}
                  tone={c.roleLabel ? "brand" : "success"}
                  icon="badge"
                  alignSelf="center"
                />
              </Box>

              <Box alignItems="center" marginTop="m">
                <Box
                  width={92}
                  height={114}
                  borderRadius="card"
                  overflow="hidden"
                  backgroundColor="brand50"
                  alignItems="center"
                  justifyContent="center"
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{ width: 92, height: 114 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Text variant="title" style={{ color: theme.colors.brand600 }}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box alignItems="center" marginTop="s">
                <Text variant="subheading" style={{ textTransform: "uppercase", textAlign: "center" }}>
                  {c.name}
                </Text>
                <Text variant="caption" marginTop="xs">
                  {c.matricId}
                </Text>
              </Box>

              <Box height={1} backgroundColor="border" marginVertical="s" alignSelf="center" width="60%" />

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

              <Box alignItems="center" marginTop="m">
                <QRCode value={c.matricId} size={112} />
                {/*
                  A live "LIVE · 3:42 PM" stamp is the cheap anti-fraud
                  affordance here: a screenshot of this card will show a stale
                  time, which an officer can spot at a glance.
                */}
                <Box flexDirection="row" alignItems="center" gap="s" marginTop="s">
                  <LiveDot label="LIVE" />
                  <Text variant="caption">{formatWallClockTime(shownAt)}</Text>
                </Box>
              </Box>

              {c.validUntil ? (
                <Text variant="caption" textAlign="center" marginTop="s">
                  Valid until {c.validUntil}
                </Text>
              ) : null}
            </Box>
          </Box>
        </FadeInUp>

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

        {showWallet ? (
          <Box width="100%" maxWidth={380} marginTop="l">
            <SectionTitle>Add to Wallet</SectionTitle>
            <Box gap="s">
              {Platform.OS === "ios" ? (
                <WalletButton
                  label="Add to Apple Wallet"
                  onPress={() =>
                    appleWalletUrl
                      ? openWallet(appleWalletUrl)
                      : toast.show("Apple Wallet isn't configured on the server yet.", "info")
                  }
                />
              ) : null}
              <WalletButton
                label="Add to Google Wallet"
                onPress={() =>
                  googleWalletUrl
                    ? openWallet(googleWalletUrl)
                    : toast.show("Google Wallet isn't configured on the server yet.", "info")
                }
              />
            </Box>
          </Box>
        ) : null}

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
