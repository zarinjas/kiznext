import QRCode from "qrcode"

interface Props {
  name: string
  matricId: string
  block: string | null
  roomNumber: string | null
}

export async function KadMayaCard({ name, matricId, block, roomNumber }: Props) {
  const qrDataUrl = await QRCode.toDataURL(matricId, {
    width: 220,
    margin: 1,
    color: {
      dark: "#004B23",
      light: "#ffffff",
    },
  })

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-[#004B23] via-[#0a6b34] to-primary text-primary-foreground shadow-xl">
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <p className="font-heading text-base leading-none">KAD MAYA</p>
          <p className="mt-1 text-xs text-primary-foreground/70">
            Kolej Ibu Zain, UKM
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide">
          Digital ID
        </span>
      </div>

      <div className="flex flex-col items-center px-6 py-6">
        <div className="rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code" className="size-44" />
        </div>

        <div className="mt-5 w-full space-y-1 text-center">
          <p className="font-heading text-xl">{name}</p>
          <p className="text-sm text-primary-foreground/80 tracking-wide">{matricId}</p>
          {(block || roomNumber) && (
            <p className="text-sm text-primary-foreground/70">
              {[block, roomNumber].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/15 px-6 py-3">
        <p className="text-center text-xs text-primary-foreground/70">
          Kad Pengenalan Digital — KIZ Super App
        </p>
      </div>
    </div>
  )
}
