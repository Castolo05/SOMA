import { Component } from 'react'

// Evita la pantalla en blanco cuando un componente falla al renderizar. También
// cubre el caso típico tras un deploy: una página lazy que ya no existe en el
// servidor; recargar trae la versión nueva.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Error no controlado en la interfaz:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2c6b6] dark:bg-[var(--theme-canvas)] p-4" role="alert">
        <div className="w-full max-w-sm rounded-3xl border border-[#c8b3b0] bg-[#f9e2da] p-6 text-center shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)]">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Algo salió mal</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Ocurrió un error inesperado. Tus datos guardados no se perdieron.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Recargar la página
          </button>
        </div>
      </div>
    )
  }
}
