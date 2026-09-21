import { useRef } from "react"
import SignatureView, { type SignatureViewRef } from "react-native-signature-canvas"

import { KButton } from "./controls"
import { Box } from "./theme"

const WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; margin: 0; height: 0; }
  body, html { background-color: #FFFFFF; }
`

/**
 * Signature pad backed by `react-native-signature-canvas` (a WebView canvas).
 * Emits the PNG data URL on each stroke (via `readSignature`), which is exactly
 * the format the server check-in transaction expects.
 */
export function SignaturePad({
  onChange,
  height = 200,
}: {
  onChange: (dataUrl: string | null) => void
  height?: number
}) {
  const ref = useRef<SignatureViewRef>(null)

  return (
    <Box gap="s">
      <Box
        borderWidth={1}
        borderColor="borderStrong"
        borderRadius="input"
        overflow="hidden"
        backgroundColor="surface"
        height={height}
      >
        <SignatureView
          ref={ref}
          style={{ flex: 1 }}
          onEnd={() => ref.current?.readSignature()}
          onOK={(signature) => onChange(signature)}
          onClear={() => onChange(null)}
          onEmpty={() => onChange(null)}
          autoClear={false}
          descriptionText=""
          clearText="Clear"
          confirmText="Save"
          webStyle={WEB_STYLE}
          backgroundColor="#FFFFFF"
          penColor="#18181B"
        />
      </Box>
      <KButton
        label="Clear signature"
        variant="secondary"
        onPress={() => {
          ref.current?.clearSignature()
          onChange(null)
        }}
      />
    </Box>
  )
}
