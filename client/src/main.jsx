import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './context/ToastContext'
import './index.css'
import './light-theme.css'
import './dark-theme.css'
import { registerReminderTapHandler } from './lib/reminders'

registerReminderTapHandler()

// La app usaba HashRouter: los enlaces viejos (/#/login, PWA instaladas, emails
// de recuperación ya enviados) se pasan a la ruta equivalente sin recargar.
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1))
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
