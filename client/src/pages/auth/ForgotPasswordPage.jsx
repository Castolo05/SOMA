import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePageTitle } from '../../hooks/usePageTitle'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

export default function ForgotPasswordPage() {
  usePageTitle('Recuperar contraseña')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    setError('')
    setLoading(true)

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password?recovery=1`,
      })

      if (err) {
        throw err
      }

      setEmail(normalizedEmail)
      setSent(true)
    } catch (err) {
      const message = err?.message || 'Error al enviar el email. Verifica que la dirección sea correcta.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {!sent ? (
        <>
          <h1 className="mb-2 font-display text-2xl font-semibold text-gray-800 dark:text-white">Recuperar contraseña</h1>
          <p className="text-gray-500 text-sm mb-6">
            Te enviaremos un link para restablecer tu contraseña.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <input
                  type="email"
                  className="input pl-11"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              className="btn-patient w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : 'Enviar link de recuperación'}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-4 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-semibold text-gray-800 dark:text-white">¡Email enviado!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Revisá tu bandeja de entrada en <strong className="break-all">{email}</strong> y seguí el link para restablecer tu contraseña.
          </p>
          <p className="text-xs text-gray-400">
            ¿No llegó? Revisá la carpeta de spam.
          </p>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthLayout>
  )
}
