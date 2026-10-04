import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserRound, Stethoscope } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import ThemeLogo from '../../components/ThemeLogo'

const SPECIALIZATIONS = [
  'Psicólogo/a',
  'Psiquiatra',
  'Pediatra',
  'Psicopedagogo/a',
  'Terapeuta ocupacional',
  'Fonoaudiólogo/a',
  'Trabajador/a social',
  'Otro/a profesional de salud',
]

export default function RegisterPage() {
  usePageTitle('Crear cuenta')
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    role: 'PATIENT',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const today = new Date()
  const maxBirthDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.role === 'PSYCHOLOGIST' && form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const name = form.role === 'PSYCHOLOGIST'
        ? `${form.firstName.trim()} ${form.lastName.trim()}`
        : form.name.trim()
      const user = await register({
        name,
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...(form.role === 'PSYCHOLOGIST' && {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          birthDate: form.birthDate,
          phone: form.phone.trim(),
          specialization: form.specialization,
        }),
      })
      navigate(user.role === 'PATIENT' ? '/patient' : '/psych/patients', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f2c6b6] p-4 py-8 dark:bg-[var(--theme-canvas)]">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(47,135,110,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(47,135,110,0.06)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden="true" />
      <div className="relative w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-gray-100 shadow-lg">
            <ThemeLogo alt="SOMA Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">SOMA</h1>
          <p className="mt-1 text-gray-500">Crea tu cuenta gratuita</p>
        </div>

        <div className="rounded-3xl border border-[#c8b3b0] bg-[#f9e2da] p-8 shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)]">
          <h2 className="mb-6 text-xl font-bold text-gray-800">Registrarse</h2>

          {error && (
            <div id="register-error" role="alert" className="mb-4 animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <fieldset className="mb-5">
            <legend className="label">Soy...</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={form.role === 'PATIENT'}
                disabled={loading}
                onClick={() => setForm((current) => ({ ...current, role: 'PATIENT' }))}
                className={`flex min-h-11 flex-col items-center rounded-2xl border-2 p-4 transition-all duration-200 ${
                  form.role === 'PATIENT'
                    ? 'border-sage-300 bg-sage-50 text-sage-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <UserRound size={28} className="mb-1" />
                <span className="text-sm font-semibold">Paciente</span>
              </button>
              <button
                type="button"
                aria-pressed={form.role === 'PSYCHOLOGIST'}
                disabled={loading}
                onClick={() => setForm((current) => ({ ...current, role: 'PSYCHOLOGIST' }))}
                className={`flex min-h-11 flex-col items-center rounded-2xl border-2 p-4 transition-all duration-200 ${
                  form.role === 'PSYCHOLOGIST'
                    ? 'border-sage-300 bg-sage-50 text-sage-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Stethoscope size={28} className="mb-1" />
                <span className="text-sm font-semibold">Profesional de salud</span>
              </button>
            </div>
          </fieldset>

          <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'register-error' : undefined}>
            {form.role === 'PSYCHOLOGIST' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first-name" className="label">Nombre</label>
                    <input
                      id="first-name"
                      type="text"
                      autoComplete="given-name"
                      className="input"
                      placeholder="Tu nombre"
                      value={form.firstName}
                      onChange={updateField('firstName')}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="label">Apellido</label>
                    <input
                      id="last-name"
                      type="text"
                      autoComplete="family-name"
                      className="input"
                      placeholder="Tu apellido"
                      value={form.lastName}
                      onChange={updateField('lastName')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="birth-date" className="label">Fecha de nacimiento</label>
                  <input
                    id="birth-date"
                    type="date"
                    autoComplete="bday"
                    max={maxBirthDate}
                    className="input"
                    value={form.birthDate}
                    onChange={updateField('birthDate')}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="label">Número de teléfono</label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    className="input"
                    placeholder="+54 11 1234 5678"
                    value={form.phone}
                    onChange={updateField('phone')}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="specialization" className="label">Área de especialización</label>
                  <select
                    id="specialization"
                    className="input"
                    value={form.specialization}
                    onChange={updateField('specialization')}
                    required
                  >
                    <option value="" disabled>Seleccioná tu profesión</option>
                    {SPECIALIZATIONS.map((specialization) => (
                      <option key={specialization} value={specialization}>{specialization}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="name" className="label">Nombre completo</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  className="input"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={updateField('name')}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="tu@email.com"
                value={form.email}
                onChange={updateField('email')}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Contraseña (mín. 6 caracteres)</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField('password')}
                required
                minLength={6}
              />
            </div>
            {form.role === 'PSYCHOLOGIST' && (
              <div>
                <label htmlFor="confirm-password" className="label">Confirmar contraseña</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  placeholder="Volvé a escribir tu contraseña"
                  value={form.confirmPassword}
                  onChange={updateField('confirmPassword')}
                  required
                  minLength={6}
                />
              </div>
            )}

            <button type="submit" className="btn-patient mt-2 w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-sage-500 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
