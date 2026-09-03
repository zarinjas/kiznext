export type Role = "superadmin" | "admin_kiz" | "pengetua" | "ahli" | "staf";

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
