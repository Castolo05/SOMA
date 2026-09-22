import { useEffect, useState } from 'react'

export default function ThemeLogo({ alt = 'SOMA', className = '' }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme || 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return <img src={theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'} alt={alt} className={className} />
}
