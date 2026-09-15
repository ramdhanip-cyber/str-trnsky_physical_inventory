import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { getDefaultRouteForRole } from '../config/roleUtils';

type RoleGuardProps = {
  allowedRoles: string[];
  children: ReactElement;
};

/** Restrict a route to specific Selected Role values. */
export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const role = localStorage.getItem('Selected Role') || '';
  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }
  return children;
}
