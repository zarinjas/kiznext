import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { loginSchema } from "@kiz/shared"

import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Box, KButton, Text, TextField, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

export default function LoginScreen() {
  const theme = useTheme<Theme>()
  const { signIn } = useAuth()

  const [matricId, setMatricId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsVerify, setNeedsVerify] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setNeedsVerify(false)

    const parsed = loginSchema.safeParse({ matricId, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.")
      return
    }

    setBusy(true)
    try {
      await signIn(parsed.data.matricId, parsed.data.password)
      router.replace("/")
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerify(true)
        setError(err.message)
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Box alignItems="center" marginTop="xxl" marginBottom="xl">
            <Box
              width={64}
              height={64}
              borderRadius="cardLg"
              backgroundColor="brand600"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name="school" size={32} color="#FFFFFF" />
            </Box>
            <Box height={16} />
            <Text variant="title">MyKIZ</Text>
            <Text variant="caption">Kolej Ibu Zain · Universiti Kebangsaan Malaysia</Text>
          </Box>

          <Box gap="l">
            <TextField
              label="Matric Number"
              value={matricId}
              onChangeText={setMatricId}
              placeholder="e.g. A123456"
              autoCapitalize="characters"
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={submit}
            />

            {error ? (
              <Box
                borderRadius="input"
                borderWidth={1}
                borderColor={needsVerify ? "warning" : "danger"}
                backgroundColor={needsVerify ? "warningSoft" : "dangerSoft"}
                padding="m"
              >
                <Text variant="caption" style={{ color: theme.colors[needsVerify ? "warningInk" : "dangerInk"] }}>
                  {error}
                </Text>
                {needsVerify ? (
                  <Text variant="caption" marginTop="xs">
                    Check your inbox for the verification link, then sign in again.
                  </Text>
                ) : null}
              </Box>
            ) : null}

            <KButton label="Sign in" onPress={submit} loading={busy} />
          </Box>

          <Box marginTop="xl" alignItems="center">
            <Text variant="caption" textAlign="center">
              Use the same matric number and password as the KIZ web app.
            </Text>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, flexGrow: 1 },
})
