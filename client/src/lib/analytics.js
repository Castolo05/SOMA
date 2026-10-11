const STORAGE_KEY = 'soma-cookie-preferences'

export function getCookiePreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { analytics: false }
    return { ...{ analytics: false }, ...JSON.parse(raw) }
  } catch {
    return { analytics: false }
  }
}

export function setCookiePreferences(preferences) {
  const next = { analytics: !!preferences?.analytics }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
  return next
}

export function isAnalyticsAllowed() {
  return getCookiePreferences().analytics
}

export function initAnalytics() {
  const measurementId = import.meta.env.VITE_GA_ID
  if (!measurementId || !isAnalyticsAllowed()) return

  const existing = document.getElementById('google-analytics-script')
  if (!existing) {
    const script = document.createElement('script')
    script.id = 'google-analytics-script'
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script)
  }

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', measurementId, { anonymize_ip: true })
}
