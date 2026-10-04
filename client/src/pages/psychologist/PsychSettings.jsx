import { useOutletContext } from 'react-router-dom'
import { Moon, Sun, User, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function PsychSettings() {
  const { darkMode, setDarkMode } = useOutletContext()
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Administrá tus preferencias y ajustes de la cuenta.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Apariencia */}
        <div className="bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--theme-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[var(--theme-border)]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Apariencia</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Modo Oscuro</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cambiar entre tema claro y oscuro</p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(d => !d)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  darkMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Perfil (Placeholder) */}
        <div className="bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--theme-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[var(--theme-border)]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Perfil Profesional</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                <User size={32} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{user?.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
