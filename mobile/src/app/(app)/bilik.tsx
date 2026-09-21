import { useTheme } from "@shopify/restyle"
import { useState } from "react"

import { ApiError } from "@/lib/api"
import {
  checkRoommate,
  useBilik,
  useRespondRoommate,
  useSubmitApplication,
  useWithdrawApplication,
} from "@/lib/hooks"
import {
  Box,
  KButton,
  KEmpty,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
  TextField,
  type ChipTone,
} from "@/ui"

function windowTone(state: string): ChipTone {
  switch (state) {
    case "open":
      return "success"
    case "closing_soon":
      return "warning"
    case "closed":
      return "danger"
    default:
      return "neutral"
  }
}

function windowLabel(state: string): string {
  switch (state) {
    case "open":
      return "Open now"
    case "closing_soon":
      return "Closing soon"
    case "closed":
      return "Closed"
    default:
      return "Opening soon"
  }
}

function applicationLabel(status: string): string {
  switch (status) {
    case "single_pending":
      return "Single room requested"
    case "roommate_pending":
      return "Waiting for your roommate to confirm"
    case "roommate_confirmed":
      return "Roommate pair confirmed"
    case "flexible_submitted":
      return "No preference submitted"
    case "roommate_rejected":
      return "Roommate request declined"
    case "allocated":
      return "Room allocated"
    default:
      return status.replace(/_/g, " ")
  }
}

function feeLabel(value: number | null): string {
  return value != null ? `RM ${value.toFixed(2)} / month` : "Fee not published"
}

