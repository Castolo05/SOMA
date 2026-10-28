import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const AUTH_STORAGE_KEY = 'soma-auth-token'
const TRUSTED_DEVICE_KEY = 'nexo_trusted_device'
const LEGACY_SESSION_KEY = 'nexo_saved_session'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Faltan variables de entorno de Supabase.\n' +
    'Crea un archivo .env.local en la carpeta client/ con:\n' +
    'VITE_SUPABASE_URL=...\n' +
    'VITE_SUPABASE_ANON_KEY=...'
  )
}

// Acceder a window.localStorage puede lanzar (navegación privada, cookies
// bloqueadas): por eso se nombra el almacenamiento y se resuelve dentro del try.
function readStorage(name, key) {
  try { return window[name].getItem(key) } catch { return null }
}

function writeStorage(name, key, value) {
  try { window[name].setItem(key, value) } catch {}
}

function removeStorage(name, key) {
  try { window[name].removeItem(key) } catch {}
}

function isTrustedDevice() {
  return readStorage('localStorage', TRUSTED_DEVICE_KEY) !== 'false'
}

// Dispositivo de confianza: la sesión vive en localStorage y sobrevive al cierre
// del navegador. Si no, en sessionStorage: dura lo que la pestaña. supabase-js
// sincroniza entre pestañas y rota el refresh token sobre este almacenamiento.
const activeStorage = () => (isTrustedDevice() ? 'localStorage' : 'sessionStorage')

const authStorage = {
  getItem: (key) => readStorage(activeStorage(), key),
  setItem: (key, value) => writeStorage(activeStorage(), key, value),
  removeItem: (key) => {
    removeStorage('localStorage', key)
    removeStorage('sessionStorage', key)
  },
}

// Se llama antes de iniciar sesión, para que la sesión nueva se guarde en el
// almacenamiento elegido y no quede una copia en el otro.
export function setSessionPersistence(shouldTrustDevice) {
  writeStorage('localStorage', TRUSTED_DEVICE_KEY, String(shouldTrustDevice))
  removeStorage(shouldTrustDevice ? 'sessionStorage' : 'localStorage', AUTH_STORAGE_KEY)
}

// Las versiones anteriores guardaban la sesión a mano en otra clave; se migra
// una sola vez para no cerrar la sesión de quienes ya estaban dentro.
function migrateLegacySession() {
  const legacy = readStorage('localStorage', LEGACY_SESSION_KEY)
  if (!legacy) return
  removeStorage('localStorage', LEGACY_SESSION_KEY)
  if (readStorage('localStorage', AUTH_STORAGE_KEY)) return
  try {
    const session = JSON.parse(legacy)
    if (session?.access_token && session?.refresh_token) {
      writeStorage('localStorage', AUTH_STORAGE_KEY, legacy)
    }
  } catch {}
}

migrateLegacySession()

// Consulta qué proveedores tiene activos Supabase Auth, así el botón de Google
// aparece solo cuando el proveedor está habilitado, sin necesidad de redeploy.
let authProvidersPromise = null
export function isGoogleAuthEnabled() {
  if (!authProvidersPromise) {
    authProvidersPromise = fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
  }
  return authProvidersPromise.then((settings) => Boolean(settings?.external?.google))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: authStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Si el enlace de recuperación trae los tokens en el fragmento, supabase-js los
// procesa al cargar la página y los borra de la URL. Se recuerda el evento para
// que la app lleve a /reset-password aunque el enlace haya caído en otra ruta.
let passwordRecoveryPending = false
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') passwordRecoveryPending = true
})

export function isPasswordRecoveryPending() {
  return passwordRecoveryPending
}

export function clearPasswordRecovery() {
  passwordRecoveryPending = false
}
