import { useEffect, useState } from 'react'

export default function ThemeLogo({ alt = 'SOMA', className = '' }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme ||
    (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  )

  useEffect(() => {
    const updateTheme = () => {
      const current =
        document.documentElement.dataset.theme ||
        (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      setTheme(current)
    }
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => observer.disconnect()
  }, [])

  const isDark = theme === 'dark'

  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      <img
        src="/logo-light.png"
        alt={alt}
        className={`w-full h-full object-contain transition-opacity duration-300 ease-in-out ${
          isDark ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'
        }`}
      />
      <img
        src="/logo-dark.png"
        alt={alt}
        className={`w-full h-full object-contain transition-opacity duration-300 ease-in-out ${
          isDark ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'
        }`}
      />
    </span>
  )
}
