import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ApiError } from "@/lib/api"
import { registerAccount } from "@/lib/auth-api"
import { Box, KButton, Text, TextField, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

export default function RegisterScreen() {
  const theme = useTheme<Theme>()

  const [matricId, setMatricId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    if (!matricId.trim()) return setError("Enter your matric number.")
    if (name.trim().length < 2) return setError("Enter your full name.")
    if (!email.includes("@")) return setError("Enter your UKM email address.")
    if (password.length < 8) return setError("Password must be at least 8 characters.")

    setBusy(true)
    try {
      const res = await registerAccount({
        matricId: matricId.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      })
      setDone(res.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Try again.")
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
              <Icon name="school" size={24} color="#FFFFFF" />
            </Box>
            <Box>
              <Text variant="heading">Create your account</Text>
              <Text variant="caption">MyKIZ · Kolej Ibu Zain</Text>
            </Box>
          </Box>

          {done ? (
            <Box marginTop="xl" gap="l">
              <Box
                borderRadius="input"
                borderWidth={1}
                borderColor="success"
                backgroundColor="successSoft"
                padding="l"
              >
                <Text variant="bodyStrong" style={{ color: theme.colors.successInk }}>
                  Almost there
                </Text>
                <Text variant="caption" marginTop="xs" style={{ color: theme.colors.successInk }}>
                  {done}
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
              />
              <TextField
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="As on your UKM record"
                autoCapitalize="words"
              />
              <TextField
                label="UKM Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@siswa.ukm.edu.my"
                keyboardType="email-address"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
              />

              <Text variant="caption">
                Students use @siswa.ukm.edu.my · staff use @ukm.edu.my. We&apos;ll email you a link to verify.
              </Text>

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

              <KButton label="Create account" onPress={submit} loading={busy} />
              <KButton
                label="I already have an account"
                variant="ghost"
                onPress={() => router.replace("/login")}
              />
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
