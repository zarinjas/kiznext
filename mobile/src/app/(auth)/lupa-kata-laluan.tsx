import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ApiError } from "@/lib/api"
import { requestPasswordReset } from "@/lib/auth-api"
import { Box, KButton, Text, TextField, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

export default function ForgotPasswordScreen() {
  const theme = useTheme<Theme>()

  const [matricId, setMatricId] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    if (!matricId.trim()) return setError("Enter your matric number.")

    setBusy(true)
    try {
      const res = await requestPasswordReset(matricId.trim())
      setMessage(res.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the reset email. Try again.")
    } finally {
      setBusy(false)
    }
  }

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
              <Text variant="heading">Forgot password</Text>
              <Text variant="caption">We&apos;ll email you a reset link</Text>
            </Box>
          </Box>

          {message ? (
            <Box marginTop="xl" gap="l">
              <Box
                borderRadius="input"
                borderWidth={1}
                borderColor="success"
                backgroundColor="successSoft"
                padding="l"
              >
                <Text variant="caption" style={{ color: theme.colors.successInk }}>
                  {message}
                </Text>
              </Box>
              <KButton label="Back to sign in" onPress={() => router.replace("/login")} />
            </Box>
          ) : (
            <Box gap="l" marginTop="xl">
              <TextField
                label="Matric Number"
                value={matricId}
                onChangeText={setMatricId}
                placeholder="e.g. A123456"
                autoCapitalize="characters"
                returnKeyType="go"
                onSubmitEditing={submit}
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

              <KButton label="Send reset link" onPress={submit} loading={busy} />
              <KButton label="Back to sign in" variant="ghost" onPress={() => router.replace("/login")} />
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
