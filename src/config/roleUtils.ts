const ROLE_PRIORITY: Record<string, number> = {
  Reconciler: 1,
  Gatekeeper: 2,
  Counter: 3,
  Checker: 4,
};

export const parseUserRoles = (): string[] => {
  const raw = localStorage.getItem('User Roles') || '';
  return raw.split(',').map((role) => role.trim()).filter(Boolean);
};

export const orderRoles = (roles: string[]): string[] =>
  [...roles].sort((a, b) => {
    const aPriority = ROLE_PRIORITY[a] ?? 99;
    const bPriority = ROLE_PRIORITY[b] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.localeCompare(b);
  });

export const getDefaultRouteForRole = (role: string): string => {
  switch (role) {
    case 'Reconciler':
      return '/dashboard';
    case 'Gatekeeper':
      return '/adjustment-records';
    case 'Counter':
      return '/counter';
    case 'Checker':
      return '/checker';
    default:
      return '/dashboard';
  }
};
