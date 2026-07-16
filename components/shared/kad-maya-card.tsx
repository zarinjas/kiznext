import QRCode from "qrcode"
import Image from "next/image"

interface Props {
  name: string
  matricId: string
  block: string | null
  roomNumber: string | null
  avatarUrl: string | null
}

export async function KadMayaCard({ name, matricId, block, roomNumber, avatarUrl }: Props) {
  const qrDataUrl = await QRCode.toDataURL(matricId, {
    width: 220,
    margin: 1,
  })

  const initial = name.trim().charAt(0).toUpperCase() || "K"

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-[#004B23] via-[#0a6b34] to-[#91C953] text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <p className="font-heading text-base leading-none tracking-wider">KAD MAYA</p>
          <p className="mt-1 text-xs text-white/70">Kolej Ibu Zain, UKM</p>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm">
          Digital ID
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center px-6 py-6">
        {/* Avatar + QR row */}
        <div className="flex w-full items-center gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            {avatarUrl ? (
              <div className="size-20 overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg">
                <Image src={avatarUrl} alt={name} width={80} height={80} className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl bg-white/20 text-3xl font-heading backdrop-blur-sm">
                {initial}
              </div>
            )}
          </div>

          {/* QR */}
          <div className="flex-1">
            <div className="ml-auto w-fit rounded-2xl bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR Code" className="size-24 mix-blend-multiply" />
              </div>
          </div>
        </div>

        {/* User info */}
        <div className="mt-5 w-full space-y-1 text-center">
          <p className="font-heading text-xl tracking-wide drop-shadow-sm">{name}</p>
          <p className="text-sm text-white/90 tracking-widest font-mono">{matricId}</p>
          {(block || roomNumber) && (
            <p className="text-sm text-white/80">
              {[block, roomNumber].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/20 bg-black/10 px-6 py-3 backdrop-blur-sm">
        <p className="text-center text-xs text-white/70">
          Digital ID Card — KIZ Super App
        </p>
      </div>
    </div>
  )
}
