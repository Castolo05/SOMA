import { Link } from 'react-router-dom'
import { LineChart, Lock, UserRoundCheck } from 'lucide-react'
import ThemeLogo from './ThemeLogo'
import Wordmark from './Wordmark'

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
    <div className="min-h-screen bg-[var(--theme-canvas)] dark:bg-[var(--theme-canvas)] lg:grid lg:h-dvh lg:grid-cols-[1.05fr_1fr] lg:overflow-hidden">
      {/* Panel de marca (escritorio) */}
      <aside className="relative hidden overflow-hidden bg-[#3f2519] dark:bg-[#0b0e16] p-12 text-[#f7e6da] short:p-10 lg:flex lg:flex-col lg:justify-between">
        {/* La figura del logo, grande y recortada por el borde: el único gesto decorativo */}
        <img
          src="/logo-light.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-28 w-[440px] max-w-none opacity-90 short:w-[360px]"
        />

        <Wordmark className="relative h-[22px] self-start text-[#f7e6da]" />

        <div className="relative max-w-sm">
          <h2 className="font-display text-[2.6rem] font-bold leading-[1.1] text-balance">
            Tu bienestar, acompañado entre sesiones.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[#f7e6da]/85">
                <Icon size={18} className="mt-0.5 shrink-0 text-[#fbc069]" />
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative max-w-[18rem] text-sm text-[#f7e6da]/60">
          SOMA no reemplaza la atención profesional ni es un servicio de emergencias.
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 short:sm:py-3 lg:min-h-0 lg:items-start lg:overflow-y-auto">
        <div className={`w-full ${maxWidth} animate-fade-in lg:my-auto`}>
          <div className="mb-8 flex flex-col items-center text-center short:mb-5 lg:hidden">
            <ThemeLogo alt="" className="mb-3 h-16 w-16 short:mb-2 short:h-12 short:w-12" />
            <Wordmark className="h-[18px] text-[var(--theme-wordmark)]" />
            <p className="mt-3 text-gray-600 dark:text-gray-300">Tu espacio seguro de bienestar mental</p>
          </div>

          <div className="rounded-[22px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-[0_1px_2px_var(--theme-shadow),0_12px_32px_-16px_var(--theme-shadow)] sm:p-8 short:sm:p-6">
            {children}
          </div>

          {showFooter && (
            <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-600 short:mt-3 dark:text-gray-400">
              <Link to="/legal/privacy-policy" className="hover:underline underline-offset-4">Privacidad</Link>
              <Link to="/legal/terms" className="hover:underline underline-offset-4">Términos</Link>
              <Link to="/legal/cookies" className="hover:underline underline-offset-4">Cookies</Link>
              <Link to="/legal/contact" className="hover:underline underline-offset-4">Contacto</Link>
            </footer>
          )}
        </div>
      </main>
    </div>
  )
}
