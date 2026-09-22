import { useState, useEffect } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, BookOpen, User, Moon, Sun, LogOut } from 'lucide-react'
import { preloadPatientData } from '../../lib/patientCache'
import ThemeLogo from '../../components/ThemeLogo'

export default function PatientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexo_dark') === 'true')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.dataset.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.dataset.theme = 'light'
    }
    localStorage.setItem('nexo_dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const el = document.getElementById('scrollable-main')
    if (el) el.scrollTo(0, 0)
    else window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    if (user?.role === 'PATIENT') preloadPatientData()
  }, [user?.id, user?.role])

  const handleLogout = () => { logout(); navigate('/login') }

  const navItems = [
    { to: '/patient',         icon: <Home size={22} />,     label: 'Inicio' },
    { to: '/patient/history', icon: <BookOpen size={22} />, label: 'Historial' },
    { to: '/patient/profile', icon: <User size={22} />,     label: 'Perfil' },
  ]

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f2c6b6] dark:bg-[#2f5d62] transition-colors duration-300 overflow-hidden">
      {/* Header */}
      <header className="dark-surface-header shrink-0 z-50 bg-white/90 dark:bg-gray-900/80 backdrop-blur-md border-b border-sage-100 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_18px_rgba(25,50,56,0.04)]">
        <div className="flex items-center gap-2.5">
          <ThemeLogo alt="SOMA" className="w-8 h-8 rounded-[10px] shadow-sm" />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg text-gray-800 dark:text-white">SOMA</span>
            <span className="text-[10px] font-semibold tracking-[0.18em] text-sage-600 dark:text-sage-400 uppercase">tu espacio de bienestar</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDarkMode(d => !d)}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-sage-50 dark:hover:bg-gray-800 transition-colors"
            aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={handleLogout}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main id="scrollable-main" className="flex-1 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-8">
          <Outlet />
        </div>
      </main>

      {/* Nav inferior mobile-first con soporte de safe-area (iPhone notch/home) */}
      <nav
        className="dark-surface-nav shrink-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-sage-100 dark:border-gray-800 shadow-[0_-1px_18px_rgba(25,50,56,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-xl mx-auto flex justify-around items-center py-1">
          {navItems.map(({ to, icon, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 min-w-[72px] min-h-11 px-3 py-2 rounded-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-sage-400 ${
                  active
                    ? 'text-sage-500 bg-sage-50 dark:bg-sage-900/20'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {icon}
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
