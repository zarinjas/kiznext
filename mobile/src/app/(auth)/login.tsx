import { useTheme } from "@shopify/restyle"
import { APP_NAME, APP_TAGLINE, COLLEGE_WITH_UNIVERSITY, loginSchema } from "@kiz/shared"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { GradientBg } from "@/components/gradient"
import { ApiError } from "@/lib/api"
import { resendVerification } from "@/lib/auth-api"
import { useAuth } from "@/lib/auth-context"
import { useLayout } from "@/lib/responsive"
import {
  AiBadge,
  Box,
  FadeInUp,
  KButton,
  PressScale,
  Text,
  TextField,
  useToast,
  type Theme,
} from "@/ui"

/**
 * Logo is bundled, not fetched.
 *
 * This previously loaded from `${API_BASE_URL}/api/app-icon`, so on venue wifi
 * or a cold backend the very first screen showed an empty box where the brand
 * mark should be. Brand identity must never depend on the network.
 */
const LOGO = require("../../../assets/images/logo-mark.png")

/**
 * Stable demo accounts, guaranteed by `prisma/seed.ts` to exist and be active
 * after any seed or deploy. Present so a reviewer can be inside the app in one
 * tap instead of typing credentials — the web app has had this for a while and
 * mobile was the only surface still gating evaluation behind a keyboard.
 */
const DEMO_ACCOUNTS = [
  { label: "Student demo", matricId: "A999999", password: "kiz123", icon: "school" },
  { label: "Admin demo", matricId: "SUPER001", password: "kiz123", icon: "admin_panel_settings" },
] as const

export default function LoginScreen() {
  const theme = useTheme<Theme>()
  const { signIn } = useAuth()
  const toast = useToast()
  const { contentMaxWidth } = useLayout()

  const [matricId, setMatricId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsVerify, setNeedsVerify] = useState(false)
  const [busy, setBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  async function authenticate(id: string, pass: string) {
    await signIn(id, pass)
    router.replace("/")
  }

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
      await authenticate(parsed.data.matricId, parsed.data.password)
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

  async function demoSignIn(account: (typeof DEMO_ACCOUNTS)[number]) {
    setError(null)
    setDemoBusy(account.matricId)
    try {
      await authenticate(account.matricId, account.password)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `Demo sign-in failed: ${err.message}`
          : "Couldn't reach the server for the demo account."
      )
    } finally {
      setDemoBusy(null)
    }
  }

  async function resend() {
    setResending(true)
    try {
      await resendVerification(matricId, password)
      toast.success("Verification email sent — check your inbox.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't resend. Try again shortly.")
    } finally {
      setResending(false)
    }
  }

  const anyBusy = busy || demoBusy !== null

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <GradientBg id="loginbg" colors={["#F6F5FF", "#EFF6FF", "#FFFFFF"]} direction="tb" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Box width="100%" maxWidth={contentMaxWidth ?? undefined} alignSelf="center">
            <FadeInUp>
              <Box alignItems="center" marginTop="xl" marginBottom="xl">
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
                  <Image source={LOGO} style={{ width: 64, height: 64 }} contentFit="contain" />
                </Box>
                <Box height={14} />
                <Text variant="title">{APP_NAME}</Text>
                <Text variant="caption" textAlign="center">
                  {COLLEGE_WITH_UNIVERSITY}
                </Text>
                {/* States the category the product competes in, on screen one. */}
                <Box marginTop="m" flexDirection="row" alignItems="center" gap="s">
                  <AiBadge label="AI + AR" size="md" />
                  <Text variant="caption" style={{ color: theme.colors.ink500 }}>
                    {APP_TAGLINE.replace("AI & AR campus companion for ", "Campus companion · ")}
                  </Text>
                </Box>
              </Box>
            </FadeInUp>

            <FadeInUp index={1}>
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
                  <FadeInUp>
                    <Box
                      borderRadius="input"
                      borderWidth={1}
                      borderColor={needsVerify ? "warning" : "danger"}
                      backgroundColor={needsVerify ? "warningSoft" : "dangerSoft"}
                      padding="m"
                    >
                      <Text
                        variant="caption"
                        style={{ color: theme.colors[needsVerify ? "warningInk" : "dangerInk"] }}
                      >
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
                              size="sm"
                              fullWidth={false}
                              loading={resending}
                              onPress={resend}
                            />
                          </Box>
                        </>
                      ) : null}
                    </Box>
                  </FadeInUp>
                ) : null}

                <KButton label="Sign in" onPress={submit} loading={busy} disabled={anyBusy} />

                <Box flexDirection="row" justifyContent="space-between">
                  <PressScale onPress={() => router.push("/daftar")} haptic={false}>
                    <Box paddingVertical="s" paddingHorizontal="xs" minHeight={44} justifyContent="center">
                      <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "600" }}>
                        Create an account
                      </Text>
                    </Box>
                  </PressScale>
                  <PressScale onPress={() => router.push("/lupa-kata-laluan")} haptic={false}>
                    <Box paddingVertical="s" paddingHorizontal="xs" minHeight={44} justifyContent="center">
                      <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "600" }}>
                        Forgot password?
                      </Text>
                    </Box>
                  </PressScale>
                </Box>
              </Box>
            </FadeInUp>

            {/* One-tap evaluation path. */}
            <FadeInUp index={2}>
              <Box marginTop="xl">
                <Box flexDirection="row" alignItems="center" gap="m" marginBottom="m">
                  <Box flex={1} height={1} backgroundColor="border" />
                  <Text variant="label">EXPLORE WITHOUT AN ACCOUNT</Text>
                  <Box flex={1} height={1} backgroundColor="border" />
                </Box>
                <Box flexDirection="row" gap="s">
                  {DEMO_ACCOUNTS.map((account) => (
                    <Box key={account.matricId} flex={1}>
                      <KButton
                        label={account.label}
                        icon={account.icon}
                        variant="secondary"
                        size="sm"
                        loading={demoBusy === account.matricId}
                        disabled={anyBusy && demoBusy !== account.matricId}
                        onPress={() => void demoSignIn(account)}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </FadeInUp>

            <Box marginTop="xl" alignItems="center">
              <Text variant="caption" textAlign="center">
                Use the same matric number and password as the KIZ web app.
              </Text>
            </Box>
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
