import { useTheme } from "@shopify/restyle"
import { Linking } from "react-native"
import { useState } from "react"
import { Image } from "expo-image"

import {
  CAFE_DIETARY_LABELS,
  cartSubtotal,
  formatRM,
  isCafeOpen,
  pickupTimeOptions,
  type CafeCartLine,
  type CafeItem,
} from "@kiz/shared"

import { absoluteUrl } from "@/lib/config"
import { useCafe, usePlaceCafeOrder } from "@/lib/hooks"
import { useLayout } from "@/lib/responsive"
import {
  Box,
  KButton,
  KEmpty,
  KIconButton,
  KPill,
  LoadingScreen,
  PressScale,
  Screen,
  Sheet,
  StatusChip,
  Surface,
  Text,
  TextField,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

/**
 * KIZ Cafe — smart ordering. Students build a cart from the AI-digitised menu,
 * then hand the order off to WhatsApp (the cafe has no app of its own). The
 * order reference is minted server-side and shown for pickup.
 */
export default function KafeScreen() {
  const theme = useTheme<Theme>()
  const { isTablet } = useLayout()
  const { data, isLoading, isError, refetch, isRefetching } = useCafe()
  const placeOrder = usePlaceCafeOrder()

  const [tab, setTab] = useState<"menu" | "orders">("menu")
  const [category, setCategory] = useState("All")
  const [cart, setCart] = useState<Record<string, number>>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pickup, setPickup] = useState("ASAP")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ refCode: string; whatsappUrl: string } | null>(null)

  if (isLoading && !data) return <LoadingScreen label="Loading the cafe…" />

  if (isError || !data) {
    return (
      <Screen scroll edges={["top"]}>
        <KEmpty
          icon="restaurant"
          tone="danger"
          title="Couldn't load the cafe"
          message="Check your connection and try again."
          action={<KButton label="Try again" icon="refresh" variant="secondary" onPress={() => refetch()} />}
        />
      </Screen>
    )
  }

  const { config, menu, orders } = data
  const open = isCafeOpen(config)
  const categories = ["All", ...Array.from(new Set(menu.map((m) => m.category)))]
  const visible = category === "All" ? menu : menu.filter((m) => m.category === category)
  const lines: CafeCartLine[] = Object.entries(cart)
    .map(([itemId, qty]) => {
      const item = menu.find((m) => m.id === itemId)
      if (!item || qty <= 0) return null
      return { itemId, name: item.name, price: item.price, qty }
    })
    .filter((l): l is CafeCartLine => l !== null)
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = cartSubtotal(lines)
  const menuImage = absoluteUrl(config.menuImage)

  function setQty(itemId: string, qty: number) {
    setCart((c) => {
      const next = { ...c }
      if (qty <= 0) delete next[itemId]
      else next[itemId] = Math.min(50, qty)
      return next
    })
  }

  async function send() {
    setError(null)
    try {
      const res = await placeOrder.mutateAsync({
        lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
        pickupTime: pickup,
        note,
      })
      setSent({ refCode: res.refCode, whatsappUrl: res.whatsappUrl })
      setCart({})
      setNote("")
      setSheetOpen(false)
      setTab("orders")
      Linking.openURL(res.whatsappUrl).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't place the order.")
    }
  }

  return (
    <Box flex={1}>
      <Screen scroll edges={["top"]} refreshing={isRefetching} onRefresh={() => refetch()}>
        {/* Cafe status */}
        <Surface>
          <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
            <StatusChip label="AI MENU · SMART ORDERING" tone="brand" icon="auto_awesome" />
            <StatusChip label={open ? "Open now" : "Closed"} tone={open ? "success" : "neutral"} />
          </Box>
          <Text variant="heading" marginTop="s">
            {config.name}
          </Text>
          <Text variant="caption" marginTop="xs">
            {config.tagline}
          </Text>
          <Box flexDirection="row" alignItems="center" gap="m" marginTop="s" flexWrap="wrap">
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="schedule" size={14} color={theme.colors.ink500} />
              <Text variant="caption">{config.hoursLabel}</Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="place" size={14} color={theme.colors.ink500} />
              <Text variant="caption">{config.location}</Text>
            </Box>
          </Box>
          {menuImage ? (
            <Box marginTop="m">
              <Image
                source={{ uri: menuImage }}
                style={{ width: "100%", height: 200, borderRadius: theme.borderRadii.card }}
                contentFit="contain"
                transition={150}
              />
            </Box>
          ) : null}
        </Surface>

        {/* Tabs */}
        <Box flexDirection="row" gap="s" marginTop="l">
          <KPill label="Menu" icon="restaurant_menu" selected={tab === "menu"} onPress={() => setTab("menu")} />
          <KPill
            label={orders.length ? `My Orders (${orders.length})` : "My Orders"}
            icon="receipt_long"
            selected={tab === "orders"}
            onPress={() => setTab("orders")}
          />
        </Box>

        {tab === "menu" ? (
          menu.length === 0 ? (
            <Box marginTop="l">
              <KEmpty icon="restaurant" title="Menu coming soon" message={`${config.name} hasn't published a menu yet.`} />
            </Box>
          ) : (
            <>
              <Box flexDirection="row" gap="s" marginTop="m" marginBottom="s" style={{ flexWrap: "wrap" }}>
                {categories.map((c) => (
                  <KPill key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
                ))}
              </Box>

              {visible.map((item) => (
                <MenuRow
                  key={item.id}
                  item={item}
                  qty={cart[item.id] ?? 0}
                  onAdd={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}
                  onSub={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}
                />
              ))}
            </>
          )
        ) : orders.length === 0 ? (
          <Box marginTop="l">
            <KEmpty
              icon="receipt_long"
              title="No orders yet"
              message="Your cafe orders and pickup references will appear here."
            />
          </Box>
        ) : (
          <Box marginTop="m" gap="s">
            {orders.map((o) => (
              <Surface key={o.id}>
                <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
                  <Box flexDirection="row" alignItems="center" gap="s">
                    <StatusChip label={o.refCode} tone="brand" icon="qr_code_2" />
                    <Text variant="caption">{o.when}</Text>
                  </Box>
                  <Text variant="bodyStrong">{formatRM(o.subtotal)}</Text>
                </Box>
                <Box marginTop="s" gap="xs">
                  {o.items.map((l, i) => (
                    <Text key={i} variant="caption">
                      {l.qty}× {l.name}
                    </Text>
                  ))}
                </Box>
                {(o.pickupTime || o.note) && (
                  <Text variant="caption" marginTop="xs">
                    {o.pickupTime ? `Pickup ${o.pickupTime}` : ""}
                    {o.pickupTime && o.note ? " · " : ""}
                    {o.note ?? ""}
                  </Text>
                )}
              </Surface>
            ))}
          </Box>
        )}

        <Box height={count > 0 ? 96 : 24} />
      </Screen>

      {/* Sticky cart bar */}
      {count > 0 ? (
        <Box
          position="absolute"
          left={16}
          right={16}
          bottom={16}
          style={{
            maxWidth: isTablet ? 620 : undefined,
            alignSelf: "center",
            width: isTablet ? 620 : undefined,
          }}
        >
          <PressScale
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Review order, ${count} items`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: theme.borderRadii.cardLg,
              backgroundColor: theme.colors.brand700,
            }}
          >
            <Box flexDirection="row" alignItems="center" gap="s">
              <Icon name="shopping_bag" size={20} color="#FFFFFF" />
              <Box>
                <Text variant="bodyStrong" style={{ color: "#FFFFFF" }}>
                  {count} {count === 1 ? "item" : "items"} · {formatRM(subtotal)}
                </Text>
                <Text variant="caption" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Pay at pickup
                </Text>
              </Box>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Text variant="button" style={{ color: "#FFFFFF" }}>
                Review
              </Text>
              <Icon name="arrow_forward" size={18} color="#FFFFFF" />
            </Box>
          </PressScale>
        </Box>
      ) : null}

      {/* Cart sheet */}
      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Your order"
        subtitle={`${count} ${count === 1 ? "item" : "items"} · pay at pickup`}
        footer={
          <>
            {error ? (
              <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                {error}
              </Text>
            ) : null}
            <KButton
              label="Send via WhatsApp"
              icon="send"
              loading={placeOrder.isPending}
              disabled={lines.length === 0}
              onPress={() => void send()}
            />
            <Text variant="caption" textAlign="center">
              Opens WhatsApp with your order ready — just press send.
            </Text>
          </>
        }
      >
        {lines.map((l) => (
          <Box
            key={l.itemId}
            flexDirection="row"
            alignItems="center"
            gap="m"
            paddingVertical="s"
            borderBottomWidth={1}
            borderColor="border"
          >
            <Box flex={1} minWidth={0}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {l.name}
              </Text>
              <Text variant="caption">{formatRM(l.price)} each</Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <KIconButton icon="remove" label={`Remove one ${l.name}`} onPress={() => setQty(l.itemId, l.qty - 1)} />
              <Text variant="bodyStrong">{l.qty}</Text>
              <KIconButton icon="add" label={`Add one ${l.name}`} onPress={() => setQty(l.itemId, l.qty + 1)} />
            </Box>
            <Text variant="bodyStrong" style={{ minWidth: 64, textAlign: "right" }}>
              {formatRM(l.price * l.qty)}
            </Text>
          </Box>
        ))}

        <Box marginTop="m">
          <Text variant="label" marginBottom="xs" marginLeft="xs">
            PICKUP TIME
          </Text>
          <Box flexDirection="row" gap="s" style={{ flexWrap: "wrap" }}>
            {["ASAP", ...pickupTimeOptions()].map((t) => (
              <KPill key={t} label={t} selected={pickup === t} onPress={() => setPickup(t)} />
            ))}
          </Box>
        </Box>

        <Box marginTop="m">
          <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. kurang pedas" autoCapitalize="sentences" />
        </Box>

        <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginTop="m">
          <Text variant="bodyStrong">Subtotal</Text>
          <Text variant="bodyStrong">{formatRM(subtotal)}</Text>
        </Box>
      </Sheet>

      {/* Sent confirmation */}
      <Sheet
        visible={Boolean(sent)}
        onClose={() => setSent(null)}
        title="Order sent"
        subtitle="Show this reference at the counter when you collect."
        footer={
          <>
            <KButton
              label="Open WhatsApp"
              icon="chat"
              onPress={() => sent && Linking.openURL(sent.whatsappUrl).catch(() => {})}
            />
            <KButton label="Done" variant="secondary" onPress={() => setSent(null)} />
          </>
        }
      >
        {sent ? (
          <Box alignItems="center" paddingVertical="l">
            <Text variant="heading" style={{ letterSpacing: 1 }}>
              {sent.refCode}
            </Text>
          </Box>
        ) : null}
      </Sheet>
    </Box>
  )
}

function MenuRow({
  item,
  qty,
  onAdd,
  onSub,
}: {
  item: CafeItem
  qty: number
  onAdd: () => void
  onSub: () => void
}) {
  const theme = useTheme<Theme>()
  const image = absoluteUrl(item.imageUrl)
  const soldOut = !item.isAvailable

  return (
    <Box marginTop="s">
      <Surface padded={false}>
        <Box flexDirection="row" alignItems="stretch" opacity={soldOut ? 0.6 : 1}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: 96, height: 96 }} contentFit="cover" transition={120} />
        ) : (
          <Box width={96} height={96} backgroundColor="brand50" alignItems="center" justifyContent="center">
            <Icon name="restaurant" size={26} color={theme.colors.brand600} />
          </Box>
        )}
        <Box flex={1} minWidth={0} padding="m" justifyContent="space-between">
          <Box>
            <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap="s">
              <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Text variant="bodyStrong">{formatRM(item.price)}</Text>
            </Box>
            {item.description ? (
              <Text variant="caption" numberOfLines={2} marginTop="xs">
                {item.description}
              </Text>
            ) : null}
            {item.dietary.length > 0 ? (
              <Text variant="caption" marginTop="xs" style={{ color: theme.colors.brand700 }}>
                {item.dietary.map((d) => CAFE_DIETARY_LABELS[d] ?? d).join(" · ")}
              </Text>
            ) : null}
          </Box>

          <Box flexDirection="row" alignItems="center" justifyContent="flex-end" marginTop="s">
            {soldOut ? (
              <Text variant="caption" style={{ fontWeight: "700" }}>
                Sold out
              </Text>
            ) : qty > 0 ? (
              <Box flexDirection="row" alignItems="center" gap="xs">
                <KIconButton icon="remove" label={`Remove one ${item.name}`} onPress={onSub} />
                <Text variant="bodyStrong">{qty}</Text>
                <KIconButton icon="add" label={`Add one ${item.name}`} onPress={onAdd} />
              </Box>
            ) : (
              <KButton label="Add" icon="add" variant="secondary" size="sm" fullWidth={false} onPress={onAdd} />
            )}
          </Box>
        </Box>
      </Box>
    </Surface>
    </Box>
  )
}
