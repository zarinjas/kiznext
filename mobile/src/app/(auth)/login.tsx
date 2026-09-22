import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { loginSchema } from "@kiz/shared"

import { GradientBg } from "@/components/gradient"
import { ApiError } from "@/lib/api"
import { resendVerification } from "@/lib/auth-api"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/config"
import { Box, KButton, Text, TextField, type Theme } from "@/ui"

const LOGO_URL = `${API_BASE_URL}/api/app-icon`

export default function LoginScreen() {
  const theme = useTheme<Theme>()
  const { signIn } = useAuth()

  const [matricId, setMatricId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsVerify, setNeedsVerify] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)

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

  async function resend() {
    setResending(true)
    try {
      await resendVerification(matricId, password)
      Alert.alert("Email sent", "Check your inbox for the verification link.")
    } catch (err) {
      Alert.alert("Couldn't resend", err instanceof ApiError ? err.message : "Try again in a moment.")
    } finally {
      setResending(false)
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <GradientBg id="loginbg" colors={["#F6F5FF", "#EFF6FF", "#FFFFFF"]} direction="tb" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Box alignItems="center" marginTop="xxl" marginBottom="xl">
            <Box
              width={84}
              height={84}
              borderRadius="cardLg"
              backgroundColor="surface"
              borderWidth={1}
              borderColor="border"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
              padding="m"
            >
              <Image source={{ uri: LOGO_URL }} style={{ width: 64, height: 64 }} contentFit="contain" />
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
                  <>
                    <Text variant="caption" marginTop="xs">
                      Check your inbox for the verification link, then sign in again.
                    </Text>
                    <Box marginTop="s" alignItems="flex-start">
                      <KButton
                        label="Resend verification email"
                        variant="secondary"
                        fullWidth={false}
                        loading={resending}
                        onPress={resend}
                      />
                    </Box>
                  </>
                ) : null}
              </Box>
            ) : null}

            <KButton label="Sign in" onPress={submit} loading={busy} />

            <Box flexDirection="row" justifyContent="space-between" marginTop="s">
              <Pressable onPress={() => router.push("/daftar")}>
                <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "600" }}>
                  Create an account
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push("/lupa-kata-laluan")}>
                <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "600" }}>
                  Forgot password?
                </Text>
              </Pressable>
            </Box>
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
