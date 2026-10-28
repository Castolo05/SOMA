import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import AuthLayout from '../../components/AuthLayout'

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
    <AuthLayout>
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={42} />
        </div>

        <h1 className="font-display text-3xl font-semibold text-gray-800 dark:text-white">{content.title}</h1>
        <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">{content.description}</p>

        <Link to="/login" className="btn-patient mt-8 inline-flex items-center justify-center text-sm">
          {content.button}
        </Link>
      </div>
    </AuthLayout>
  )
}
