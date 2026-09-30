/** Roles hidden across the UI (role pickers, teams, role switch). Remove a role from this list to show it again. */
export const HIDDEN_ROLES: string[] = ['Gatekeeper'];

export const isRoleHidden = (role?: string | null): boolean =>
  !!role && HIDDEN_ROLES.includes(role.trim());

export const filterVisibleRoles = (roles: string[]): string[] =>
  roles.filter((role) => !isRoleHidden(role));

export const filterVisibleRoleRecords = <T extends { role_desc?: string | null }>(records: T[]): T[] =>
  records.filter((record) => !isRoleHidden(record.role_desc));
