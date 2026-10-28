import { Link } from 'react-router-dom'
import { LineChart, Lock, UserRoundCheck } from 'lucide-react'
import ThemeLogo from './ThemeLogo'

const HIGHLIGHTS = [
  { icon: LineChart, text: 'Registrá tu ánimo y tus hábitos y mirá tu evolución.' },
  { icon: UserRoundCheck, text: 'Compartí tu proceso solo con el profesional que vos elijas.' },
  { icon: Lock, text: 'Tus registros son privados y viajan cifrados.' },
]

// Layout compartido de login y registro. En escritorio ocupa exactamente la
// altura de la ventana: el panel de marca queda fijo y, si el formulario no
// entra en monitores muy bajos, solo se desplaza su columna.
export default function AuthLayout({ children, maxWidth = 'max-w-md', showFooter = true }) {
  return (
    <div className="min-h-screen bg-[#f2c6b6] dark:bg-[var(--theme-canvas)] lg:grid lg:h-dvh lg:grid-cols-[1.05fr_1fr] lg:overflow-hidden">
      {/* Panel de marca (escritorio) */}
      <aside className="relative hidden overflow-hidden bg-[#5a4b4b] p-12 text-white short:p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f2c6b6]/15 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#e8a87c]/20 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-2xl bg-[#f9e2da]">
            <ThemeLogo alt="" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-xl font-semibold tracking-wide">SOMA</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Tu bienestar, acompañado entre sesiones.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-white/85">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon size={16} />
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          SOMA no reemplaza la atención profesional ni es un servicio de emergencias.
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 short:sm:py-3 lg:min-h-0 lg:items-start lg:overflow-y-auto">
        <div className={`w-full ${maxWidth} animate-fade-in lg:my-auto`}>
          <div className="mb-8 text-center short:mb-5 lg:hidden">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-[#c8b3b0] shadow-lg short:mb-2 short:h-12 short:w-12">
              <ThemeLogo alt="SOMA" className="h-full w-full object-contain" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">Tu espacio seguro de bienestar mental</p>
          </div>

          <div className="rounded-3xl border border-[#c8b3b0] bg-[#f9e2da] p-6 shadow-[0_18px_60px_rgba(90,75,75,0.18)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)] sm:p-8 short:sm:p-6">
            {children}
          </div>

          {showFooter && (
            <footer className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600 short:mt-3 dark:text-gray-400">
              <Link to="/legal/privacy-policy" className="hover:underline">Privacidad</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/terms" className="hover:underline">Términos</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/cookies" className="hover:underline">Cookies</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/contact" className="hover:underline">Contacto</Link>
            </footer>
          )}
        </div>
      </main>
    </div>
  )
}
