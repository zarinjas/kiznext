import { ROLE_LABELS } from "@kiz/shared"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Switch } from "react-native"

import { ApiError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useDemo } from "@/lib/demo"
import {
  authenticateBiometric,
  biometricLabel,
  biometricSupported,
  isBiometricEnabled,
  setBiometricEnabled,
} from "@/lib/biometric"
import { absoluteUrl } from "@/lib/config"
import type { MobileUser } from "@/lib/types"
import {
  Box,
  KButton,
  ListGroup,
  ListRow,
  LoadingScreen,
  PageHeader,
  Screen,
  StatusChip,
  Text,
  TextField,
  useToast,
} from "@/ui"

export default function ProfileScreen() {
  const theme = useTheme()
  const { user, updateUser, signOut } = useAuth()
  const { demo, setDemo } = useDemo()
  const toast = useToast()

  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bioSupported, setBioSupported] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioLabel, setBioLabel] = useState("Biometric unlock")
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      const supported = await biometricSupported()
      if (!active) return
      setBioSupported(supported)
      if (supported) {
        const [enabled, label] = await Promise.all([isBiometricEnabled(), biometricLabel()])
        if (!active) return
        setBioEnabled(enabled)
        setBioLabel(label)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Was `return null`, which rendered a blank white screen with no explanation
  // while the session restored.
  if (!user) return <LoadingScreen label="Loading your profile…" />

  async function toggleBiometric(value: boolean) {
    setError(null)
    setNotice(null)
    if (value) {
      const ok = await authenticateBiometric(`Enable ${bioLabel}`)
      if (!ok) {
        // Previously failed silently — the switch snapped back with no reason.
        setError(`Couldn't verify your ${bioLabel.toLowerCase()}. Nothing was changed.`)
        return
      }
    }
    await setBiometricEnabled(value)
    setBioEnabled(value)
    toast.success(value ? `${bioLabel} enabled.` : `${bioLabel} turned off.`)
  }

  async function pickAndUploadAvatar() {
    setError(null)
    setNotice(null)

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError("Photo library access is needed to change your picture.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", {
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob)

      const res = await apiFetch<{ avatarUrl: string }>("/avatar", {
        method: "POST",
        formData: form,
      })
      updateUser({ avatarUrl: res.avatarUrl })
      setNotice("Looking good — photo updated.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload didn't go through.")
    } finally {
      setUploading(false)
    }
  }

  async function saveProfile() {
    setError(null)
    setNotice(null)

    // Validate before the round trip — a typo'd email previously cost a request
    // and came back as a generic server error.
    if (!name.trim()) {
      setFieldErrors({ name: "Your name can't be empty." })
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setFieldErrors({ email: "That doesn't look like a valid email address." })
      return
    }
    if (phone.trim() && phone.replace(/\D/g, "").length < 9) {
      setFieldErrors({ phone: "Enter a full phone number, e.g. 012-3456789." })
      return
    }
    setFieldErrors({})

    setBusy(true)
    try {
      const res = await apiFetch<{ user: MobileUser }>("/profile", {
        method: "PATCH",
        body: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      })
      updateUser(res.user)
      toast.success("Profile saved.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your profile.")
    } finally {
      setBusy(false)
    }
  }

  const avatarUri = absoluteUrl(user.avatarUrl)

  return (
    <Screen scroll edges={["top"]}>
      <PageHeader title="Profile" subtitle="Your account details" />

      <Box alignItems="center" marginBottom="xl">
        <Box
          width={96}
          height={96}
          borderRadius="pill"
          backgroundColor="brand50"
          overflow="hidden"
          alignItems="center"
          justifyContent="center"
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96 }} contentFit="cover" />
          ) : (
            <Text variant="title" style={{ color: theme.colors.brand600 }}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </Box>
        <Box height={12} />
        <KButton
          label={uploading ? "Uploading…" : "Change photo"}
          onPress={pickAndUploadAvatar}
          variant="secondary"
          icon="photo_camera"
          loading={uploading}
          fullWidth={false}
        />
        <Box height={12} />
        <StatusChip label={ROLE_LABELS[user.role]} tone="brand" icon="badge" />
      </Box>

      {notice ? (
        <Box
          borderRadius="input"
          borderWidth={1}
          borderColor="success"
          backgroundColor="successSoft"
          padding="m"
          marginBottom="l"
        >
          <Text variant="caption" style={{ color: theme.colors.successInk }}>
            {notice}
          </Text>
        </Box>
      ) : null}

      {error ? (
        <Box
          borderRadius="input"
          borderWidth={1}
          borderColor="danger"
          backgroundColor="dangerSoft"
          padding="m"
          marginBottom="l"
        >
          <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
            {error}
          </Text>
        </Box>
      ) : null}

      <Box gap="l">
        <TextField
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={fieldErrors.name}
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@siswa.ukm.edu.my"
          keyboardType="email-address"
          error={fieldErrors.email}
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="01X-XXXXXXX"
          keyboardType="phone-pad"
          error={fieldErrors.phone}
        />
        <KButton label="Save changes" onPress={saveProfile} loading={busy} />
      </Box>

      <Box height={24} />

      {bioSupported ? (
        <>
          <ListGroup title="Security">
            <ListRow
              icon="fingerprint"
              title={bioLabel}
              subtitle={`Require ${bioLabel} to unlock the app`}
              trailing={
                <Switch
                  value={bioEnabled}
                  onValueChange={(v) => void toggleBiometric(v)}
                  trackColor={{ true: theme.colors.brand600, false: theme.colors.border }}
                />
              }
            />
          </ListGroup>
          <Box height={24} />
        </>
      ) : null}

      <ListGroup title="Account">
        <ListRow icon="badge" title="Matric number" meta={user.matricId} />
        <ListRow
          icon="check_circle"
          title="Account status"
          trailing={
            <StatusChip
              label={user.accountStatus === "active" ? "Active" : user.accountStatus}
              tone={user.accountStatus === "active" ? "success" : "warning"}
            />
          }
        />
      </ListGroup>

      <Box height={24} />

      {/*
        Presentation & demo.

        Demo Mode replays a scripted GPS walk and serves canned AI/AR payloads so
        the flagship features can be shown indoors, offline, on a tablet with no
        compass — i.e. in an actual judging room. It is clearly labelled while
        active (a DEMO pill on the dashboard) so it can never be mistaken for
        live sensor output.
      */}
      <ListGroup title="Presentation">
        <ListRow
          icon="auto_awesome"
          title="Demo mode"
          subtitle="Scripted AR walk + offline AI answers for presenting"
          trailing={
            <Switch
              value={demo}
              onValueChange={(v) => {
                setDemo(v)
                toast.show(
                  v
                    ? "Demo mode on — AR and AI now use scripted data."
                    : "Demo mode off — back to live sensors.",
                  v ? "warning" : "success"
                )
              }}
              trackColor={{ true: theme.colors.brand600, false: theme.colors.border }}
            />
          }
        />
        <ListRow
          icon="explore"
          title="Replay AR intro"
          subtitle="Show the AR Wayfinder walkthrough again"
          onPress={async () => {
            await AsyncStorage.removeItem("kiz-ar-intro-seen")
            toast.success("AR intro will show next time you open AR Wayfinder.")
          }}
        />
        <ListRow
          icon="menu_book"
          title="Replay app walkthrough"
          subtitle="Show the welcome slides again"
          onPress={async () => {
            await AsyncStorage.removeItem("kiz.onboarding.seen")
            toast.success("Walkthrough will show on next app launch.")
          }}
        />
      </ListGroup>

      <Box height={24} />

      <KButton
        label="Sign out"
        variant="secondary"
        icon="logout"
        onPress={async () => {
          await signOut()
          router.replace("/login")
        }}
      />

      <Box height={32} />
    </Screen>
  )
}
