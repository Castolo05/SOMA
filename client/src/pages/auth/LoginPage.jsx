import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth, OAUTH_ERROR_KEY } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { isGoogleAuthEnabled } from '../../lib/supabase'
import AuthLayout from '../../components/AuthLayout'
import { hasPendingInvite } from '../../lib/pendingInvite'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
    </svg>
  )
}

// El paciente con una invitación pendiente va directo a su perfil para confirmarla.
const homeFor = (user) => {
  if (user?.role !== 'PATIENT') return '/psych/patients'
  return hasPendingInvite() ? '/patient/profile' : '/patient'
}

export default function LoginPage() {
  usePageTitle('Iniciar sesión')
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [trustDevice, setTrustDevice] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      navigate(homeFor(user), { replace: true })
    }
  }, [authLoading, navigate, user])

  useEffect(() => {
    // En la app de Android el regreso desde Google necesita un deep link propio.
    if (Capacitor.isNativePlatform()) return
    let active = true
    isGoogleAuthEnabled().then((enabled) => { if (active) setGoogleEnabled(enabled) })
    try {
      if (sessionStorage.getItem(OAUTH_ERROR_KEY)) {
        sessionStorage.removeItem(OAUTH_ERROR_KEY)
        setError('No se completó el inicio de sesión con Google. Intentá de nuevo.')
      }
    } catch {}
    return () => { active = false }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password, trustDevice)
      navigate(homeFor(user), { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle(trustDevice)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión con Google.')
      setGoogleLoading(false)
    }
  }

  const busy = loading || googleLoading

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-semibold text-gray-800 dark:text-white">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Qué bueno verte de nuevo.</p>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in short:mt-4">
          {error}
        </div>
      )}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#c8b3b0] bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 short:mt-5 short:py-2.5 dark:border-[var(--theme-border)] dark:bg-[var(--theme-canvas)] dark:text-gray-100 dark:hover:bg-[var(--theme-accent)]"
          >
            {googleLoading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              : <GoogleIcon />}
            Continuar con Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400 short:my-4">
            <span className="h-px flex-1 bg-[#c8b3b0]/70 dark:bg-[var(--theme-border)]" />
            o con tu email
            <span className="h-px flex-1 bg-[#c8b3b0]/70 dark:bg-[var(--theme-border)]" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 short:space-y-3 ${googleEnabled ? '' : 'mt-6 short:mt-5'}`}>
        <div>
          <label htmlFor="login-email" className="label">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            className="input short:!py-2.5"
            placeholder="tu@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="login-password" className="label">Contraseña</label>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              ¿La olvidaste?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPass ? 'text' : 'password'}
              className="input pr-12 short:!py-2.5"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 transition-colors hover:text-gray-600"
              aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
          />
          Mantener la sesión iniciada en este dispositivo
        </label>

        <button
          id="login-submit"
          type="submit"
          className="btn-patient flex w-full items-center justify-center gap-2 short:!py-3"
          disabled={busy}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Entrando...
            </span>
          ) : (
            <>Entrar <ArrowRight size={16} /></>
          )}
        </button>
      </form>

      {googleEnabled && (
        <p className="mt-4 text-center text-xs leading-relaxed text-gray-500 short:mt-3 dark:text-gray-400">
          Si es tu primera vez con Google, se crea una cuenta de paciente y aceptás los{' '}
          <Link to="/legal/terms" className="underline hover:text-brand-600">Términos</Link> y la{' '}
          <Link to="/legal/privacy-policy" className="underline hover:text-brand-600">Política de privacidad</Link>.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-gray-600 short:mt-4 dark:text-gray-300">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Creá una
        </Link>
      </p>
    </AuthLayout>
  )
}