export default function BilikScreen() {
  const theme = useTheme()
  const { data, isLoading } = useBilik()
  const submit = useSubmitApplication()
  const withdraw = useWithdrawApplication()
  const respond = useRespondRoommate()

  const [selected, setSelected] = useState<"single" | "double" | "flexible" | null>(null)
  const [roommateMatric, setRoommateMatric] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (isLoading || !data) return <LoadingScreen label="Loading room selection…" />

  const state = data.state

  if (!state.eligible) {
    return (
      <Screen scroll edges={[]}>
        <KEmpty icon="bedroom_parent" title="No accommodation offer" message={state.reason} />
      </Screen>
    )
  }

  function pick(type: "single" | "double" | "flexible") {
    setError(null)
    setSelected(type)
    if (type !== "double") {
      submit.mutate(
        { type },
        { onError: (e) => setError(e instanceof ApiError ? e.message : "Application failed.") }
      )
    }
  }

  async function submitDouble() {
    setError(null)
    if (!roommateMatric.trim()) {
      setError("Enter your roommate's matric ID.")
      return
    }
    try {
      const check = await checkRoommate(roommateMatric.trim())
      if (!check.ok) {
        setError(check.error ?? "We could not verify that roommate.")
        return
      }
      submit.mutate(
        { type: "double", roommateMatricId: roommateMatric.trim() },
        { onError: (e) => setError(e instanceof ApiError ? e.message : "Application failed.") }
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We could not verify that roommate.")
    }
  }

  const busy = submit.isPending || withdraw.isPending

  return (
    <Screen scroll edges={[]}>
      <Box gap="l" paddingTop="m">
        <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
          <StatusChip label={windowLabel(state.windowState)} tone={windowTone(state.windowState)} />
          {state.window ? <Text variant="caption">{state.window.name}</Text> : null}
        </Box>

        {state.allocation ? (
          <Surface>
            <StatusChip label="Your room" tone="brand" icon="bedroom_parent" />
            <Text variant="heading" marginTop="s">
              {state.allocation}
            </Text>
          </Surface>
        ) : null}

        {state.application ? (
          <Surface>
            <StatusChip label="Preference submitted" tone="success" icon="check_circle" />
            <Text variant="subheading" marginTop="s">
              {applicationLabel(state.application.status)}
            </Text>
            {state.application.roommate ? (
              <Text variant="caption" marginTop="xs">
                Roommate profile shared: {state.application.roommate.race ?? "—"} ·{" "}
                {state.application.roommate.religion ?? "—"}
              </Text>
            ) : null}
            {state.application.status !== "roommate_confirmed" ? (
              <Box marginTop="m">
                <KButton
                  label="Withdraw preference"
                  variant="secondary"
                  onPress={() =>
                    withdraw.mutate(undefined, {
                      onError: (e) => setError(e instanceof ApiError ? e.message : "Could not withdraw."),
                    })
                  }
                  loading={withdraw.isPending}
                />
              </Box>
            ) : (
              <Text variant="caption" marginTop="m">
                A confirmed roommate request is final and cannot be changed.
              </Text>
            )}
          </Surface>
        ) : null}

        {state.incomingRequest ? (
          <Surface>
            <StatusChip label="Roommate request" tone="warning" icon="person" />
            <Text variant="body" marginTop="s">
              Someone asked you to be their roommate. Their profile:{" "}
              {state.incomingRequest.applicantRace ?? "—"} ·{" "}
              {state.incomingRequest.applicantReligion ?? "—"}.
            </Text>
            <Box flexDirection="row" gap="s" marginTop="m">
              <Box flex={1}>
                <KButton
                  label="Accept"
                  onPress={() => respond.mutate("approved")}
                  loading={respond.isPending}
                />
              </Box>
              <Box flex={1}>
                <KButton
                  label="Decline"
                  variant="secondary"
                  onPress={() => respond.mutate("rejected")}
                  loading={respond.isPending}
                />
              </Box>
            </Box>
          </Surface>
        ) : null}

        {!state.application && !state.hasRoom && !state.incomingRequest ? (
          <>
            <Text variant="label" marginLeft="xs">
              CHOOSE YOUR PREFERENCE
            </Text>

            <Surface>
              <Text variant="subheading">Single Room</Text>
              <Text variant="caption" marginTop="xs">
                {feeLabel(state.fees.single)}
              </Text>
              <Box marginTop="m">
                <KButton
                  label="Request single room"
                  variant={selected === "single" ? "primary" : "secondary"}
                  onPress={() => pick("single")}
                  loading={busy && selected === "single"}
                />
              </Box>
            </Surface>

            <Surface>
              <Text variant="subheading">Twin-Sharing Room</Text>
              <Text variant="caption" marginTop="xs">
                {feeLabel(state.fees.double)}
              </Text>
              <Text variant="caption" marginTop="xs">
                Enter a same-gender roommate&apos;s matric ID. They must accept the pairing.
              </Text>
              <Box marginTop="m" gap="m">
                <TextField
                  label="Roommate's matric ID"
                  value={roommateMatric}
                  onChangeText={setRoommateMatric}
                  placeholder="e.g. A123456"
                  autoCapitalize="characters"
                />
                <KButton
                  label="Verify & request"
                  variant={selected === "double" ? "primary" : "secondary"}
                  onPress={submitDouble}
                  loading={busy && selected === "double"}
                />
              </Box>
            </Surface>

            <Surface>
              <Text variant="subheading">No Preference</Text>
              <Text variant="caption" marginTop="xs">
                Let the KIZ office place you where there&apos;s space.
              </Text>
              <Box marginTop="m">
                <KButton
                  label="Submit no preference"
                  variant={selected === "flexible" ? "primary" : "secondary"}
                  onPress={() => pick("flexible")}
                  loading={busy && selected === "flexible"}
                />
              </Box>
            </Surface>

            <Text variant="caption" style={{ color: theme.colors.ink500 }}>
              Preferences are subject to approval and availability. Final placement is confirmed by
              the KIZ office.
            </Text>
          </>
        ) : null}

        {error ? (
          <Box borderRadius="input" borderWidth={1} borderColor="danger" backgroundColor="dangerSoft" padding="m">
            <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
              {error}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Box height={32} />
    </Screen>
  )
}
