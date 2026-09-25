import * as ImagePicker from "expo-image-picker"

import { apiFetch } from "./api"

export interface AvatarUpload {
  avatarUrl: string
}

/** Must match `MAX_AVATAR` in `app/api/v1/avatar/route.ts`. */
const MAX_AVATAR_BYTES = 8 * 1024 * 1024

/**
 * Pick a square photo and set it as the signed-in user's avatar. Uses
 * `allowsEditing` so iOS returns a cropped JPEG rather than the original HEIC
 * file, which the server's image pipeline cannot decode on Linux.
 *
 * Returns the new avatar URL, or `null` when the user cancels the picker.
 * Throws an `Error` whose message is safe to show the user on any failure.
 */
export async function pickAndUploadAvatar(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    throw new Error("Photo library access is needed to change your picture.")
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  })
  if (result.canceled || !result.assets[0]) return null

  const asset = result.assets[0]

  // Check the limit before sending anything, so an oversized photo gets an
  // immediate, specific message instead of a slow failed round trip.
  if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
    throw new Error(
      `That photo is too large — the limit is ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)}MB. Please choose a smaller one.`,
    )
  }

  const form = new FormData()
  form.append("file", {
    uri: asset.uri,
    name: asset.fileName ?? "avatar.jpg",
    type: asset.mimeType ?? "image/jpeg",
  } as unknown as Blob)

  try {
    const res = await apiFetch<AvatarUpload>("/avatar", { method: "POST", formData: form })
    return res.avatarUrl
  } catch (err) {
    // expo/fetch (Expo SDK 57's global fetch) can't serialise React Native's
    // `{ uri, name, type }` file parts and throws before a request is sent.
    // The fix is `EXPO_PUBLIC_USE_RN_FETCH=1`; if a build lacks it, say so
    // plainly instead of leaking "Unsupported FormDataPart implementation".
    if (err instanceof Error && err.message.includes("Unsupported FormDataPart")) {
      throw new Error("This app version can't upload photos. Please update to the latest version.")
    }
    throw err
  }
}
