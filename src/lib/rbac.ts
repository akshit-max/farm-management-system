import { Session } from "next-auth";

export const ROLES = {
  OWNER: "Owner",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  WORKER: "Worker",
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

export function hasRole(session: Session | null, allowedRoles: RoleType[]): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role as RoleType);
}

export function isOwner(session: Session | null): boolean {
  return hasRole(session, [ROLES.OWNER]);
}

export function isManager(session: Session | null): boolean {
  return hasRole(session, [ROLES.OWNER, ROLES.MANAGER]);
}

export function isAccountant(session: Session | null): boolean {
  return hasRole(session, [ROLES.OWNER, ROLES.ACCOUNTANT]);
}

export function isWorker(session: Session | null): boolean {
  return hasRole(session, Object.values(ROLES));
}
