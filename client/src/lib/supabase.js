import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
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

const preferencesSessionStorage = {
  async getItem(key) {
    if (!trustDevice) return null
    const { value } = await Preferences.get({ key })
    return value
  },
  async setItem(key, value) {
    if (!trustDevice) return
    await Preferences.set({ key, value })
  },
  async removeItem(key) {
    await Preferences.remove({ key })
  },
}

export async function setSessionPersistence(shouldTrustDevice) {
  trustDevice = shouldTrustDevice
  localStorage.setItem('nexo_trusted_device', String(shouldTrustDevice))

  if (!shouldTrustDevice) {
    await Preferences.remove({ key: 'supabase.auth.token' })
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: isNativeApp ? preferencesSessionStorage : undefined,
  },
})
