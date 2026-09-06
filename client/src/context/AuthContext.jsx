import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carga el perfil completo desde la tabla profiles.
  // Si no existe (ej: cuenta creada antes del trigger), lo crea automáticamente.
  async function loadProfile(authUser) {
    if (!authUser) { setUser(null); return null }

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // PGRST116 = "0 rows returned" → el perfil no existe aún (trigger no corrió)
    if (error?.code === 'PGRST116') {
      const meta = authUser.user_metadata || authUser.raw_user_meta_data || {}
      const role = meta.role || 'PATIENT'
      const name = meta.name || authUser.email?.split('@')[0] || 'Usuario'
      const inviteCode = role === 'PSYCHOLOGIST'
        ? Math.random().toString(36).slice(2, 10).toUpperCase()
        : null

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: authUser.id, name, role, invite_code: inviteCode })
        .select()
        .single()

      if (insertError) {
        console.error('Error creando perfil:', insertError)
        return null
      }
      profile = created
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
        inviteCode: profile.invite_code,
        psychologistId: profile.psychologist_id,
        avatar: profile.avatar_url || null,
      }
      setUser(userData)
      return userData
    }
    return null
  }

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    // Escuchar cambios de autenticación (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await loadProfile(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])


  const login = async (email, password) => {
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


  const register = async (name, email, password, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
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
          role,
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
    setUser(null)
  }

  const updateUser = async (newData) => {
    if (!user) return
    // Actualizar email si cambió
    if (newData.email && newData.email !== user.email) {
      await supabase.auth.updateUser({ email: newData.email })
    }
    // Actualizar contraseña si se proveyó
    if (newData.password) {
      await supabase.auth.updateUser({ password: newData.password })
    }
    // Actualizar perfil en la tabla profiles
    // El campo canónico en el state es `avatar`; en la DB es `avatar_url`
    const updates = {}
    if (newData.name) updates.name = newData.name
    const avatarValue = newData.avatar ?? newData.avatar_url
    if (avatarValue !== undefined) updates.avatar_url = avatarValue
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
    }))
  }

  const linkPsychologist = async (inviteCode) => {
    // Buscar psicólogo por invite_code
    const { data: psych, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('role', 'PSYCHOLOGIST')
      .single()

    if (error || !psych) {
      const err = new Error('Código de invitación inválido.')
      err.response = { data: { error: 'Código de invitación inválido.' } }
      throw err
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ psychologist_id: psych.id })
      .eq('id', user.id)

    if (updateErr) throw updateErr

    setUser(prev => ({ ...prev, psychologistId: psych.id }))
    return { message: `¡Vinculado con ${psych.name}!` }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, linkPsychologist }}>
      {children}
    </AuthContext.Provider>
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
