import QRCode from "qrcode"

interface Props {
  name: string
  matricId: string
  block: string | null
  roomNumber: string | null
}

export async function KadMayaCard({ name, matricId, block, roomNumber }: Props) {
  const qrDataUrl = await QRCode.toDataURL(matricId, {
    width: 200,
    margin: 2,
    color: {
      dark: "#004B23",
      light: "#ffffff",
    },
  })

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-card">
      <div className="bg-primary p-4 text-center">
        <p className="font-heading text-lg text-primary-foreground">
          KAD MAYA
        </p>
        <p className="text-xs text-primary-foreground/70">
          Kolej Ibu Zain, UKM
        </p>
      </div>

      <div className="flex flex-col items-center p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR Code"
          className="size-48"
        />

        <div className="mt-4 w-full space-y-1 text-center">
          <p className="font-heading text-xl text-primary-foreground">
            {name}
          </p>
          <p className="text-sm text-muted-foreground">{matricId}</p>
          {(block || roomNumber) && (
            <p className="text-sm text-muted-foreground">
              {[block, roomNumber].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      </div>

      <div className="border-t px-6 py-3">
        <p className="text-center text-xs text-muted-foreground">
          Kad Pengenalan Digital — KIZ Super App
        </p>
      </div>
    </div>
  )
}
