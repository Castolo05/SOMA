import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const SESSION_STORAGE_KEY = 'nexo_saved_session'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Faltan variables de entorno de Supabase.\n' +
    'Crea un archivo .env.local en la carpeta client/ con:\n' +
    'VITE_SUPABASE_URL=...\n' +
    'VITE_SUPABASE_ANON_KEY=...'
  )
}

export async function setSessionPersistence(shouldTrustDevice) {
  localStorage.setItem('nexo_trusted_device', String(shouldTrustDevice))

  if (!shouldTrustDevice) {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function loadSavedSession() {
  try {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY)
    return savedSession ? JSON.parse(savedSession) : null
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function clearSavedSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
