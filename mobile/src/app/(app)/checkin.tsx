import { CHECKIN_NEXT_COUNTER } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"
import { Linking } from "react-native"

import { ApiError } from "@/lib/api"
import { notifySuccess } from "@/lib/feedback"
import { useCheckIn, useHome, useSubmitOwnCheckIn } from "@/lib/hooks"
import type { CheckInOverview, CheckInSubmit } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  KButton,
  KEmpty,
  Screen,
  SignaturePad,
  Skeleton,
  StatusChip,
  Surface,
  Text,
} from "@/ui"

export default function CheckInScreen() {
  const theme = useTheme()
  const { data, isLoading, isError, refetch } = useCheckIn()
  const submit = useSubmitOwnCheckIn()
  // Already-cached on the home tab; reused only to surface a callable contact
  // so "check at the KIZ office" isn't a dead end. No new endpoint.
  const { data: home } = useHome()

  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInSubmit | null>(null)

  const contact = home?.home?.emergencyContacts?.find((c) => c.phone) ?? null

  function send() {
    setError(null)
    if (!signature) {
      setError("Please sign in the box before submitting.")
      return
    }
    submit.mutate(signature, {
      onSuccess: (res) => {
        if (res.ok) {
          notifySuccess()
          setResult(res)
        } else setError(res.error ?? "Couldn't save your signature.")
      },
      onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't save your signature."),
    })
  }

  function callContact() {
    if (!contact?.phone) return
    Linking.openURL(`tel:${contact.phone.replace(/[^+\d]/g, "")}`).catch(() => {})
  }

  const askOffice = (
    <KButton label="Ask the KIZ office" icon="support_agent" onPress={() => router.push("/helpdesk")} />
  )

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
              Next: go to {CHECKIN_NEXT_COUNTER} to collect or return your key.
            </Text>
          </Surface>
          <KButton label="Back to home" onPress={() => router.replace("/")} />
        </Box>
      </Screen>
    )
  }

  function renderBody(loaded: CheckInOverview) {
    if (!loaded.isStudent) {
      return (
        <KEmpty
          icon="how_to_reg"
          title="Students only"
          message="Check-in from the app is for students. Scan the counter QR code instead."
          action={<KButton label="Open QR scanner" icon="qr_code_2" onPress={() => router.push("/scan")} />}
        />
      )
    }

    if (!loaded.session) {
      return (
        <KEmpty
          icon="how_to_reg"
          title="No check-in open right now"
          message="The KIZ office hasn't opened a session. Check back during move-in or move-out."
          action={askOffice}
        />
      )
    }

    if (loaded.alreadySigned) {
      return (
        <Box paddingTop="m" gap="l">
          <Surface>
            <StatusChip label="Already signed" tone="success" icon="check_circle" />
            <Text variant="body" marginTop="s">
              You&apos;ve already signed for {loaded.session.name}.
            </Text>
            {loaded.roomLabel ? (
              <Text variant="caption" marginTop="xs">
                {loaded.roomLabel}
              </Text>
            ) : null}
            <Text variant="caption" marginTop="m">
              Next: go to {CHECKIN_NEXT_COUNTER} to collect or return your key.
            </Text>
          </Surface>
          <KButton label="Back to home" variant="secondary" onPress={() => router.push("/")} />
        </Box>
      )
    }

    if (!loaded.roomLabel) {
      return (
        <KEmpty
          icon="bedroom_parent"
          title="No room assigned yet"
          message="Check at the KIZ office before checking in — they can assign your room."
          action={
            <>
              {contact?.phone ? (
                <KButton
                  label={`Call ${contact.title}`}
                  icon="call"
                  variant="secondary"
                  onPress={callContact}
                />
              ) : null}
              {askOffice}
            </>
          }
        />
      )
    }

    const isCheckOut = loaded.session.type === "check_out"

    return (
      <Box paddingTop="m" gap="l">
        <Surface>
          <StatusChip
            label={isCheckOut ? "Check-out" : "Check-in"}
            tone={isCheckOut ? "info" : "brand"}
            icon="how_to_reg"
          />
          <Text variant="heading" marginTop="s">
            {loaded.session.name}
          </Text>
          <Text variant="body" marginTop="xs">
            {loaded.name} · {loaded.matricId}
          </Text>
          <Text variant="caption" marginTop="xs">
            {loaded.roomLabel}
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
    )
  }

  return (
    <Screen scroll edges={[]}>
      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={() => refetch()}
        skeleton={<Skeleton.CardList count={2} />}
        errorTitle="Couldn't load check-in"
      >
        {(loaded) => renderBody(loaded)}
      </AsyncBoundary>
      <Box height={32} />
    </Screen>
  )
}
