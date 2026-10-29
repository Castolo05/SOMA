import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserRound, Stethoscope } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import AuthLayout from '../../components/AuthLayout'

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

const TERMS_VERSION = '2026-10-11'

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
    acceptedTerms: false,
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
        acceptedTerms: form.acceptedTerms,
        termsVersion: TERMS_VERSION,
        ...(form.role === 'PSYCHOLOGIST' && {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          birthDate: form.birthDate,
          phone: form.phone.trim(),
          specialization: form.specialization,
        }),
      })
      navigate(user?.role ? (user.role === 'PATIENT' ? '/patient' : '/psych/patients') : '/thank-you?type=register', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  const isPsych = form.role === 'PSYCHOLOGIST'
  const roleButtonClass = (active) => `flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition-all duration-200 ${
    active
      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)] shadow-md dark:border-brand-300 dark:bg-brand-300/15 dark:text-brand-200'
      : 'border-[var(--theme-border)] text-gray-500 hover:border-[var(--theme-primary)] dark:border-[var(--theme-border)]'
  }`

  return (
    <AuthLayout maxWidth={isPsych ? 'max-w-xl' : 'max-w-md'} showFooter={false}>
      <h1 className="font-display text-2xl font-semibold text-gray-800 dark:text-white">Crear cuenta</h1>
      <p className="mt-1 text-sm text-gray-500 short:hidden dark:text-gray-400">Es gratis y te lleva un minuto.</p>

      {error && (
        <div id="register-error" role="alert" className="mt-5 animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 short:mt-4">
          {error}
        </div>
      )}

      <fieldset className="mt-5 short:mt-4">
        <legend className="sr-only">Soy...</legend>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={!isPsych}
            disabled={loading}
            onClick={() => setForm((current) => ({ ...current, role: 'PATIENT' }))}
            className={roleButtonClass(!isPsych)}
          >
            <UserRound size={20} className="shrink-0" />
            <span className="text-sm font-semibold">Paciente</span>
          </button>
          <button
            type="button"
            aria-pressed={isPsych}
            disabled={loading}
            onClick={() => setForm((current) => ({ ...current, role: 'PSYCHOLOGIST' }))}
            className={roleButtonClass(isPsych)}
          >
            <Stethoscope size={20} className="shrink-0" />
            <span className="text-sm font-semibold">Profesional de salud</span>
          </button>
        </div>
      </fieldset>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 short:space-y-3" aria-describedby={error ? 'register-error' : undefined}>
        {isPsych ? (
          <>
            <div className="grid gap-4 short:gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="label">Nombre</label>
                <input
                  id="first-name"
                  type="text"
                  autoComplete="given-name"
                  className="input short:!py-2.5"
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
                  className="input short:!py-2.5"
                  placeholder="Tu apellido"
                  value={form.lastName}
                  onChange={updateField('lastName')}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 short:gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="birth-date" className="label">Fecha de nacimiento</label>
                <input
                  id="birth-date"
                  type="date"
                  autoComplete="bday"
                  max={maxBirthDate}
                  className="input short:!py-2.5"
                  value={form.birthDate}
                  onChange={updateField('birthDate')}
                  required
                />
              </div>
              <div>
                <label htmlFor="specialization" className="label">Especialización</label>
                <select
                  id="specialization"
                  className="input short:!py-2.5"
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
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="name" className="label">Nombre completo</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="input short:!py-2.5"
              placeholder="Tu nombre"
              value={form.name}
              onChange={updateField('name')}
              required
            />
          </div>
        )}

        <div className={isPsych ? 'grid gap-4 short:gap-3 sm:grid-cols-2' : ''}>
          <div>
            <label htmlFor="email" className="label">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input short:!py-2.5"
              placeholder="tu@email.com"
              value={form.email}
              onChange={updateField('email')}
              required
            />
          </div>
          {isPsych && (
            <div>
              <label htmlFor="phone" className="label">Teléfono</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className="input short:!py-2.5"
                placeholder="+54 11 1234 5678"
                value={form.phone}
                onChange={updateField('phone')}
                required
              />
            </div>
          )}
        </div>

        <div className={isPsych ? 'grid gap-4 short:gap-3 sm:grid-cols-2' : ''}>
          <div>
            <label htmlFor="password" className="label">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="input short:!py-2.5"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={updateField('password')}
              required
              minLength={6}
            />
          </div>
          {isPsych && (
            <div>
              <label htmlFor="confirm-password" className="label">Confirmar contraseña</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="input short:!py-2.5"
                placeholder="Repetila"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                required
                minLength={6}
              />
            </div>
          )}
        </div>

        <label htmlFor="accept-terms" className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
          <input
            id="accept-terms"
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            checked={form.acceptedTerms}
            onChange={(event) => setForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
            required
            disabled={loading}
            aria-describedby={error ? 'register-error' : undefined}
          />
          <span>
            Leí y acepto los{' '}
            <Link
              to="/legal/terms"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
            >
              Términos y Condiciones
            </Link>
            {' '}y la{' '}
            <Link
              to="/legal/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
            >
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

        <button type="submit" className="btn-patient flex w-full items-center justify-center gap-2 short:!py-3" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 short:mt-4 dark:text-gray-300">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
