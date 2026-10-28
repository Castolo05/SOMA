import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { clearPasswordRecovery, isPasswordRecoveryPending, supabase } from '../../lib/supabase'
import { usePageTitle } from '../../hooks/usePageTitle'
import AuthLayout from '../../components/AuthLayout'

function getRecoveryParams() {
  const params = new URLSearchParams(window.location.search)
  new URLSearchParams(window.location.hash.slice(1)).forEach((value, key) => params.set(key, value))
  return {
    code: params.get('code'),
    type: params.get('type'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  }
}

export default function ResetPasswordPage() {
  usePageTitle('Restablecer contraseña')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(true)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // Se leen una sola vez: el efecto borra los tokens de la URL para que no
  // queden en el historial ni lleguen a Analytics.
  const [recoveryParams] = useState(getRecoveryParams)

  useEffect(() => {
    window.history.replaceState(null, '', '/reset-password')

    const recoverSession = async () => {
      const { code, type, accessToken, refreshToken } = recoveryParams
      const hasRecoveryCode = Boolean(code) && (!type || type === 'recovery')
      const hasRecoveryTokens = type === 'recovery' && accessToken && refreshToken
      if (!hasRecoveryCode && !hasRecoveryTokens && isPasswordRecoveryPending()) {
        // supabase-js ya procesó el enlace al cargar la página.
        clearPasswordRecovery()
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setRecoveryReady(true)
          setCheckingRecovery(false)
          return
        }
      }
      if (!hasRecoveryCode && !hasRecoveryTokens) {
        setError('El enlace de recuperación no es válido o ya expiró. Solicitá uno nuevo.')
        setCheckingRecovery(false)
        return
      }

      try {
        const result = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

        if (result.error) {
          throw result.error
        }
        if (!result.data.session) {
          throw new Error('Supabase no devolvió una sesión de recuperación.')
        }
        setRecoveryReady(true)
      } catch {
        setError('El enlace de recuperación no es válido o ya expiró. Solicitá uno nuevo.')
      } finally {
        setCheckingRecovery(false)
      }
    }

    recoverSession()
  }, [recoveryParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!recoveryReady) {
      setError('Abrí el enlace enviado por correo para autorizar el cambio de contraseña.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {!success ? (
        <>
          <h1 className="mb-2 font-display text-2xl font-semibold text-gray-800 dark:text-white">Restablecer contraseña</h1>
          <p className="text-gray-500 text-sm mb-6">
            Elegí una nueva contraseña para continuar con tu sesión.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {checkingRecovery ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-4 py-3 text-sm text-gray-600">
              <span className="w-4 h-4 border-2 border-brand-500/40 border-t-brand-500 rounded-full animate-spin" />
              Validando enlace de recuperación...
            </div>
          ) : recoveryReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Repetir contraseña</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button type="submit" className="btn-patient w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : 'Guardar contraseña'}
              </button>
            </form>
          ) : (
            <Link
              to="/forgot-password"
              className="btn-patient flex w-full items-center justify-center"
            >
              Solicitar un nuevo enlace
            </Link>
          )}
        </>
      ) : (
        <div className="text-center py-4 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-semibold text-gray-800 dark:text-white">¡Listo!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Tu contraseña se actualizó correctamente.
          </p>
          <Link
            to="/login"
            className="btn-patient inline-flex items-center justify-center text-sm"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>
      </div>
    </AuthLayout>
  )
}
