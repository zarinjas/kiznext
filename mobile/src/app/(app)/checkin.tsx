import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"

import { ApiError } from "@/lib/api"
import { useCheckIn, useSubmitOwnCheckIn } from "@/lib/hooks"
import type { CheckInSubmit } from "@/lib/types"
import {
  Box,
  KButton,
  KEmpty,
  LoadingScreen,
  Screen,
  SignaturePad,
  StatusChip,
  Surface,
  Text,
} from "@/ui"

export default function CheckInScreen() {
  const theme = useTheme()
  const { data, isLoading } = useCheckIn()
  const submit = useSubmitOwnCheckIn()

  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInSubmit | null>(null)

  if (isLoading || !data) return <LoadingScreen label="Loading check-in…" />

  function send() {
    setError(null)
    if (!signature) {
      setError("Please sign in the box before submitting.")
      return
    }
    submit.mutate(signature, {
      onSuccess: (res) => {
        if (res.ok) setResult(res)
        else setError(res.error ?? "Couldn't save your signature.")
      },
      onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't save your signature."),
    })
  }

  if (result?.ok) {
    return (
      <Screen scroll edges={[]}>
        <Box paddingTop="l" gap="l">
          <Surface>
            <StatusChip
              label={result.type === "check_out" ? "Checked out" : "Checked in"}
              tone="success"
              icon="check_circle"
            />
            <Text variant="heading" marginTop="s">
              {result.name}
            </Text>
            {result.roomLabel ? (
              <Text variant="body" marginTop="xs">
                {result.roomLabel}
              </Text>
            ) : null}
            <Text variant="caption" marginTop="m">
              Next: go to Counter 2 (UKM Real Estate) to collect or return your key.
            </Text>
          </Surface>
          <KButton label="Back to home" onPress={() => router.replace("/")} />
        </Box>
      </Screen>
    )
  }

  if (!data.isStudent) {
    return (
      <Screen scroll edges={[]}>
        <KEmpty
          icon="how_to_reg"
          title="Students only"
          message="Check-in from the app is for students. Scan the counter QR code instead."
        />
        <KButton label="Open QR scanner" icon="qr_code_2" onPress={() => router.push("/scan")} />
      </Screen>
    )
  }

  if (!data.session) {
    return (
      <Screen scroll edges={[]}>
        <KEmpty
          icon="how_to_reg"
          title="No check-in open right now"
          message="The KIZ office hasn't opened a session. Check back during move-in or move-out."
        />
      </Screen>
    )
  }

  if (data.alreadySigned) {
    return (
      <Screen scroll edges={[]}>
        <Surface>
          <StatusChip label="Already signed" tone="success" icon="check_circle" />
          <Text variant="body" marginTop="s">
            You&apos;ve already signed for {data.session.name}.
          </Text>
          {data.roomLabel ? (
            <Text variant="caption" marginTop="xs">
              {data.roomLabel}
            </Text>
          ) : null}
        </Surface>
      </Screen>
    )
  }

  if (!data.roomLabel) {
    return (
      <Screen scroll edges={[]}>
        <KEmpty
          icon="bedroom_parent"
          title="No room assigned yet"
          message="Check at the KIZ office before checking in."
        />
      </Screen>
    )
  }

  const isCheckOut = data.session.type === "check_out"

  return (
    <Screen scroll edges={[]}>
      <Box paddingTop="m" gap="l">
        <Surface>
          <StatusChip
            label={isCheckOut ? "Check-out" : "Check-in"}
            tone={isCheckOut ? "info" : "brand"}
            icon="how_to_reg"
          />
          <Text variant="heading" marginTop="s">
            {data.session.name}
          </Text>
          <Text variant="body" marginTop="xs">
            {data.name} · {data.matricId}
          </Text>
          <Text variant="caption" marginTop="xs">
            {data.roomLabel}
          </Text>
        </Surface>

        <Box>
          <Text variant="label" marginBottom="s" marginLeft="xs">
            SIGN HERE
          </Text>
          <SignaturePad onChange={setSignature} />
        </Box>

        {error ? (
          <Box borderRadius="input" borderWidth={1} borderColor="danger" backgroundColor="dangerSoft" padding="m">
            <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
              {error}
            </Text>
          </Box>
        ) : null}

        <KButton
          label={isCheckOut ? "Confirm check-out" : "Confirm check-in"}
          onPress={send}
          loading={submit.isPending}
        />
      </Box>
      <Box height={32} />
    </Screen>
  )
}
