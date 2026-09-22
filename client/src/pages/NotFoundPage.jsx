import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Página no encontrada')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8ef] dark:bg-[#0d1728] p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(47,135,110,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(47,135,110,0.06)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden="true" />
      <div className="w-full max-w-sm text-center animate-fade-in">
        {/* Número 404 grande */}
        <div className="relative mb-6">
          <p
            className="text-[120px] font-black leading-none select-none"
            style={{
              background: 'linear-gradient(135deg, var(--color-sage-300, #a3b899) 0%, var(--color-lavender-300, #b5a8d0) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </p>
        </div>

        {/* Texto */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Página no encontrada
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
          El enlace que seguiste no existe o fue movido.
          <br />
          Volvé al inicio y seguí desde ahí.
        </p>

        {/* Botón */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all
            bg-sage-500 hover:bg-sage-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
          style={{ backgroundColor: 'var(--color-sage-500, #7a9c6e)' }}
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
