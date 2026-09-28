export type Role = "superadmin" | "admin_kiz" | "pengetua" | "fellow" | "ahli" | "staf" | "kafe";

/** Member roles (resident-style home + community features, no urus-*). */
export const MEMBER_ROLES: Role[] = ["ahli", "staf", "fellow"]

export function isMemberRole(role: Role | undefined): boolean {
  return role !== undefined && MEMBER_ROLES.includes(role)
}

/** Full admins — can manage every `urus-*` surface. */
export const ADMIN_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/**
 * Office support desk — answers and closes helpdesk tickets. Staff and fellows
 * are members who also sit on the support desk, so they reach the admin inbox.
 */
export const SUPPORT_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua", "staf", "fellow"]

/** Guest-house admin — approve bookings and configure the houses. */
export const GUEST_HOUSE_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/** Accommodation / check-in management. */
export const RESIDENCE_MANAGE_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua", "staf"]
export const RESIDENCE_VIEW_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua", "staf"]

/** Laundry machines — admins manage. Students use the member page. */
export const LAUNDRY_MANAGE_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]
export const LAUNDRY_VIEW_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/** Analytics / reports. */
export const REPORT_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/** KIZ Cafe smart ordering — admins + the dedicated cafe operator. */
export const CAFE_MANAGE_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua", "kafe"]

/** The cafe operator role — cafe surfaces only. */
export const CAFE_OPERATOR_ROLES: Role[] = ["kafe"]

/**
 * Broadcast push notifications — admins plus the principal. The deputy
 * principal shares the `pengetua` role (only `position` differs), so this
 * covers both offices.
 */
export const NOTIFICATION_SEND_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/** Self-service registration lifecycle. See `prisma/schema.prisma` `AccountStatus`. */
export type AccountStatus = "unverified" | "pending" | "active";

export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function requireRole(userRole: Role | undefined, allowedRoles: Role[]): void {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: insufficient permissions");
  }
}

/**
 * Office held within the `pengetua` role. The position only changes the label
 * shown on the Digital Resident ID — permissions are identical either way.
 */
export type PengetuaPosition = "pengetua" | "timbalan_pengetua";

export const PENGETUA_POSITION_LABELS: Record<PengetuaPosition, string> = {
  pengetua: "Pengetua",
  timbalan_pengetua: "Timbalan Pengetua",
};

/** Label for a stored position value. Only the deputy overrides the role
 *  label — a plain "pengetua" falls back to the role's own label. */
export function positionLabel(position: string | null | undefined): string | null {
  if (position === "timbalan_pengetua") return PENGETUA_POSITION_LABELS.timbalan_pengetua;
  return null;
}
