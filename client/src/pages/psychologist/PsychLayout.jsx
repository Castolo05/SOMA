import { useState, useEffect } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Users, LogOut, ChevronRight, Moon, Sun, ChevronLeft, Menu, X } from 'lucide-react'

export default function PsychLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nexo_dark_psych') === 'true')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('nexo_dark_psych', darkMode)
  }, [darkMode])

  // Cerrar menú móvil al navegar
  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname])

  const navItems = [
    { to: '/psych', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/psych/patients', icon: <Users size={18} />, label: 'Mis Pacientes' },
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo + toggle */}
      <div className="flex items-center gap-2 px-2 mb-8">
        <img src="/logo.png" alt="SOMA" className="w-9 h-9 rounded-xl shadow-sm shrink-0" />
        {(!collapsed || isMobile) && (
          <span className="font-bold text-gray-900 dark:text-white text-lg">SOMA</span>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon, label }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              title={collapsed && !isMobile ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="shrink-0">{icon}</span>
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={14} className="text-indigo-400" />}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer sidebar */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
        {/* Código de invitación */}
        {user?.inviteCode && (!collapsed || isMobile) && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2.5">
            <div className="text-xs text-indigo-400 font-medium">Código de invitación</div>
            <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-widest">{user.inviteCode}</div>
          </div>
        )}
        {user?.inviteCode && collapsed && !isMobile && (
          <div
            title={`Código: ${user.inviteCode}`}
            className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2 text-center font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400"
          >
            ID
          </div>
        )}

        {/* Usuario */}
        {(!collapsed || isMobile) && (
          <div className="px-1">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 truncate">{user?.email}</div>
          </div>
        )}

        {/* Modo oscuro */}
        <button
          onClick={() => setDarkMode(d => !d)}
          className="w-full flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {(!collapsed || isMobile) && (darkMode ? 'Modo claro' : 'Modo oscuro')}
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
          {(!collapsed || isMobile) && 'Cerrar sesión'}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex transition-colors duration-300">
      {/* ── Sidebar desktop ── */}
      <aside
        className={`bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col py-6 px-4 shrink-0 hidden lg:flex transition-all duration-300 sticky top-0 h-screen overflow-y-auto ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Drawer móvil (overlay) ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Panel */}
          <aside className="relative w-72 bg-white dark:bg-gray-900 h-full flex flex-col py-6 px-4 shadow-2xl animate-slide-up">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        {/* Top bar móvil */}
        <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <img src="/logo.png" alt="SOMA" className="w-7 h-7 rounded-lg shadow-sm" />
            <span className="font-bold text-gray-800 dark:text-white">SOMA</span>
          </div>
          <div className="flex gap-1 items-center">
            {navItems.map(({ to, icon }) => (
              <Link
                key={to}
                to={to}
                className={`p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
                  location.pathname === to
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {icon}
              </Link>
            ))}
            <button
              onClick={() => setDarkMode(d => !d)}
              className="p-2 text-gray-400 dark:text-gray-500 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
