export type Role = "superadmin" | "admin_kiz" | "pengetua" | "ahli";

export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function requireRole(userRole: Role | undefined, allowedRoles: Role[]): void {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized: insufficient permissions");
  }
}
