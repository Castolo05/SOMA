import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carga el perfil completo desde la tabla profiles
  async function loadProfile(authUser) {
    if (!authUser) { setUser(null); return null }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (error) {
      console.error("Error cargando perfil:", error)
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
        avatarUrl: profile.avatar_url,
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
    const userData = await loadProfile(data.user)
    if (!userData) throw new Error("No se pudo cargar el perfil del usuario. Verifica si ejecutaste el script SQL en Supabase.")
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
    // El perfil se crea via trigger en la DB.
    // Esperamos un momento para que el trigger ejecute y luego cargamos el perfil.
    await new Promise(r => setTimeout(r, 800))
    const userData = await loadProfile(data.user)
    if (!userData) {
      const err = new Error("La cuenta fue creada pero falta la tabla 'profiles'. Debes ejecutar el script SQL de migración en Supabase.")
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
    const updates = {}
    if (newData.name) updates.name = newData.name
    if (newData.avatar_url !== undefined) updates.avatar_url = newData.avatar_url
    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', user.id)
    }
    // Refrescar el estado local
    setUser(prev => ({ ...prev, ...newData }))
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
