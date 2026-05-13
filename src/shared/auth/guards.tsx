import { Navigate, Outlet } from 'react-router-dom'

import type { UserRole } from '../api/types'
import { hasPermission, type PermissionCode } from '../rbac/permissions'
import { useAuthStore } from './auth-store'

export function AuthGuard() {
  const accessToken = useAuthStore((state) => state.accessToken)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function RoleGuard({ roles }: { roles: UserRole[] }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function PermissionGuard({ permission }: { permission: PermissionCode }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!hasPermission(user.role, permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
