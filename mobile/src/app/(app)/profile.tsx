import { ROLE_LABELS } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { router } from "expo-router"
import { useState } from "react"

import { ApiError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { absoluteUrl } from "@/lib/config"
import type { MobileUser } from "@/lib/types"
import {
  Box,
  KButton,
  ListGroup,
  ListRow,
  PageHeader,
  Screen,
  StatusChip,
  Text,
  TextField,
} from "@/ui"

export default function ProfileScreen() {
  const theme = useTheme()
  const { user, updateUser, signOut } = useAuth()

  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

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
    setBusy(true)
    try {
      const res = await apiFetch<{ user: MobileUser }>("/profile", {
        method: "PATCH",
        body: { name, email, phone },
      })
      updateUser(res.user)
      setNotice("Profile saved.")
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
        <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@siswa.ukm.edu.my"
          keyboardType="email-address"
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="01X-XXXXXXX"
          keyboardType="phone-pad"
        />
        <KButton label="Save changes" onPress={saveProfile} loading={busy} />
      </Box>

      <Box height={24} />

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
