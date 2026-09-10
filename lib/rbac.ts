export type Role = "superadmin" | "admin_kiz" | "pengetua" | "fellow" | "ahli" | "staf";

/** Member roles (resident-style home + community features, no urus-*). */
export const MEMBER_ROLES: Role[] = ["ahli", "staf", "fellow"];

export function isMemberRole(role: Role | undefined): boolean {
  return role !== undefined && MEMBER_ROLES.includes(role);
}

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
