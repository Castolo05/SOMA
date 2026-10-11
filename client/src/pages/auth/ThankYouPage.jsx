import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function ThankYouPage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const type = params.get('type') || 'general'

  usePageTitle(type === 'register' ? 'Cuenta creada' : type === 'reset' ? 'Contraseña actualizada' : '¡Listo!')

  const content = {
    register: {
      title: '¡Cuenta creada con éxito!',
      description: 'Tu cuenta ya quedó registrada en SOMA. Ahora podés iniciar sesión y empezar a cuidar tu bienestar emocional.',
      button: 'Ir a iniciar sesión',
    },
    reset: {
      title: '¡Contraseña actualizada!',
      description: 'Tu contraseña fue cambiada correctamente. Ya podés volver a entrar con tus nuevas credenciales.',
      button: 'Volver a iniciar sesión',
    },
    general: {
      title: '¡Todo listo!',
      description: 'La acción se completó correctamente. Podés seguir navegando en SOMA.',
      button: 'Volver a SOMA',
    },
  }[type] || {
    title: '¡Todo listo!',
    description: 'La acción se completó correctamente.',
    button: 'Volver a SOMA',
  }

  return (
    <div className="min-h-screen bg-[#f2c6b6] px-4 py-10 dark:bg-[var(--theme-canvas)]">
      <div className="mx-auto max-w-xl rounded-[32px] border border-[#c8b3b0] bg-[#f9e2da] p-8 text-center shadow-[0_18px_60px_rgba(90,75,75,0.18)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)]">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={42} />
        </div>

        <h1 className="text-3xl font-black text-gray-800 dark:text-white">{content.title}</h1>
        <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">{content.description}</p>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-sage-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600"
        >
          {content.button}
        </Link>
      </div>
    </div>
  )
}
