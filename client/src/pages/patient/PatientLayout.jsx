import { useState, useEffect } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, BookOpen, User, Moon, Sun, LogOut, Phone } from 'lucide-react'

export default function PatientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexo_dark') === 'true')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('nexo_dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const el = document.getElementById('scrollable-main')
    if (el) el.scrollTo(0, 0)
    else window.scrollTo(0, 0)
  }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }

  const navItems = [
    { to: '/patient',         icon: <Home size={22} />,     label: 'Inicio' },
    { to: '/patient/history', icon: <BookOpen size={22} />, label: 'Historial' },
    { to: '/patient/profile', icon: <User size={22} />,     label: 'Perfil' },
  ]

  return (
    <div className="h-[100dvh] flex flex-col bg-[#EFF2F7] dark:bg-gray-950 transition-colors duration-300 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 bg-white/90 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="SOMA" className="w-8 h-8 rounded-[10px] shadow-sm" />
          <span className="font-bold text-lg text-gray-800 dark:text-white">SOMA</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Emergencia siempre visible */}
          <Link
            to="/patient/emergency"
            className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Líneas de emergencia"
            aria-label="Líneas de emergencia y crisis"
          >
            <Phone size={18} />
          </Link>

          <button
            onClick={() => setDarkMode(d => !d)}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main id="scrollable-main" className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 pb-8">
          <Outlet />
        </div>
      </main>

      {/* Nav inferior mobile-first con soporte de safe-area (iPhone notch/home) */}
      <nav
        className="shrink-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-lg mx-auto flex justify-around items-center py-1">
          {navItems.map(({ to, icon, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 min-w-[72px] min-h-[52px] px-3 py-2 rounded-2xl transition-all duration-200 ${
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
