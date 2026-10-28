import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)
const TOAST_DURATION_MS = 5000

// Avisos de error no bloqueantes, en lugar de window.alert().
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextIdRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showError = useCallback((message) => {
    const id = nextIdRef.current++
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => dismiss(id), TOAST_DURATION_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
          role="alert"
          aria-live="assertive"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg animate-fade-in dark:border-red-900/50 dark:bg-[var(--theme-surface)] dark:text-red-300"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="flex-1">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-full p-0.5 text-red-400 hover:text-red-600"
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
