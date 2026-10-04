import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, LogOut } from 'lucide-react'

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmás esta acción?',
  description = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  icon: Icon = danger ? AlertTriangle : LogOut,
}) {
  if (!isOpen) return null

  const confirmClasses = danger
    ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
    : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="flex min-h-full items-end justify-center p-2 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-action-title"
          className="w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-[var(--theme-surface)] sm:rounded-3xl sm:p-6"
        >
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${danger ? 'bg-red-100 dark:bg-red-900/20' : 'bg-indigo-100 dark:bg-indigo-900/20'}`}>
            <Icon size={24} className={danger ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'} />
          </div>

          <h3 id="confirm-action-title" className="mb-3 text-center text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>

          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm ${confirmClasses}`}
            >
              <span className="flex items-center justify-center gap-2">
                {danger ? <Trash2 size={16} /> : <LogOut size={16} />}
                {confirmLabel}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
