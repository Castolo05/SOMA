import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { setCookiePreferences, initAnalytics } from '../lib/analytics'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  // El banner se monta dentro de AuthProvider, cuando supabase-js ya sacó los
  // tokens de la URL: recién ahí puede cargarse Analytics.
  useEffect(() => {
    initAnalytics()
    setVisible(!localStorage.getItem('soma-cookie-preferences'))
  }, [])

  const handleChoice = (allowAnalytics) => {
    const preferences = setCookiePreferences({ analytics: allowAnalytics })
    setVisible(false)

    if (preferences.analytics) {
      initAnalytics()
    }
  }

  if (!visible) return null

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[110] max-h-[100dvh] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-200">
          <p className="font-semibold text-gray-900 dark:text-white">Uso de cookies</p>
          <p>
            Usamos cookies para mantener tu sesión y, si aceptás, para medir uso y mejorar la experiencia. Podés ver la política completa en{' '}
            <Link to="/legal/cookies" className="font-semibold text-sage-600 underline underline-offset-2 hover:text-sage-700">
              Política de cookies
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => handleChoice(false)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => handleChoice(true)}
            className="rounded-xl bg-sage-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-600"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
