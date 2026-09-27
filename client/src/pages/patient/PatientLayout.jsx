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
  // Touch-driven Tab Pager (transform-based, like native mobile apps)
  // ------------------------------------------------------------
  const baseRoutes = ['/patient', '/patient/history', '/patient/profile']
  const isBaseRoute = baseRoutes.includes(location.pathname)
  const routeIdx = baseRoutes.indexOf(location.pathname)
  const activeIdx = routeIdx >= 0 ? routeIdx : 0

  const containerRef = useRef(null)
  const sliderRef = useRef(null)
  const activeIdxRef = useRef(activeIdx)
  activeIdxRef.current = activeIdx

  // Sync position smoothly whenever activeIdx changes (navigation or click)
  useEffect(() => {
    if (!isBaseRoute || !sliderRef.current) return
    sliderRef.current.style.transition = 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)'
    sliderRef.current.style.transform = `translate3d(-${activeIdx * 100}%, 0, 0)`
  }, [activeIdx, isBaseRoute])

  useEffect(() => {
    if (!isBaseRoute) return
    const container = containerRef.current
    const slider = sliderRef.current
    if (!container || !slider) return

    let startX = 0
    let startY = 0
    let currentX = 0
    let startTime = 0
    let isHorizontal = null
    let isDragging = false

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      if (touch.target.closest('input[type="range"]')) return

      startX = touch.clientX
      startY = touch.clientY
      currentX = touch.clientX
      startTime = Date.now()
      isHorizontal = null
      isDragging = false
    }

    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY

      if (isHorizontal === null) {
        if (Math.abs(deltaX) > 7 || Math.abs(deltaY) > 7) {
          if (Math.abs(deltaY) >= Math.abs(deltaX)) {
            isHorizontal = false
            return
          } else {
            isHorizontal = true
            isDragging = true
            slider.style.transition = 'none'
          }
        } else {
          return
        }
      }

      if (isHorizontal) {
        if (e.cancelable) e.preventDefault()
        currentX = touch.clientX

        const currentActive = activeIdxRef.current
        let drag = deltaX

        // Elastic resistance at boundaries
        if ((currentActive === 0 && deltaX > 0) || (currentActive === baseRoutes.length - 1 && deltaX < 0)) {
          drag = deltaX * 0.25
        }

        slider.style.transform = `translate3d(calc(-${currentActive * 100}% + ${drag}px), 0, 0)`
      }
    }

    const onTouchEnd = () => {
      if (!isDragging || !isHorizontal) {
        isHorizontal = null
        isDragging = false
        return
      }

      const deltaX = currentX - startX
      const deltaTime = Date.now() - startTime
      const velocity = deltaX / Math.max(deltaTime, 1) // px/ms
      const width = container.clientWidth || window.innerWidth
      const currentActive = activeIdxRef.current

      let targetIdx = currentActive

      // STRICTLY ±1 STEP: Impossible to overshoot to screen 3 from screen 1!
      if ((velocity < -0.28 || deltaX < -width * 0.22) && currentActive < baseRoutes.length - 1) {
        targetIdx = currentActive + 1
      } else if ((velocity > 0.28 || deltaX > width * 0.22) && currentActive > 0) {
        targetIdx = currentActive - 1
      }

      slider.style.transition = 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)'
      slider.style.transform = `translate3d(-${targetIdx * 100}%, 0, 0)`

      if (targetIdx !== currentActive) {
        navigate(baseRoutes[targetIdx])
      }

      isHorizontal = null
      isDragging = false
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [isBaseRoute, navigate])

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
            ref={containerRef}
            className="w-full h-full overflow-hidden select-none"
            style={{ touchAction: 'pan-y' }}
          >
            <div
              ref={sliderRef}
              className="flex h-full w-full"
              style={{
                transform: `translate3d(-${activeIdx * 100}%, 0, 0)`,
                willChange: 'transform',
              }}
            >
              {/* Dashboard panel */}
              <section className="flex-none w-full h-full overflow-y-auto">
                <div className="p-4 sm:p-6 pb-20">
                  <PatientDashboard />
                </div>
              </section>
              {/* History panel */}
              <section className="flex-none w-full h-full overflow-y-auto">
                <div className="p-4 sm:p-6 pb-20">
                  <HistoryPage />
                </div>
              </section>
              {/* Profile panel */}
              <section className="flex-none w-full h-full overflow-y-auto">
                <div className="p-4 sm:p-6 pb-20">
                  <PatientProfile />
                </div>
              </section>
            </div>
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
