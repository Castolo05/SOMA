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
let trustDevice = localStorage.getItem('nexo_trusted_device') !== 'false'
let temporarySession = null

async function clearSecureSessions() {
  try {
    const keys = await SecureStorage.keys()
    await Promise.all(
      keys.filter(key => key.includes('auth-token')).map(key => SecureStorage.remove(key))
    )
  } catch (error) {
    console.warn('No se pudo limpiar la sesión segura anterior.', error)
  }
}

const secureSessionStorage = {
  async getItem(key) {
    if (!trustDevice) return temporarySession

    try {
      const secureValue = await SecureStorage.getItem(key)
      if (secureValue !== null) return secureValue

      const legacyValue = localStorage.getItem(key)
      if (legacyValue !== null) {
        await SecureStorage.setItem(key, legacyValue)
        localStorage.removeItem(key)
      }
      return legacyValue
    } catch (error) {
      console.warn('No se pudo leer la sesión segura; se usa el almacenamiento local.', error)
      return localStorage.getItem(key)
    }
  },
  async setItem(key, value) {
    if (!trustDevice) {
      temporarySession = value
      return
    }

    try {
      await SecureStorage.setItem(key, value)
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('No se pudo guardar la sesión segura; se usa el almacenamiento local.', error)
      localStorage.setItem(key, value)
    }
  },
  async removeItem(key) {
    temporarySession = null
    try {
      await SecureStorage.remove(key)
    } finally {
      localStorage.removeItem(key)
    }
  },
}

export async function setSessionPersistence(shouldTrustDevice) {
  trustDevice = shouldTrustDevice
  temporarySession = null
  localStorage.setItem('nexo_trusted_device', String(shouldTrustDevice))

  if (!shouldTrustDevice) {
    await clearSecureSessions()
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: isNativeApp ? secureSessionStorage : undefined,
  },
})
