import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Faltan variables de entorno de Supabase.\n' +
    'Crea un archivo .env.local en la carpeta client/ con:\n' +
    'VITE_SUPABASE_URL=...\n' +
    'VITE_SUPABASE_ANON_KEY=...'
  )
}

const isNativeApp = Capacitor.isNativePlatform()

const secureSessionStorage = {
  async getItem(key) {
    const secureValue = await SecureStorage.getItem(key)
    if (secureValue !== null) return secureValue

    const legacyValue = localStorage.getItem(key)
    if (legacyValue !== null) {
      await SecureStorage.setItem(key, legacyValue)
      localStorage.removeItem(key)
    }
    return legacyValue
  },
  setItem(key, value) {
    return SecureStorage.setItem(key, value)
  },
  removeItem(key) {
    return SecureStorage.remove(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: isNativeApp ? secureSessionStorage : undefined,
  },
})
