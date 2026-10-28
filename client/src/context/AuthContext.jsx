import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { setSessionPersistence, supabase } from '../lib/supabase'
import { clearProfileCache } from '../lib/api'
import { clearPatientCache } from '../lib/patientCache'
import ThemeLogo from '../components/ThemeLogo'

const AuthContext = createContext(null)
const OAUTH_RETURN_FLAG = 'oauth'
export const OAUTH_ERROR_KEY = 'soma-oauth-error'

// Los datos en memoria de una cuenta no deben verse si otra entra en la misma pestaña.
function clearClientCaches() {
  clearProfileCache()
  clearPatientCache()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const userIdRef = useRef(null)

  // Carga el perfil completo desde la tabla profiles.
  // Si no existe (ej: cuenta creada antes del trigger), lo crea automáticamente.
  async function loadProfile(authUser) {
    if (!authUser) { userIdRef.current = null; setUser(null); return null }

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
      userIdRef.current = userData.id
      setUser(userData)
      return userData
    }
    return null
  }

  useEffect(() => {
    // supabase-js recupera la sesión guardada (y la del fragmento de la URL al
    // volver de Google) por su cuenta; getSession() espera a que termine.
    const restoreSession = async () => {
      const isOAuthReturn = new URLSearchParams(window.location.search).get('auth') === OAUTH_RETURN_FLAG
      if (isOAuthReturn) {
        // El fragmento con los tokens se deja: supabase-js lo lee y lo borra.
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }

      const { data } = await supabase.auth.getSession()
      if (isOAuthReturn && !data.session) {
        // Sin sesión: Google devolvió un error (por ejemplo, el usuario canceló).
        try { sessionStorage.setItem(OAUTH_ERROR_KEY, '1') } catch {}
        window.history.replaceState(null, '', '/login')
      }

      await loadProfile(data.session?.user ?? null)
      initializedRef.current = true
      setLoading(false)
    }

    restoreSession()

    // Cambios de sesión, incluidos los de otras pestañas. Los refrescos de token
    // no cambian el perfil, así que no se vuelve a consultar. El callback no
    // espera llamadas a Supabase: se difieren para no bloquear al cliente de auth.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initializedRef.current) return
      if (event === 'SIGNED_OUT' || !session) {
        clearClientCaches()
        userIdRef.current = null
        setUser(null)
        return
      }
      const isOtherUser = session.user.id !== userIdRef.current
      if ((event === 'SIGNED_IN' && isOtherUser) || event === 'USER_UPDATED') {
        if (isOtherUser) clearClientCaches()
        setTimeout(() => loadProfile(session.user), 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])


  // Redirige a Google; al volver, restoreSession() completa el inicio de sesión.
  const loginWithGoogle = async (shouldTrustDevice = true) => {
    setSessionPersistence(shouldTrustDevice)
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
    setSessionPersistence(shouldTrustDevice)
    clearClientCaches()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const err = new Error(error.message)
      err.response = { data: { error: translateError(error.message) } }
      throw err
    }

    // Reintentos: la sesión puede tardar unos ms en propagar al RLS
    let userData = null
    for (let attempt = 1; attempt <= 5; attempt++) {
      userData = await loadProfile(data.user)
      if (userData) break
      await new Promise(r => setTimeout(r, attempt * 400))
    }

    // Sin perfil no se entra: el rol se toma solo de profiles, nunca de
    // user_metadata, que el propio usuario puede editar.
    if (!userData) {
      await supabase.auth.signOut({ scope: 'local' })
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
      // Intentar leer el perfil con reintentos (trigger puede tardar unos ms)
      let userData = null
      for (let attempt = 1; attempt <= 5; attempt++) {
        await new Promise(r => setTimeout(r, attempt * 400))
        userData = await loadProfile(data.user)
        if (userData) break
      }
      // Fallback con datos del formulario si RLS aún no propagó
      if (!userData && data.user) {
        userIdRef.current = data.user.id
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
    const { error } = await supabase.auth.signOut()
    // Sin conexión el cierre global falla y supabase-js conserva la sesión;
    // al menos se borra la de este dispositivo.
    if (error) await supabase.auth.signOut({ scope: 'local' })
    clearClientCaches()
    userIdRef.current = null
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
