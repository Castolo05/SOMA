import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserRound, Stethoscope } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function RegisterPage() {
  usePageTitle('Crear cuenta')
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PATIENT' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password, form.role)
      navigate(user.role === 'PATIENT' ? '/patient' : '/psych', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 via-white to-lavender-100 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-lg mb-4 overflow-hidden border border-gray-100">
            <img src="/logo.png" alt="SOMA Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">SOMA</h1>
          <p className="text-gray-500 mt-1">Crea tu cuenta gratuita</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Registrarse</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Selector de rol */}
          <div className="mb-5">
            <label className="label">Soy...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'PATIENT' })}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                  form.role === 'PATIENT'
                    ? 'border-sage-300 bg-sage-50 text-sage-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <UserRound size={28} className="mb-1" />
                <span className="font-semibold text-sm">Paciente</span>
              </button>
              <button
                type="button"
                disabled
                className="flex cursor-not-allowed flex-col items-center rounded-2xl border-2 border-gray-200 bg-gray-100 p-4 text-gray-400 opacity-60 transition-all duration-200"
                aria-label="Registro de psicólogo no disponible aún"
                title="Próximamente"
              >
                <Stethoscope size={28} className="mb-1" />
                <span className="font-semibold text-sm">Psicólogo/a</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                type="text"
                className="input"
                placeholder="Tu nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Contraseña (mín. 6 caracteres)</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-patient w-full mt-2" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-sage-500 font-semibold hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
