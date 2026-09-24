export type Role = "superadmin" | "admin_kiz" | "pengetua" | "fellow" | "ahli" | "staf"

/** Member roles (resident-style home + community features, no urus-*). */
export const MEMBER_ROLES: Role[] = ["ahli", "staf", "fellow"]

export function isMemberRole(role: Role | undefined): boolean {
  return role !== undefined && MEMBER_ROLES.includes(role)
}

/** Full admins — can manage every `urus-*` surface. */
export const ADMIN_ROLES: Role[] = ["superadmin", "admin_kiz"]

/**
 * Office support desk — answers and closes helpdesk tickets. Staff and fellows
 * are members who also sit on the support desk, so they reach the admin inbox.
 */
export const SUPPORT_ROLES: Role[] = ["superadmin", "admin_kiz", "staf", "fellow"]

/** Guest-house admin — approve bookings and configure the houses. */
export const GUEST_HOUSE_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/** Accommodation / check-in management — staff manage, pengetua reads. */
export const RESIDENCE_MANAGE_ROLES: Role[] = ["superadmin", "admin_kiz", "staf"]
export const RESIDENCE_VIEW_ROLES: Role[] = ["superadmin", "admin_kiz", "staf", "pengetua"]

/**
 * Broadcast push notifications — admins plus the principal. The deputy
 * principal shares the `pengetua` role (only `position` differs), so this
 * covers both offices.
 */
export const NOTIFICATION_SEND_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua"]

/** Self-service registration lifecycle. */
export type AccountStatus = "unverified" | "pending" | "active"

export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}

export function requireRole(userRole: Role | undefined, allowedRoles: Role[]): void {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: insufficient permissions")
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin_kiz: "Admin KIZ",
  pengetua: "Principal",
  fellow: "Fellow",
  ahli: "Student",
  staf: "Staff",
}

export const ROLE_OVERLINES: Record<Role, string> = {
  superadmin: "College operations",
  admin_kiz: "College operations",
  pengetua: "Principal view · read only",
  fellow: "Fellow",
  ahli: "Resident",
  staf: "Staff",
}
