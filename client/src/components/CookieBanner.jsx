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
    <div
      role="region"
      aria-label="Uso de cookies"
      className="fixed inset-x-3 bottom-3 z-[110] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-[#c8b3b0] bg-[#fff6f0]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_18px_50px_rgba(90,75,75,0.22)] backdrop-blur-md animate-slide-up dark:border-[var(--theme-border)] dark:bg-[var(--theme-raised)] sm:inset-x-auto sm:left-5 sm:bottom-5 sm:w-[22rem]"
    >
      <p className="font-display text-base font-semibold text-gray-800 dark:text-white">Uso de cookies</p>
      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
        Usamos cookies para mantener tu sesión y, si aceptás, para medir uso y mejorar la experiencia.{' '}
        <Link to="/legal/cookies" className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700">
          Ver política
        </Link>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleChoice(false)}
          className="rounded-xl border border-[#c8b3b0] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#f9e2da] dark:border-[var(--theme-border)] dark:text-gray-200 dark:hover:bg-[var(--theme-surface)]"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={() => handleChoice(true)}
          className="rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-on-primary)] transition hover:bg-[var(--theme-primary-hover)]"
        >
          Aceptar
        </button>
      </div>
    </div>,
    document.body
  )
}
