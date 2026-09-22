import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import type { ComponentProps } from "react"
import type { ColorValue } from "react-native"

type Glyph = ComponentProps<typeof MaterialIcons>["name"]

/**
 * The web app uses Material Symbols Rounded names (snake_case). React Native's
 * `@expo/vector-icons` ships MaterialIcons (hyphenated, slightly different set),
 * so this map translates between them. Add an entry whenever a new icon is
 * introduced; unmapped names fall back to a neutral glyph rather than crashing.
 */
const GLYPHS: Record<string, Glyph> = {
  dashboard: "dashboard",
  campaign: "campaign",
  menu_book: "menu-book",
  bedroom_parent: "king-bed",
  how_to_reg: "how-to-reg",
  meeting_room: "meeting-room",
  hotel: "hotel",
  hotel_class: "hotel-class",
  calendar_month: "calendar-month",
  support_agent: "support-agent",
  search: "search",
  domain: "domain",
  view_in_ar: "view-in-ar",
  forum: "forum",
  qr_code_2: "qr-code-2",
  person: "person",
  task_alt: "task-alt",
  inbox: "inbox",
  event: "event",
  widgets: "widgets",
  link: "link",
  apartment: "apartment",
  smart_toy: "smart-toy",
  quiz: "quiz",
  manage_accounts: "manage-accounts",
  mail: "mail",
  settings: "settings",
  chevron_right: "chevron-right",
  chevron_left: "chevron-left",
  notifications: "notifications",
  notification_important: "notification-important",
  logout: "logout",
  edit: "edit",
  photo_camera: "photo-camera",
  refresh: "refresh",
  lock: "lock",
  badge: "badge",
  school: "school",
  sports_soccer: "sports-soccer",
  error_outline: "error-outline",
  check_circle: "check-circle",
  info_outline: "info-outline",
  open_in_new: "open-in-new",
  push_pin: "push-pin",
  attachment: "attachment",
  send: "send",
  reply: "reply",
  assignment: "assignment",
  swap_horiz: "swap-horiz",
  handyman: "handyman",
  event_available: "event-available",
  cleaning_services: "cleaning-services",
  wifi: "wifi",
  security: "security",
  payments: "payments",
  favorite: "favorite",
  help: "help",
  close: "close",
  add: "add",
  search_off: "search-off",
  volunteer_activism: "volunteer-activism",
  admin_panel_settings: "admin-panel-settings",
  door_front: "door-front",
  theater_comedy: "theater-comedy",
  co_present: "co-present",
  navigation: "navigation",
  near_me: "near-me",
  my_location: "my-location",
  directions: "directions",
  explore: "explore",
  place: "place",
  gps_fixed: "gps-fixed",
  compass_calibration: "explore",
  sos: "sos",
  call: "call",
  bedtime: "bedtime",
  translate: "translate",
  document_scanner: "document-scanner",
  auto_awesome: "auto-awesome",
  local_laundry_service: "local-laundry-service",
  timer: "timer",
  timer_off: "timer-off",
  block: "block",
  radio_button_unchecked: "radio-button-unchecked",
  history: "history",
  check: "check",
  arrow_forward: "arrow-forward",
  info: "info",
  fingerprint: "fingerprint",
  volume_up: "volume-up",
  account_balance_wallet: "account-balance-wallet",
}

export interface IconProps {
  name: string
  size?: number
  color?: ColorValue
}

export function Icon({ name, size = 22, color }: IconProps) {
  const glyph = GLYPHS[name] ?? "circle"
  return <MaterialIcons name={glyph} size={size} color={color} />
}
