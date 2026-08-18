import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { PageLoading } from './Basics'
import type { Role } from '../../types'

export function ProtectedRoute({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <PageLoading label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace />
  if (!allow.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}
