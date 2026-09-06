import { Capacitor } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'
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

const EncryptedSession = registerPlugin('EncryptedSession')

const sessionStorage = {
  async getItem(key) {
    if (!trustDevice) return null
    if (isNativeApp) {
      const { value } = await EncryptedSession.get()
      return value
    }
    return localStorage.getItem(key)
  },
  async setItem(key, value) {
    if (!trustDevice) return
    if (isNativeApp) {
      await EncryptedSession.set({ value })
      return
    }
    localStorage.setItem(key, value)
  },
  async removeItem(key) {
    if (isNativeApp) {
      await EncryptedSession.remove()
      return
    }
    localStorage.removeItem(key)
  },
}

export async function setSessionPersistence(shouldTrustDevice) {
  trustDevice = shouldTrustDevice
  localStorage.setItem('nexo_trusted_device', String(shouldTrustDevice))

  if (!shouldTrustDevice) {
    await sessionStorage.removeItem('supabase.auth.token')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: sessionStorage,
  },
})
