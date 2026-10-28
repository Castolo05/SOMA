import { createContext, useContext, useState, useEffect, useRef } from 'react'
import {
  clearSavedSession,
  loadSavedSession,
  saveSession,
  setSessionPersistence,
  supabase,
} from '../lib/supabase'
import ThemeLogo from '../components/ThemeLogo'

const AuthContext = createContext(null)
const OAUTH_RETURN_FLAG = 'oauth'
export const OAUTH_ERROR_KEY = 'soma-oauth-error'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  // Carga el perfil completo desde la tabla profiles.
  // Si no existe (ej: cuenta creada antes del trigger), lo crea automáticamente.
  async function loadProfile(authUser) {
    if (!authUser) { setUser(null); return null }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // PGRST116 = "0 rows returned" → el trigger handle_new_user aún no creó el perfil
    if (error?.code === 'PGRST116') {
      return null
    } else if (error) {
      console.error('Error cargando perfil:', error.code, error.message)
      return null
    }

    if (profile) {
      const userData = {
        id: profile.id,
        name: profile.name,
        email: authUser.email,
        role: profile.role,
        firstName: profile.first_name || null,
        lastName: profile.last_name || null,
        birthDate: profile.birth_date || null,
        phone: profile.phone || null,
        specialization: profile.specialization || null,
        inviteCode: profile.invite_code,
        psychologistId: profile.psychologist_id,
        psychologistStatus: profile.psychologist_status,
        avatar: profile.avatar_url || null,
      }
      setUser(userData)
      return userData
    }
    return null
  }

  useEffect(() => {
    // Restaurar manualmente la sesión guardada en el almacenamiento local del APK.
    const restoreSession = async () => {
      // Regreso de Google: supabase-js ya tomó los tokens del fragmento de la URL
      // (detectSessionInUrl); getSession() espera a que termine de hacerlo.
      if (new URLSearchParams(window.location.search).get('auth') === OAUTH_RETURN_FLAG) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          if (localStorage.getItem('nexo_trusted_device') !== 'false') saveSession(data.session)
          await loadProfile(data.session.user)
          initializedRef.current = true
          setLoading(false)
          return
        }
        // Sin sesión: Google devolvió un error (por ejemplo, el usuario canceló).
        try { sessionStorage.setItem(OAUTH_ERROR_KEY, '1') } catch {}
        window.history.replaceState(null, '', `${window.location.pathname}#/login`)
      }

      const savedSession = loadSavedSession()
      if (!savedSession) {
        initializedRef.current = true
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.setSession(savedSession)
      if (error || !data.session) {
        clearSavedSession()
        initializedRef.current = true
        setLoading(false)
        return
      }

      saveSession(data.session)
      await loadProfile(data.session.user)
      initializedRef.current = true
      setLoading(false)
    }

    restoreSession()

    // Escuchar cambios de autenticación (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!initializedRef.current) return
        if (session && localStorage.getItem('nexo_trusted_device') !== 'false') {
          saveSession(session)
        }
        await loadProfile(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])


  // Redirige a Google; al volver, restoreSession() completa el inicio de sesión.
  const loginWithGoogle = async (shouldTrustDevice = true) => {
    await setSessionPersistence(shouldTrustDevice)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/?auth=${OAUTH_RETURN_FLAG}` },
    })
    if (error) {
      const err = new Error(error.message)
      err.response = { data: { error: 'No se pudo iniciar sesión con Google. Intentá de nuevo.' } }
      throw err
    }
  }

  const login = async (email, password, shouldTrustDevice = true) => {
    await setSessionPersistence(shouldTrustDevice)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const err = new Error(error.message)
      err.response = { data: { error: translateError(error.message) } }
      throw err
    }

    if (shouldTrustDevice) saveSession(data.session)

    // Reintentos: la sesión puede tardar unos ms en propagar al RLS
    let userData = null
    for (let attempt = 1; attempt <= 5; attempt++) {
      userData = await loadProfile(data.user)
      if (userData) break
      await new Promise(r => setTimeout(r, attempt * 400))
    }

    // Fallback: si RLS bloquea la lectura transitoriamente, construir
    // desde los metadatos del token — la sesión es válida en cualquier caso.
    if (!userData && data.user) {
      const meta = data.user.user_metadata || {}
      userData = {
        id: data.user.id,
        name: meta.name || data.user.email?.split('@')[0] || 'Usuario',
        email: data.user.email,
        role: meta.role || 'PATIENT',
        inviteCode: null,
        psychologistId: null,
        avatar: null,
      }
      setUser(userData)
    }

    if (!userData) {
      const err = new Error('No se pudo cargar el perfil. Intentá de nuevo.')
      err.response = { data: { error: err.message } }
      throw err
    }
    return userData
  }


  const register = async ({
    name,
    email,
    password,
    role,
    firstName,
    lastName,
    birthDate,
    phone,
    specialization,
    acceptedTerms,
    termsVersion,
  }) => {
    const normalizedRole = role || 'PATIENT'

    if (!acceptedTerms || !termsVersion) {
      const err = new Error('Tenés que aceptar los Términos y Condiciones para crear una cuenta.')
      err.response = { data: { error: err.message } }
      throw err
    }

    if (!['PATIENT', 'PSYCHOLOGIST'].includes(normalizedRole)) {
      const err = new Error('El tipo de cuenta seleccionado no es válido.')
      err.response = { data: { error: err.message } }
      throw err
    }

    if (
      normalizedRole === 'PSYCHOLOGIST' &&
      (!firstName?.trim() || !lastName?.trim() || !birthDate || !phone?.trim() || !specialization)
    ) {
      const err = new Error('Completá todos los datos profesionales requeridos.')
      err.response = { data: { error: err.message } }
      throw err
    }

    const metadata = {
      name,
      role: normalizedRole,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion,
    }
    if (normalizedRole === 'PSYCHOLOGIST') {
      Object.assign(metadata, { firstName, lastName, birthDate, phone, specialization })
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    if (error) {
      const err = new Error(error.message)
      err.response = { data: { error: translateError(error.message) } }
      throw err
    }

    // Si Supabase devuelve sesión directamente (email confirmation desactivado)
    if (data.session) {
      await supabase.auth.setSession(data.session)
      // Intentar leer el perfil con reintentos (trigger puede tardar unos ms)
      let userData = null
      for (let attempt = 1; attempt <= 5; attempt++) {
        await new Promise(r => setTimeout(r, attempt * 400))
        userData = await loadProfile(data.user)
        if (userData) break
      }
      // Fallback con datos del formulario si RLS aún no propagó
      if (!userData && data.user) {
        userData = {
          id: data.user.id,
          name,
          email,
          role: normalizedRole,
          firstName: firstName || null,
          lastName: lastName || null,
          birthDate: birthDate || null,
          phone: phone || null,
          specialization: specialization || null,
          inviteCode: null,
          psychologistId: null,
          avatar: null,
        }
        setUser(userData)
      }
      if (userData) return userData
    }

    // Sin sesión = Supabase requiere confirmación de email.
    // No dejamos entrar al dashboard: sin sesión, todas las
    // operaciones de DB fallan con 401.
    if (!data.session) {
      const err = new Error(
        '¡Cuenta creada! Revisá tu email y confirmá tu dirección para poder iniciar sesión.'
      )
      err.response = {
        data: {
          error: err.message,
          isEmailConfirmation: true,
        },
      }
      throw err
    }

    const userData = null

    if (!userData) {
      const err = new Error('No se pudo completar el registro. Por favor intentá iniciar sesión.')
      err.response = { data: { error: err.message } }
      throw err
    }
    return userData
  }

  const logout = async () => {
    await supabase.auth.signOut()
    clearSavedSession()
    setUser(null)
  }

  const updateUser = async (newData) => {
    if (!user) return
    // Actualizar email si cambió
    if (newData.email && newData.email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email: newData.email })
      if (error) throw error
    }
    // Actualizar contraseña si se proveyó
    if (newData.password) {
      const { error } = await supabase.auth.updateUser({ password: newData.password })
      if (error) throw error
    }
    // Actualizar perfil en la tabla profiles
    // El campo canónico en el state es `avatar`; en la DB es `avatar_url`
    const updates = {}
    if (newData.name) updates.name = newData.name
    const avatarValue = newData.avatar ?? newData.avatar_url
    if (avatarValue !== undefined) updates.avatar_url = avatarValue
    if (newData.phone !== undefined) updates.phone = newData.phone || null
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
    }
    // Refrescar el estado local usando el campo canónico `avatar`
    setUser(prev => ({
      ...prev,
      ...(newData.name ? { name: newData.name } : {}),
      ...(newData.email ? { email: newData.email } : {}),
      ...(avatarValue !== undefined ? { avatar: avatarValue } : {}),
      ...(newData.phone !== undefined ? { phone: newData.phone || null } : {}),
    }))
  }

  if (loading) return <InitialLoadingScreen />

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

function InitialLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2c6b6] dark:bg-[var(--theme-canvas)]">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-[#c8b3b0] bg-[#f9e2da] shadow-lg dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)]">
        <ThemeLogo alt="SOMA" className="h-full w-full object-contain" />
      </div>
      <p className="mt-5 text-lg font-bold tracking-wide text-gray-800">SOMA</p>
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500" role="status" aria-live="polite">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sage-200 border-t-sage-500" />
        <span>Preparando tu espacio...</span>
      </div>
    </div>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

// Traduce errores comunes de Supabase al español
function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('Email not confirmed')) return 'Por favor confirmá tu email antes de iniciar sesión.'
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email.'
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('Unable to validate email')) return 'El email no es válido.'
  return msg
}
