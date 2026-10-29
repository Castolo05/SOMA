import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { savePendingInvite } from '../lib/pendingInvite'

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  const { search } = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-canvas)] dark:bg-[var(--theme-canvas)]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce-soft">🧠</div>
          <p className="text-gray-500 font-medium">Cargando SOMA...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Invitación abierta sin sesión: se retoma después del login.
    savePendingInvite(new URLSearchParams(search).get('codigo'))
    return <Navigate to="/login" replace />
  }
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'PATIENT' ? '/patient' : '/psych/patients'} replace />
  }

  return children
}
