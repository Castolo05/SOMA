import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ThemeLogo from '../../components/ThemeLogo'
import { applyTheme } from '../../lib/theme'
import {
  Users, LogOut, Settings, UserPlus,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

export default function PsychLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexo_dark_psych') === 'true')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; applyTheme(darkMode, false, 'nexo_dark_psych'); return }
    applyTheme(darkMode, true, 'nexo_dark_psych')
  }, [darkMode])

  // Close all drawers on navigation
  useEffect(() => { setMobileOpen(false); setDrawerOpen(false) }, [location.pathname])

  const navItems = [
    { to: '/psych/patients', icon: Users,    label: 'Pacientes'   },
    { to: '/psych/requests', icon: UserPlus, label: 'Solicitudes' },
  ]

  const isActive = (to) =>
    to === '/psych'
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`)

  // ── Shared drawer body ────────────────────────────────────
  const DrawerInner = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo + close */}
      <div className="flex items-center gap-3 px-1 mb-8">
        <ThemeLogo alt="SOMA" className="w-8 h-8 rounded-lg shrink-0" />
        <span className="font-bold text-gray-900 dark:text-white text-lg">SOMA</span>
        <button
          onClick={onClose}
          className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              className={`
                flex items-center gap-3 rounded-xl transition-all duration-200 font-medium text-sm
                px-3 py-2.5 min-h-11
                ${active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
              `}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-1">
        {user?.inviteCode && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2.5 mb-3">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Código de invitación</div>
            <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-widest text-sm">{user.inviteCode}</div>
          </div>
        )}
        <div className="px-1 py-1 mb-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name}</div>
          <div className="text-xs text-gray-400 truncate">{user?.email}</div>
        </div>
        <Link
          to="/psych/settings"
          className="w-full flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors px-3 py-2"
        >
          <Settings size={16} className="shrink-0" /> Configuración
        </Link>
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors px-3 py-2"
        >
          <LogOut size={16} className="shrink-0" /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[var(--theme-canvas)] flex transition-colors duration-300">

      {/* ── Desktop: always-visible 60px icon strip ─────────── */}
      <aside className="hidden lg:flex flex-col items-center py-5 gap-2 bg-white dark:bg-[var(--theme-surface)] border-r border-gray-200 dark:border-[var(--theme-border)] w-[60px] shrink-0 sticky top-0 h-screen z-30">
        <ThemeLogo alt="SOMA" className="w-8 h-8 rounded-lg mb-3" />

        {/* Open drawer button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2.5 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          title="Abrir menú"
        >
          <ChevronRight size={17} />
        </button>

        <div className="w-7 border-t border-gray-100 dark:border-gray-700 my-1" />

        {/* Nav icon buttons */}
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={`p-2.5 rounded-xl transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }`}
            >
              <Icon size={18} />
            </Link>
          )
        })}

        {/* Footer icon buttons */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <Link
            to="/psych/settings"
            title="Configuración"
            className="p-2.5 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Settings size={17} />
          </Link>
          <button
            onClick={() => { logout(); navigate('/login') }}
            title="Cerrar sesión"
            className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* ── Desktop: overlay drawer ──────────────────────────── */}
      {drawerOpen && (
        <div className="hidden lg:block fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-[var(--theme-surface)] border-r border-gray-200 dark:border-[var(--theme-border)] py-6 px-4 shadow-2xl flex flex-col"
            style={{ animation: 'slideInLeft 200ms cubic-bezier(0.4,0,0.2,1)' }}
          >
            <DrawerInner onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Mobile: overlay drawer ───────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-72 bg-white dark:bg-gray-900 h-full flex flex-col py-6 px-4 shadow-2xl"
            style={{ animation: 'slideInLeft 200ms cubic-bezier(0.4,0,0.2,1)' }}
          >
            <DrawerInner onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main content — never shifts ──────────────────────── */}
      <main className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={20} />
            </button>
            <ThemeLogo alt="SOMA" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-gray-900 dark:text-white">SOMA</span>
          </div>
          <div className="flex gap-1">
            {navItems.map(({ to, icon: Icon }) => (
              <Link key={to} to={to} className={`p-2 rounded-lg min-w-10 min-h-10 flex items-center justify-center transition-colors ${isActive(to) ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400'}`}>
                <Icon size={18} />
              </Link>
            ))}
            <Link to="/psych/settings" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 min-w-10 min-h-10 flex items-center justify-center">
              <Settings size={18} />
            </Link>
            <button onClick={() => { logout(); navigate('/login') }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 min-w-10 min-h-10 flex items-center justify-center">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet context={{ darkMode, setDarkMode }} />
        </div>
      </main>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0.7; }
          to   { transform: translateX(0);     opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
