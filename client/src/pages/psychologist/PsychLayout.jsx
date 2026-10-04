import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ThemeLogo from '../../components/ThemeLogo'
import { applyTheme } from '../../lib/theme'
import {
  LayoutDashboard, Users, LogOut, Moon, Sun, Settings, UserPlus,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

export default function PsychLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexo_dark_psych') === 'true')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; applyTheme(darkMode, false, 'nexo_dark_psych'); return }
    applyTheme(darkMode, true, 'nexo_dark_psych')
  }, [darkMode])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const navItems = [
    { to: '/psych/patients', icon: Users,           label: 'Pacientes'  },
    { to: '/psych/requests', icon: UserPlus,        label: 'Solicitudes' },
  ]

  const isActive = (to) =>
    to === '/psych'
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`)

  const NavLink = ({ to, icon: Icon, label, mobile = false }) => {
    const active = isActive(to)
    return (
      <Link
        to={to}
        title={collapsed && !mobile ? label : undefined}
        className={`
          flex items-center gap-3 rounded-xl transition-all duration-200 font-medium text-sm
          ${collapsed && !mobile ? 'px-0 py-3 justify-center' : 'px-3 py-2.5 min-h-11'}
          ${active
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
        `}
      >
        <Icon size={18} className="shrink-0" />
        {(!collapsed || mobile) && <span className="flex-1 truncate">{label}</span>}
      </Link>
    )
  }

  const SidebarInner = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center mb-8 ${collapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-1'}`}>
        {(!collapsed || mobile) && (
          <>
            <ThemeLogo alt="SOMA" className="w-8 h-8 rounded-lg shrink-0" />
            <span className="font-bold text-gray-900 dark:text-white text-lg">SOMA</span>
          </>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${collapsed ? '' : 'ml-auto'}`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} icon={icon} label={label} mobile={mobile} />
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-200 dark:border-gray-700 pt-4 space-y-1 ${collapsed && !mobile ? 'items-center' : ''}`}>
        {/* Invite code */}
        {user?.inviteCode && (!collapsed || mobile) && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2.5 mb-3">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Código de invitación</div>
            <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-widest text-sm">{user.inviteCode}</div>
          </div>
        )}

        {/* User info */}
        {(!collapsed || mobile) && (
          <div className="px-1 py-1 mb-1">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 truncate">{user?.email}</div>
          </div>
        )}

        <Link
          to="/psych/settings"
          title={collapsed && !mobile ? 'Configuración' : undefined}
          className={`w-full flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200
            ${collapsed && !mobile ? 'justify-center py-3 px-0' : 'px-3 py-2'}
          `}
        >
          <Settings size={16} className="shrink-0" />
          {(!collapsed || mobile) && 'Configuración'}
        </Link>

        <button
          onClick={() => { logout(); navigate('/login') }}
          className={`w-full flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
            ${collapsed && !mobile ? 'justify-center py-3 px-0' : 'px-3 py-2'}
          `}
        >
          <LogOut size={16} className="shrink-0" />
          {(!collapsed || mobile) && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[var(--theme-canvas)] flex transition-colors duration-300">
      {/* Desktop sidebar */}
      <aside className={`
        hidden lg:flex flex-col bg-white dark:bg-[var(--theme-surface)]
        border-r border-gray-200 dark:border-[var(--theme-border)]
        py-6 px-4 shrink-0 sticky top-0 h-screen overflow-y-auto transition-all duration-300
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}>
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white dark:bg-gray-900 h-full flex flex-col py-6 px-4 shadow-2xl animate-slide-up">
            <SidebarInner mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet context={{ darkMode, setDarkMode }} />
        </div>
      </main>
    </div>
  )
}
