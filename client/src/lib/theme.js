/**
 * Utilidad para sincronizar la transición de tema (claro / oscuro y viceversa).
 * Garantiza que todos los elementos de la interfaz cambien a exactamente la misma
 * velocidad de animación (300ms) sin ser instantánea.
 */

let transitionTimeout = null

/**
 * Aplica el tema claro u oscuro en document.documentElement.
 *
 * @param {boolean} isDark - true para modo oscuro, false para modo claro
 * @param {boolean} animate - true para animar suavemente la transición de todos los elementos, false para aplicar sin animación (ej: carga inicial)
 * @param {string|null} storageKey - clave de localStorage ('nexo_dark' o 'nexo_dark_psych')
 */
export function applyTheme(isDark, animate = false, storageKey = null) {
  const root = document.documentElement
  const darkBool = Boolean(isDark)

  if (storageKey) {
    try {
      localStorage.setItem(storageKey, String(darkBool))
    } catch {
      // Ignorar errores en entornos con almacenamiento restringido
    }
  }

  if (animate) {
    if (transitionTimeout) {
      clearTimeout(transitionTimeout)
      transitionTimeout = null
    }

    // Activar clase de transición uniforme en la raíz
    root.classList.add('theme-transition')

    // Forzar reflow para que el motor CSS aplique las reglas de transición a todos los elementos del DOM
    void root.offsetHeight

    // Actualizar clases y atributos de tema
    root.classList.toggle('dark', darkBool)
    root.dataset.theme = darkBool ? 'dark' : 'light'

    // Remover la clase de transición una vez completada la duración de 300ms (con un pequeño margen de seguridad)
    transitionTimeout = setTimeout(() => {
      root.classList.remove('theme-transition')
      transitionTimeout = null
    }, 320)
  } else {
    if (transitionTimeout) {
      clearTimeout(transitionTimeout)
      transitionTimeout = null
    }
    root.classList.remove('theme-transition')
    root.classList.toggle('dark', darkBool)
    root.dataset.theme = darkBool ? 'dark' : 'light'
  }
}
