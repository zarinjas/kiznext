import { useTheme } from "@shopify/restyle"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ApiError } from "@/lib/api"
import { getResetInfo, resetPassword } from "@/lib/auth-api"
import { Box, KButton, LoadingScreen, Text, TextField, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

export default function SetPasswordScreen() {
  const theme = useTheme<Theme>()
  const params = useLocalSearchParams<{ token?: string }>()
  const token = typeof params.token === "string" ? params.token : ""

  const [loading, setLoading] = useState(Boolean(token))
  const [peekError, setPeekError] = useState<string | null>(
    token ? null : "This reset link is missing its code."
  )
  const [who, setWho] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    getResetInfo(token)
      .then((info) => {
        if (active) setWho(info.name)
      })
      .catch((err) => {
        if (active) setPeekError(err instanceof ApiError ? err.message : "This reset link is invalid or expired.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  async function submit() {
    setError(null)
    if (password.length < 8) return setError("Password must be at least 8 characters.")
    if (password !== confirm) return setError("Passwords don't match.")

    setBusy(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingScreen label="Checking your link…" />

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Box flexDirection="row" alignItems="center" gap="s" marginTop="l">
            <Box
              width={44}
              height={44}
              borderRadius="card"
              backgroundColor="brand600"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name="lock" size={24} color="#FFFFFF" />
            </Box>
            <Box>
              <Text variant="heading">Set a new password</Text>
              {who ? <Text variant="caption">For {who}</Text> : null}
            </Box>
          </Box>

          {peekError ? (
            <Box marginTop="xl" gap="l">
              <Box
                borderRadius="input"
                borderWidth={1}
                borderColor="danger"
                backgroundColor="dangerSoft"
                padding="l"
              >
                <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                  {peekError}
                </Text>
              </Box>
              <KButton label="Back to sign in" onPress={() => router.replace("/login")} />
            </Box>
          ) : done ? (
            <Box marginTop="xl" gap="l">
              <Box
                borderRadius="input"
                borderWidth={1}
                borderColor="success"
                backgroundColor="successSoft"
                padding="l"
              >
                <Text variant="caption" style={{ color: theme.colors.successInk }}>
                  Password updated. Sign in with your new password.
                </Text>
              </Box>
              <KButton label="Back to sign in" onPress={() => router.replace("/login")} />
            </Box>
          ) : (
            <Box gap="l" marginTop="xl">
              <TextField
                label="New password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
              />
              <TextField
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat your new password"
                secureTextEntry
              />

              {error ? (
                <Box
                  borderRadius="input"
                  borderWidth={1}
                  borderColor="danger"
                  backgroundColor="dangerSoft"
                  padding="m"
                >
                  <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                    {error}
                  </Text>
                </Box>
              ) : null}

              <KButton label="Update password" onPress={submit} loading={busy} />
            </Box>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, flexGrow: 1 },
})
