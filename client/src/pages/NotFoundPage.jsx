import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Página no encontrada')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-canvas)] dark:bg-[var(--theme-canvas)] p-4 relative overflow-hidden">
      <div className="w-full max-w-sm text-center animate-fade-in">
        {/* Número 404 grande */}
        <div className="relative mb-6">
          <p
            className="text-[120px] font-bold leading-none select-none"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-300)) 0%, rgb(var(--brand-600)) 100%)',
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
            bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
