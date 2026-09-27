import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, BookOpen, User, Moon, Sun, LogOut } from 'lucide-react'
import { preloadPatientData } from '../../lib/patientCache'
import ThemeLogo from '../../components/ThemeLogo'
import { applyTheme } from '../../lib/theme'

// Import the three primary patient pages for side‑by‑side rendering
import PatientDashboard from './PatientDashboard'
import HistoryPage from './HistoryPage'
import PatientProfile from './PatientProfile'

export default function PatientLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexo_dark') === 'true')
  const isFirstRender = useRef(true)

  // Theme handling – unchanged from original implementation
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      applyTheme(darkMode, false, 'nexo_dark')
      return
    }
    applyTheme(darkMode, true, 'nexo_dark')
  }, [darkMode])

  // Pre‑load patient data when the user logs in – unchanged
  useEffect(() => {
    if (user?.role === 'PATIENT') preloadPatientData()
  }, [user?.id, user?.role])

  // ------------------------------------------------------------
  // Swipe navigation (horizontal) – only for the three base routes
  // ------------------------------------------------------------
  const baseRoutes = ['/patient', '/patient/history', '/patient/profile']
  const isBaseRoute = baseRoutes.includes(location.pathname)
  const scrollRef = useRef(null)

  // When the URL switches to a base route, scroll to the associated panel
  useEffect(() => {
    if (!isBaseRoute) return
    const idx = baseRoutes.indexOf(location.pathname)
    const el = scrollRef.current
    if (el) {
      el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
    }
  }, [location.pathname, isBaseRoute])

  // Detect user swipe and update the URL once scrolling settles
  useEffect(() => {
    if (!isBaseRoute) return
    const el = scrollRef.current
    if (!el) return
    let timeoutId = null
    const onScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const rawIdx = Math.round(el.scrollLeft / el.clientWidth)
        const currentIdx = baseRoutes.indexOf(location.pathname)
        let idx = rawIdx
        if (idx - currentIdx > 1) idx = currentIdx + 1
        if (currentIdx - idx > 1) idx = currentIdx - 1
        idx = Math.max(0, Math.min(idx, baseRoutes.length - 1))
        const targetPath = baseRoutes[idx]
        if (location.pathname !== targetPath) {
          navigate(targetPath, { replace: true })
        }
        // Ensure exact snap to nearest panel
        el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
      }, 100) // debounce to wait for finger lift
    }
    el.addEventListener('scroll', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(timeoutId)
    }
  }, [location.pathname, isBaseRoute, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/patient',         icon: <Home size={22} />, label: 'Inicio' },
    { to: '/patient/history', icon: <BookOpen size={22} />, label: 'Historial' },
    { to: '/patient/profile', icon: <User size={22} />, label: 'Perfil' },
  ]

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f2c6b6] dark:bg-[var(--theme-canvas)] transition-colors duration-300 overflow-hidden">
      {/* Header */}
      <header className="dark-surface-header shrink-0 z-50 bg-white/90 dark:bg-gray-900/80 backdrop-blur-md border-b border-sage-100 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_18px_rgba(25,50,56,0.04)]">
        <div className="flex items-center gap-2.5">
          <ThemeLogo alt="SOMA" className="w-8 h-8 rounded-[10px] shadow-sm" />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg text-gray-800 dark:text-white">SOMA</span>
            <span className="text-[10px] font-semibold tracking-[0.18em] text-sage-600 dark:text-sage-400 uppercase">un espacio de bienestar</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDarkMode(d => !d)}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-sage-50 dark:hover:bg-gray-800 transition-colors"
            aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {darkMode ? (
              <Sun size={18} className="text-amber-400 transition-transform duration-300" />
            ) : (
              <Moon size={18} className="transition-transform duration-300" />
            )}
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

      {/* Main – swipeable container for the three core sections */}
      <main className="flex-1 overflow-hidden">
        {isBaseRoute ? (
          <div
            ref={scrollRef}
            className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
            // Allow vertical scroll inside each panel while restricting horizontal gestures to the container
            style={{ touchAction: 'pan-y' }}
          >
            {/* Dashboard panel */}
            <section className="flex-none w-full snap-start overflow-y-auto" style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
              <div className="p-4 sm:p-6">
                <PatientDashboard />
              </div>
            </section>
            {/* History panel */}
            <section className="flex-none w-full snap-start overflow-y-auto" style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
              <div className="p-4 sm:p-6">
                <HistoryPage />
              </div>
            </section>
            {/* Profile panel */}
            <section className="flex-none w-full snap-start overflow-y-auto" style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
              <div className="p-4 sm:p-6">
                <PatientProfile />
              </div>
            </section>
          </div>
        ) : (
          // Sub‑pages (new entry, breathing, emergency, etc.) render normally
          <div className="w-full h-full overflow-y-auto">
            <Outlet />
          </div>
        )}
      </main>

      {/* Bottom navigation – mobile‑first with safe‑area inset */}
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
