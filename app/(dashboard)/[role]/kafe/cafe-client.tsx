"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Chip from "@mui/material/Chip"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Divider from "@mui/material/Divider"
import Collapse from "@mui/material/Collapse"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { createCafeOrder } from "@/lib/cafe"
import {
  cartSubtotal,
  dietaryMeta,
  formatRM,
  isCafeOpen,
  pickupTimeOptions,
  type CafeCartLine,
  type CafeConfig,
  type CafeItemView,
  type CafeOrderView,
} from "@/lib/cafe-meta"
import { color, font, gradient, radius } from "@/lib/theme"

interface Props {
  config: CafeConfig
  menu: CafeItemView[]
  orders: CafeOrderView[]
}

type Cart = Record<string, number>

export function CafeClient({ config, menu, orders }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<"menu" | "orders">("menu")
  const [category, setCategory] = useState<string>("All")
  const [cart, setCart] = useState<Cart>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)
  const [pickup, setPickup] = useState("ASAP")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ refCode: string; whatsappUrl: string } | null>(null)

  const open = isCafeOpen(config)
  const pickupOptions = useMemo(() => pickupTimeOptions(), [])

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category))
    return ["All", ...Array.from(set)]
  }, [menu])

  const visible = useMemo(
    () => (category === "All" ? menu : menu.filter((m) => m.category === category)),
    [menu, category],
  )

  const lines: CafeCartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([itemId, qty]) => {
        const item = menu.find((m) => m.id === itemId)
        if (!item || qty <= 0) return null
        return { itemId, name: item.name, price: item.price, qty }
      })
      .filter((l): l is CafeCartLine => l !== null)
  }, [cart, menu])

  const count = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = cartSubtotal(lines)

  function add(item: CafeItemView) {
    if (!item.isAvailable) return
    setCart((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }))
  }

  function setQty(itemId: string, qty: number) {
    setCart((c) => {
      const next = { ...c }
      if (qty <= 0) delete next[itemId]
      else next[itemId] = Math.min(50, qty)
      return next
    })
  }

  async function sendOrder() {
    if (lines.length === 0) return
    setSending(true)
    setError(null)
    // Open a tab inside the user gesture so the popup blocker allows the
    // WhatsApp hand-off after the await resolves.
    const win = typeof window !== "undefined" ? window.open("", "_blank") : null
    try {
      const res = await createCafeOrder({ lines, pickupTime: pickup, note })
      if (!res.success || !res.order) {
        win?.close()
        setError(res.error ?? "Couldn't place the order.")
        return
      }
      if (win) win.location.href = res.order.whatsappUrl
      else window.location.href = res.order.whatsappUrl
      setSent({ refCode: res.order.refCode, whatsappUrl: res.order.whatsappUrl })
      setCart({})
      setCartOpen(false)
      setNote("")
      setTab("orders")
      router.refresh()
    } catch (e) {
      win?.close()
      setError(e instanceof Error ? e.message : "Couldn't place the order.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Box>
      {/* ── Cafe status banner ─────────────────────────────────────────────── */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          backgroundImage: gradient.panel,
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />
        <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mb: 1 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.375,
                  borderRadius: radius.pill,
                  backgroundColor: color.accent[100],
                  color: color.accent[700],
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                <KIcon icon="auto_awesome" size={13} />
                AI MENU · SMART ORDERING
              </Box>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.375,
                  borderRadius: radius.pill,
                  fontSize: 11,
                  fontWeight: 700,
                  ...(open
                    ? { backgroundColor: color.success.soft, color: color.success.ink }
                    : { backgroundColor: color.neutral.soft, color: color.neutral.ink }),
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: open ? color.success.main : color.neutral.main }} />
                {open ? "Open now" : "Closed"}
              </Box>
            </Box>
            <Typography sx={{ fontWeight: 640, fontSize: { xs: 17, sm: 19 }, letterSpacing: "-0.02em" }}>
              {config.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25, maxWidth: 560 }}>
              {config.tagline}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1.25, flexWrap: "wrap" }}>
              <Meta icon="schedule" text={config.hoursLabel} />
              <Meta icon="place" text={config.location} />
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            {config.menuImage && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<KIcon icon="photo_library" size={17} />}
                onClick={() => setShowPhoto((s) => !s)}
              >
                {showPhoto ? "Hide menu photo" : "View menu photo"}
              </Button>
            )}
            <Typography variant="caption" sx={{ color: "text.disabled", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <KIcon icon="chat" size={14} />
              Orders sent via WhatsApp
            </Typography>
          </Box>
        </Box>

        {config.menuImage && (
          <Collapse in={showPhoto}>
            <Box
              component="img"
              src={config.menuImage}
              alt="Menu"
              sx={{
                display: "block",
                width: "100%",
                maxHeight: 460,
                objectFit: "contain",
                mt: 2,
                borderRadius: `${radius.card}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            />
          </Collapse>
        )}
      </Box>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TabButton active={tab === "menu"} onClick={() => setTab("menu")} icon="restaurant_menu" label="Menu" />
        <TabButton
          active={tab === "orders"}
          onClick={() => setTab("orders")}
          icon="receipt_long"
          label={orders.length > 0 ? `My Orders (${orders.length})` : "My Orders"}
        />
      </Box>

      {tab === "menu" ? (
        <>
          {menu.length === 0 ? (
            <KEmpty
              icon="restaurant"
              title="Menu coming soon"
              body={`${config.name} hasn't published a menu yet. Check back shortly.`}
            />
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
                {categories.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    size="small"
                    onClick={() => setCategory(c)}
                    sx={{
                      borderRadius: radius.pill,
                      fontWeight: 600,
                      ...(category === c
                        ? { backgroundColor: color.brand[600], color: "#fff", "&:hover": { backgroundColor: color.brand[700] } }
                        : {}),
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1.5, pb: count > 0 ? 10 : 2 }}>
                {visible.map((item) => (
                  <ItemCard key={item.id} item={item} qty={cart[item.id] ?? 0} onAdd={() => add(item)} />
                ))}
              </Box>
            </>
          )}
        </>
      ) : (
        <OrdersList orders={orders} onReorder={(order) => {
          const next: Cart = {}
          for (const l of order.items) {
            if (menu.some((m) => m.id === l.itemId && m.isAvailable)) next[l.itemId] = l.qty
          }
          setCart(next)
          setTab("menu")
          setCartOpen(true)
        }} />
      )}

      {/* ── Sticky cart bar ────────────────────────────────────────────────── */}
      {count > 0 && (
        <Box
          sx={{
            position: "sticky",
            bottom: { xs: 72, sm: 12 },
            zIndex: 5,
            mt: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: 2,
            py: 1.25,
            borderRadius: `${radius.cardLg}px`,
            backgroundColor: color.brand[900],
            color: "#fff",
            boxShadow: "0 10px 30px rgba(8,145,178,0.35)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KIcon icon="shopping_bag" size={18} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                {count} {count === 1 ? "item" : "items"} · {formatRM(subtotal)}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Pay at pickup
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => setCartOpen(true)}
            sx={{ backgroundColor: "#fff", color: color.brand[900], "&:hover": { backgroundColor: "#F0FDFF" } }}
            endIcon={<KIcon icon="arrow_forward" size={17} />}
          >
            Review order
          </Button>
        </Box>
      )}

      {/* ── Cart / checkout dialog ─────────────────────────────────────────── */}
      <KDialog open={cartOpen} onClose={() => setCartOpen(false)} title="Your order" icon="shopping_bag">
        {lines.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Your cart is empty.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {lines.map((l) => (
                <Box key={l.itemId} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, "& + &": { borderTop: "1px solid", borderColor: "divider" } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{l.name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatRM(l.price)} each
                    </Typography>
                  </Box>
                  <QtyStepper qty={l.qty} onChange={(q) => setQty(l.itemId, q)} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14, minWidth: 66, textAlign: "right", fontFamily: font.mono }}>
                    {formatRM(l.price * l.qty)}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Subtotal</Typography>
              <Typography sx={{ fontWeight: 700, fontFamily: font.mono }}>{formatRM(subtotal)}</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField
                select
                size="small"
                label="Pickup time"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                <MenuItem value="ASAP">ASAP</MenuItem>
                {pickupOptions.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. kurang pedas"
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, borderRadius: `${radius.card}px`, backgroundColor: color.brand[50], color: color.brand[800], fontSize: 12.5 }}>
              <KIcon icon="info" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Tapping <b>Send via WhatsApp</b> opens WhatsApp with your order ready — just press send. Reference{" "}
                <b>#KIZ-CAFE-…</b> is added automatically for pickup.
              </span>
            </Box>

            {error && (
              <Typography variant="caption" sx={{ color: "error.main" }}>{error}</Typography>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" onClick={() => setCartOpen(false)} disabled={sending}>
                Keep browsing
              </Button>
              <KButton loading={sending} icon="send" onClick={sendOrder}>
                Send via WhatsApp
              </KButton>
            </Box>
          </Box>
        )}
      </KDialog>

      {/* ── Sent confirmation ──────────────────────────────────────────────── */}
      <KDialog open={Boolean(sent)} onClose={() => setSent(null)} title="Order sent" icon="check_circle" maxWidth="xs">
        {sent && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Show this reference at the counter when you collect your food.
            </Typography>
            <Box sx={{ p: 1.75, borderRadius: `${radius.card}px`, backgroundColor: color.brand[50], textAlign: "center" }}>
              <Typography sx={{ fontFamily: font.mono, fontWeight: 700, fontSize: 18, color: color.brand[800], letterSpacing: "0.02em" }}>
                {sent.refCode}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Didn&rsquo;t open WhatsApp? Use the button below to send it again.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" onClick={() => setSent(null)}>Done</Button>
              <KButton
                icon="chat"
                onClick={() => window.open(sent.whatsappUrl, "_blank")}
              >
                Open WhatsApp
              </KButton>
            </Box>
          </Box>
        )}
      </KDialog>
    </Box>
  )
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return (
    <Typography variant="caption" sx={{ color: "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <KIcon icon={icon} size={15} />
      {text}
    </Typography>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <Button
      onClick={onClick}
      startIcon={<KIcon icon={icon} size={17} />}
      variant={active ? "contained" : "outlined"}
      size="small"
      sx={{ borderRadius: radius.pill, textTransform: "none" }}
    >
      {label}
    </Button>
  )
}

function ItemCard({ item, qty, onAdd }: { item: CafeItemView; qty: number; onAdd: () => void }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: qty > 0 ? color.brand[300] : "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
        opacity: item.isAvailable ? 1 : 0.6,
      }}
    >
      {item.imageUrl && (
        <Box
          component="img"
          src={item.imageUrl}
          alt={item.name}
          sx={{ display: "block", width: "100%", height: 140, objectFit: "cover", backgroundColor: color.canvasSunk }}
        />
      )}
      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 0.75, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontWeight: 640, fontSize: 14.5, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            {item.name}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 14, fontFamily: font.mono, whiteSpace: "nowrap" }}>
            {formatRM(item.price)}
          </Typography>
        </Box>
        {item.description && (
          <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
            {item.description}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {item.dietary.map((d) => {
            const meta = dietaryMeta(d)
            return (
              <Box key={d} sx={{ display: "inline-flex", alignItems: "center", gap: 0.375, px: 0.75, py: 0.25, borderRadius: radius.pill, backgroundColor: color.canvasSunk, color: "text.secondary", fontSize: 10.5, fontWeight: 600 }}>
                <KIcon icon={meta.icon} size={12} />
                {meta.label}
              </Box>
            )
          })}
        </Box>
        <Box sx={{ mt: "auto", pt: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          {item.isAvailable ? (
            qty > 0 ? (
              <Typography variant="caption" sx={{ color: color.brand[700], fontWeight: 700 }}>
                {qty} in cart
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: "text.disabled" }}>{item.category}</Typography>
            )
          ) : (
            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>Sold out</Typography>
          )}
          <Button
            size="small"
            variant="contained"
            disabled={!item.isAvailable}
            onClick={onAdd}
            startIcon={<KIcon icon="add" size={16} />}
            sx={{ minWidth: 0, borderRadius: radius.pill }}
          >
            Add
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

function QtyStepper({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, border: "1px solid", borderColor: "divider", borderRadius: radius.pill, px: 0.25 }}>
      <IconButton size="small" onClick={() => onChange(qty - 1)} aria-label="Decrease">
        <KIcon icon="remove" size={16} />
      </IconButton>
      <Typography sx={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{qty}</Typography>
      <IconButton size="small" onClick={() => onChange(qty + 1)} aria-label="Increase">
        <KIcon icon="add" size={16} />
      </IconButton>
    </Box>
  )
}

function OrdersList({ orders, onReorder }: { orders: CafeOrderView[]; onReorder: (o: CafeOrderView) => void }) {
  if (orders.length === 0) {
    return <KEmpty icon="receipt_long" title="No orders yet" body="Your cafe orders and their pickup references will appear here." />
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pb: 2 }}>
      {orders.map((o) => (
        <Box
          key={o.id}
          sx={{ borderRadius: `${radius.cardLg}px`, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", p: 2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.375, borderRadius: radius.pill, backgroundColor: color.brand[50], color: color.brand[800], fontFamily: font.mono, fontWeight: 700, fontSize: 12 }}>
                <KIcon icon="qr_code_2" size={13} />
                {o.refCode}
              </Box>
              <Typography variant="caption" sx={{ color: "text.disabled" }}>{o.when}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 700, fontFamily: font.mono, fontSize: 14 }}>{formatRM(o.subtotal)}</Typography>
              <Button size="small" variant="outlined" onClick={() => onReorder(o)} startIcon={<KIcon icon="replay" size={15} />}>
                Reorder
              </Button>
            </Box>
          </Box>
          <Divider sx={{ my: 1.25 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {o.items.map((l, i) => (
              <Typography key={i} variant="body2" sx={{ color: "text.secondary", fontSize: 13 }}>
                {l.qty}× {l.name}
              </Typography>
            ))}
          </Box>
          {(o.pickupTime || o.note) && (
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1 }}>
              {o.pickupTime ? `Pickup ${o.pickupTime}` : ""}
              {o.pickupTime && o.note ? " · " : ""}
              {o.note ?? ""}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  )
}
