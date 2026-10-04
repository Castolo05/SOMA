import { createPortal } from 'react-dom'
import { AlertTriangle, LogOut } from 'lucide-react'

export default function ConfirmLogoutModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Cerrar sesión?',
  description = 'Se cerrará tu sesión actual y tendrás que volver a iniciar sesión.',
}) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="flex min-h-full items-end justify-center p-2 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          className="w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-[var(--theme-surface)] sm:rounded-3xl sm:p-6"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle size={24} className="text-red-500 dark:text-red-400" />
          </div>

          <h3 id="logout-confirm-title" className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            {title}
          </h3>

          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="btn-ghost flex-1"
              type="button"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              type="button"
            >
              <span className="flex items-center justify-center gap-2">
                <LogOut size={16} />
                Cerrar sesión
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
