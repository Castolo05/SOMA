// ============================================================
// NexoMente — api.js (Supabase)
// Interfaz compatible con el api.js anterior para minimizar
// cambios en los componentes existentes.
// ============================================================
import { supabase } from './supabase'
import { addDays, entryDateKey, entryDateToDate } from './constants'

// ── Obtener usuario autenticado actual ────────────────────
// Usamos getSession() (caché local) en lugar de getUser() (llamada a red)
// para evitar race conditions justo después del registro donde el JWT
// puede no haber propagado aún a los servidores de validación de Supabase.
async function currentUser() {
  // Primero intentamos con la sesión en caché (rápido, sin red)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return null

  // Intentar leer el perfil con reintentos (puede haber delay de RLS post-registro)
  let profile = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) { profile = data; break }
    // Si es un error de "0 rows" y no el último intento, esperar y reintentar
    if (error?.code === 'PGRST116' && attempt < 3) {
      await new Promise(r => setTimeout(r, attempt * 400))
    } else {
      break
    }
  }

  // Fallback: perfil no existe en DB pero la sesión es válida.
  // Intentar crearlo, y si falla (ya existe por race condition), ignorar.
  if (!profile) {
    const meta = user.user_metadata || {}
    const role = meta.role || 'PATIENT'
    const name = meta.name || user.email?.split('@')[0] || 'Usuario'
    await supabase
      .from('profiles')
      .insert({ id: user.id, name, role })
      .select()
      .single()
    // Independientemente del resultado, construir con los metadatos del token
    return {
      id: user.id,
      email: user.email,
      role,
      inviteCode: null,
      psychologistId: null,
    }
  }

  return {
    id: user.id,
    email: user.email,
    role: profile.role,
    inviteCode: profile.invite_code,
    psychologistId: profile.psychologist_id,
  }
}


// ── Helpers ───────────────────────────────────────────────
function ok(data) { return Promise.resolve({ data }) }
function fail(message, status = 400) {
  const err = new Error(message)
  err.response = { status, data: { error: message } }
  return Promise.reject(err)
}

// ============================================================
// API OBJECT — misma interfaz que el api.js anterior
// ============================================================
const api = {

  get: async (url) => {
    const user = await currentUser()

    // ── GET /journal ──────────────────────────────────────
    if (url.startsWith('/journal')) {
      const patientId = url.includes('patientId=') ? url.split('patientId=')[1] : null
      const targetId = patientId || user?.id
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('patient_id', targetId)
        .order('entry_date', { ascending: false })
      if (error) return fail(error.message)
      // Normalizar snake_case → camelCase para compatibilidad
      const entries = (data || []).map(normalizeEntry)
      return ok({ entries })
    }

    // ── GET /habits/correlation ───────────────────────────
    if (url.startsWith('/habits/correlation')) {
      const patientId = url.includes('patientId=') ? url.split('patientId=')[1] : null
      const targetId = patientId || user?.id

      if (patientId && user?.role !== 'PSYCHOLOGIST') {
        return fail('No autorizado', 403)
      }

      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', targetId)
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('completed_habits, habit_data, mood_score')
        .eq('patient_id', targetId)
      if (!habits || !entries || entries.length < 5) return ok([])
      const result = computeCorrelation(habits.map(normalizeHabit), entries.map(normalizeEntry))
      return ok(result)
    }

    // ── GET /habits ───────────────────────────────────────
    if (url.startsWith('/habits') && !url.includes('/correlation')) {
      const patientId = url.includes('patientId=') ? url.split('patientId=')[1] : null
      const targetId = patientId || user?.id

      if (patientId && user?.role !== 'PSYCHOLOGIST') {
        return fail('No autorizado', 403)
      }

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', targetId)
        .order('order', { ascending: true })
      if (error) return fail(error.message)
      return ok({ habits: (data || []).map(normalizeHabit) })
    }

    // ── GET /patients ─────────────────────────────────────
    if (url === '/patients') {
      if (!user || user.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)
      const { data: patients, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('psychologist_id', user.id)
        .eq('psychologist_status', 'ACCEPTED')
        .eq('role', 'PATIENT')
      if (error) return fail(error.message)

      // Para cada paciente, obtener sus entradas de diario
      const enriched = await Promise.all((patients || []).map(async (p) => {
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('mood_score, entry_date, created_at')
          .eq('patient_id', p.id)
          .order('entry_date', { ascending: false })
          .limit(10)
        const lastEntry = entries?.[0]
        const last3 = (entries || []).slice(0, 3)
        const hasAlert = last3.length >= 3 && last3.every(e => e.mood_score <= 3)
        const lastEntryDate = lastEntry?.entry_date || lastEntry?.created_at
        const daysSinceLast = lastEntryDate
          ? Math.floor((Date.now() - entryDateToDate(lastEntryDate)) / 86400000)
          : null
        return {
          id: p.id,
          name: p.name,
          email: '', // protegido por RLS, no exponer
          role: p.role,
          inviteCode: p.invite_code,
          psychologistId: p.psychologist_id,
          totalEntries: (entries || []).length,
          lastMood: lastEntry?.mood_score ?? null,
          lastEntryDate: lastEntryDate ?? null,
          hasAlert,
          hasInactivityAlert: daysSinceLast !== null && daysSinceLast >= 5,
          daysSinceLastEntry: daysSinceLast,
        }
      }))
      return ok({ patients: enriched })
    }

    // ── GET /patients/requests ────────────────────────────
    if (url === '/patients/requests') {
      if (!user || user.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)
      const { data: requests, error } = await supabase
        .from('profiles')
        .select('id, name, email, updated_at')
        .eq('psychologist_id', user.id)
        .eq('psychologist_status', 'PENDING')
        .eq('role', 'PATIENT')
        .order('updated_at', { ascending: false })
      if (error) return fail(error.message)
      return ok({ requests: requests.map(r => ({ id: r.id, name: r.name, email: r.email, date: r.updated_at })) })
    }

    // ── GET /patients/:id/insights ────────────────────────
    if (url.match(/^\/patients\/.+\/insights$/)) {
      const patientId = url.split('/')[2]
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('mood_score, completed_habits, entry_date, created_at')
          .eq('patient_id', patientId)
          .order('entry_date', { ascending: false })
      const normalized = (entries || []).map(normalizeEntry)
      return ok(computeInsights(normalized))
    }

    // ── GET /appointments ─────────────────────────────────
    if (url === '/appointments') {
      let query = supabase.from('appointments').select('*')
      if (user?.role === 'PSYCHOLOGIST') {
        query = query.eq('psychologist_id', user.id)
      } else {
        query = query.eq('patient_id', user?.id).gte('date', new Date().toISOString())
      }
      const { data, error } = await query.order('date', { ascending: true })
      if (error) return fail(error.message)
      return ok({ appointments: (data || []).map(normalizeAppointment) })
    }

    // ── GET /session-notes/:patientId ─────────────────────
    if (url.startsWith('/session-notes/')) {
      const patientId = url.split('/session-notes/')[1]
      const { data, error } = await supabase
        .from('session_notes')
        .select('*')
        .eq('psychologist_id', user?.id)
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false })
      if (error) return fail(error.message)
      return ok({ notes: (data || []).map(normalizeNote) })
    }

    // ── GET /goals/:patientId ─────────────────────────────
    if (url.startsWith('/goals/')) {
      const patientId = url.split('/goals/')[1]
      const { data, error } = await supabase
        .from('therapy_goals')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true })
      if (error) return fail(error.message)
      return ok({ goals: (data || []).map(normalizeGoal) })
    }

    // ── GET /auth/psychologist ────────────────────────────
    if (url === '/auth/psychologist') {
      if (!user?.psychologistId) return ok({ psychologist: null })
      const { data: psych, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.psychologistId)
        .single()
      if (error) return fail(error.message)
      return ok({ psychologist: psych })
    }

    return fail(`Ruta no encontrada: GET ${url}`, 404)
  },

  // ──────────────────────────────────────────────────────────
  post: async (url, body) => {
    const user = await currentUser()

    // ── POST /auth/login ──────────────────────────────────
    if (url === '/auth/login') {
      // Delegado a AuthContext - no debería llegar aquí normalmente
      return fail('Use AuthContext para login')
    }

    // ── POST /auth/register ───────────────────────────────
    if (url === '/auth/register') {
      return fail('Use AuthContext para registro')
    }

    // ── POST /auth/link/preview ───────────────────────────
    if (url === '/auth/link/preview') {
      const { data: psych, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('invite_code', body.inviteCode?.toUpperCase())
        .eq('role', 'PSYCHOLOGIST')
        .single()
      if (error || !psych) return fail('Código de invitación inválido.')
      return ok({ psychologist: psych })
    }

    // ── POST /auth/link ───────────────────────────────────
    if (url === '/auth/link') {
      const { data: psych, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('invite_code', body.inviteCode?.toUpperCase())
        .eq('role', 'PSYCHOLOGIST')
        .single()
      if (error || !psych) return fail('Código de invitación inválido.')

      const { data: currProfile } = await supabase
        .from('profiles')
        .select('psychologist_id, psychologist_status')
        .eq('id', user?.id)
        .single()
      
      if (currProfile?.psychologist_id === psych.id && currProfile?.psychologist_status === 'ACCEPTED') {
        return fail('Ya estás vinculado con este psicólogo.')
      }
      if (currProfile?.psychologist_id === psych.id && currProfile?.psychologist_status === 'PENDING') {
        return fail('Tu solicitud ya está pendiente de aprobación.')
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ psychologist_id: psych.id, psychologist_status: 'PENDING' })
        .eq('id', user?.id)
      if (updateErr) return fail(updateErr.message)
      return ok({ user: { ...user, psychologistId: psych.id, psychologistStatus: 'PENDING' }, message: `Solicitud enviada a ${psych.name}.` })
    }

    // ── POST /journal ─────────────────────────────────────
    if (url === '/journal') {
      const today = entryDateKey()
      const minDate = entryDateKey(addDays(new Date(), -7))
      const requestedEntryDate = body.entryDate || today

      if (requestedEntryDate > today || requestedEntryDate < minDate) {
        return fail('Solo podés crear anotaciones de hoy o de hasta 1 semana de antigüedad (7 días).', 403)
      }

      // Una entrada por día de registro.
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('patient_id', user?.id)
        .eq('entry_date', requestedEntryDate)
        .limit(1)
      if (existing?.length > 0) {
        const err = new Error(`Ya existe una entrada para esta fecha (${requestedEntryDate}).`)
        err.response = { status: 409, data: { error: `Ya existe una entrada para esta fecha (${requestedEntryDate}).` } }
        return Promise.reject(err)
      }
      // Mergear completedHabits con habitData
      const merged = [...(body.completedHabits || [])]
      if (body.habitData) {
        Object.entries(body.habitData).forEach(([id, d]) => {
          if (d.done === true && !merged.includes(id)) merged.push(id)
        })
      }
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          patient_id: user?.id,
          mood_score: body.moodScore,
          content: body.content || '',
          completed_habits: merged,
          habit_data: body.habitData || {},
          flagged_for_session: false,
          entry_date: requestedEntryDate,
        })
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ entry: normalizeEntry(data) })
    }

    // ── POST /habits ──────────────────────────────────────
    if (url === '/habits') {
      const { data: existing } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', user?.id)
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user?.id,
          text: body.text,
          icon: body.icon || 'CheckCircle',
          tracking_type: body.trackingType || 'toggle',
          unit: body.unit || '',
          has_note: body.hasNote || false,
          order: (existing || []).length,
        })
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ habit: normalizeHabit(data) })
    }

    // ── POST /appointments ────────────────────────────────
    if (url === '/appointments') {
      const { data, error } = await supabase
        .from('appointments')
        .insert({ psychologist_id: user?.id, ...denormalizeAppointment(body) })
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ appointment: normalizeAppointment(data) })
    }

    // ── POST /session-notes/:patientId ────────────────────
    if (url.startsWith('/session-notes/')) {
      const patientId = url.split('/session-notes/')[1]
      const { data, error } = await supabase
        .from('session_notes')
        .insert({
          psychologist_id: user?.id,
          patient_id: patientId,
          title: body.title || '',
          content: body.content || '',
          session_date: body.sessionDate || new Date().toISOString(),
        })
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ note: normalizeNote(data) })
    }

    // ── POST /goals/:patientId ────────────────────────────
    if (url.startsWith('/goals/')) {
      const patientId = url.split('/goals/')[1]
      const { data, error } = await supabase
        .from('therapy_goals')
        .insert({
          psychologist_id: user?.id,
          patient_id: patientId,
          text: body.text,
          completed: false,
        })
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ goal: normalizeGoal(data) })
    }

    // ── POST /patients/requests/:id/accept ────────────────
    if (url.startsWith('/patients/requests/') && url.endsWith('/accept')) {
      const patientId = url.split('/patients/requests/')[1].replace('/accept', '')
      const { error } = await supabase
        .from('profiles')
        .update({ psychologist_status: 'ACCEPTED' })
        .eq('id', patientId)
        .eq('psychologist_id', user?.id)
      if (error) return fail(error.message)
      return ok({ success: true })
    }

    // ── POST /patients/requests/:id/reject ────────────────
    if (url.startsWith('/patients/requests/') && url.endsWith('/reject')) {
      const patientId = url.split('/patients/requests/')[1].replace('/reject', '')
      const { error } = await supabase
        .from('profiles')
        .update({ psychologist_id: null, psychologist_status: null })
        .eq('id', patientId)
        .eq('psychologist_id', user?.id)
      if (error) return fail(error.message)
      return ok({ success: true })
    }

    return fail(`Ruta no encontrada: POST ${url}`, 404)
  },

  // ──────────────────────────────────────────────────────────
  put: async (url, body) => {
    const user = await currentUser()

    // ── PUT /auth/user ────────────────────────────────────
    if (url === '/auth/user') {
      // Se delega a AuthContext.updateUser() normalmente
      const updates = {}
      if (body.name) updates.name = body.name
      if (body.avatar !== undefined) updates.avatar_url = body.avatar
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', user?.id)
      }
      if (body.password) await supabase.auth.updateUser({ password: body.password })
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
      return ok({ user: { id: p.id, name: p.name, role: p.role, inviteCode: p.invite_code, psychologistId: p.psychologist_id } })
    }

    // ── PUT /habits/:id ───────────────────────────────────
    if (url.startsWith('/habits/')) {
      const habitId = url.split('/habits/')[1]
      const { data, error } = await supabase
        .from('habits')
        .update({
          text: body.text,
          icon: body.icon,
          tracking_type: body.trackingType,
          unit: body.unit,
          has_note: body.hasNote,
        })
        .eq('id', habitId)
        .eq('user_id', user?.id)
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ habit: normalizeHabit(data) })
    }

    // ── PUT /journal/:id ──────────────────────────────────
    if (url.startsWith('/journal/')) {
      const entryId = url.split('/journal/')[1]
      const merged = [...(body.completedHabits || [])]
      if (body.habitData) {
        Object.entries(body.habitData).forEach(([id, d]) => {
          if (d.done === true && !merged.includes(id)) merged.push(id)
        })
      }
      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          mood_score: body.moodScore,
          content: body.content,
          completed_habits: merged,
          habit_data: body.habitData || {},
        })
        .eq('id', entryId)
        .eq('patient_id', user?.id)
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ entry: normalizeEntry(data) })
    }

    // ── PUT /appointments/:id ─────────────────────────────
    if (url.startsWith('/appointments/')) {
      const apptId = url.split('/appointments/')[1]
      const { data, error } = await supabase
        .from('appointments')
        .update(denormalizeAppointment(body))
        .eq('id', apptId)
        .eq('psychologist_id', user?.id)
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ appointment: normalizeAppointment(data) })
    }

    // ── PUT /session-notes/note/:id ───────────────────────
    if (url.startsWith('/session-notes/note/')) {
      const noteId = url.split('/session-notes/note/')[1]
      const { data, error } = await supabase
        .from('session_notes')
        .update({ title: body.title, content: body.content })
        .eq('id', noteId)
        .eq('psychologist_id', user?.id)
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ note: normalizeNote(data) })
    }

    return fail(`Ruta no encontrada: PUT ${url}`, 404)
  },

  // ──────────────────────────────────────────────────────────
  patch: async (url) => {
    const user = await currentUser()

    // ── PATCH /goals/:id/toggle ───────────────────────────
    if (url.includes('/toggle')) {
      const goalId = url.split('/goals/')[1].replace('/toggle', '')
      const { data: goal } = await supabase
        .from('therapy_goals')
        .select('completed')
        .eq('id', goalId)
        .single()
      const { data, error } = await supabase
        .from('therapy_goals')
        .update({ completed: !goal?.completed })
        .eq('id', goalId)
        .select()
        .single()
      if (error) return fail(error.message)
      return ok({ goal: normalizeGoal(data) })
    }

    return fail(`Ruta no encontrada: PATCH ${url}`, 404)
  },

  // ──────────────────────────────────────────────────────────
  delete: async (url) => {
    const user = await currentUser()

    // ── DELETE /journal/:id ───────────────────────────────
    if (url.startsWith('/journal/')) {
      const id = url.split('/journal/')[1]
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('patient_id', user?.id)
      if (error) return fail(error.message)
      return ok({ ok: true })
    }

    // ── DELETE /appointments/:id ──────────────────────────
    if (url.startsWith('/appointments/')) {
      const id = url.split('/appointments/')[1]
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('psychologist_id', user?.id)
      if (error) return fail(error.message)
      return ok({ ok: true })
    }

    // ── DELETE /session-notes/note/:id ────────────────────
    if (url.startsWith('/session-notes/note/')) {
      const id = url.split('/session-notes/note/')[1]
      const { error } = await supabase
        .from('session_notes')
        .delete()
        .eq('id', id)
        .eq('psychologist_id', user?.id)
      if (error) return fail(error.message)
      return ok({ ok: true })
    }

    // ── DELETE /habits/:id ────────────────────────────────
    if (url.startsWith('/habits/')) {
      const id = url.split('/habits/')[1]
      // Limpiar el hábito de las entradas de diario existentes
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, completed_habits, habit_data')
        .eq('patient_id', user?.id)
        .contains('completed_habits', [id])
      if (entries?.length > 0) {
        await Promise.all(entries.map(e => supabase
          .from('journal_entries')
          .update({
            completed_habits: e.completed_habits.filter(h => h !== id),
          })
          .eq('id', e.id)
        ))
      }
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)
      if (error) return fail(error.message)
      return ok({ ok: true })
    }

    // ── DELETE /goals/:id ─────────────────────────────────
    if (url.startsWith('/goals/')) {
      const id = url.split('/goals/')[1]
      const { error } = await supabase
        .from('therapy_goals')
        .delete()
        .eq('id', id)
      if (error) return fail(error.message)
      return ok({ ok: true })
    }

    return fail(`Ruta no encontrada: DELETE ${url}`, 404)
  },
}

export default api

// ============================================================
// Normalizadores snake_case → camelCase
// ============================================================
function normalizeEntry(e) {
  const entryDate = e.entry_date || entryDateKey(e.created_at)
  return {
    id: e.id,
    patientId: e.patient_id,
    moodScore: e.mood_score,
    content: e.content,
    completedHabits: e.completed_habits || [],
    habitData: e.habit_data || {},
    flaggedForSession: e.flagged_for_session,
    // Las vistas de diario trabajan con el día de la experiencia, no el
    // instante técnico en que se subió el formulario.
    entryDate,
    createdAt: `${entryDate}T12:00:00`,
    submittedAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

function normalizeHabit(h) {
  return {
    id: h.id,
    userId: h.user_id,
    text: h.text,
    icon: h.icon,
    trackingType: h.tracking_type,
    unit: h.unit,
    hasNote: h.has_note,
    order: h.order,
    createdAt: h.created_at,
  }
}

function normalizeNote(n) {
  return {
    id: n.id,
    psychologistId: n.psychologist_id,
    patientId: n.patient_id,
    title: n.title,
    content: n.content,
    sessionDate: n.session_date,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }
}

function normalizeAppointment(a) {
  return {
    id: a.id,
    psychologistId: a.psychologist_id,
    patientId: a.patient_id,
    title: a.title,
    date: a.date,
    duration: a.duration,
    notes: a.notes,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }
}

function denormalizeAppointment(body) {
  return {
    title: body.title,
    date: body.date,
    duration: body.duration,
    notes: body.notes,
    patient_id: body.patientId,
  }
}

function normalizeGoal(g) {
  return {
    id: g.id,
    psychologistId: g.psychologist_id,
    patientId: g.patient_id,
    text: g.text,
    completed: g.completed,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }
}

// ── Correlación hábito-ánimo (análisis exhaustivo) ────────
function computeCorrelation(habits, entries) {
  if (entries.length < 5) return []

  const avg = arr => arr.length
    ? parseFloat((arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(2))
    : null

  // Pearson r entre dos arrays del mismo largo
  function pearson(xs, ys) {
    const n = xs.length
    if (n < 3) return null
    const mx = xs.reduce((s, v) => s + v, 0) / n
    const my = ys.reduce((s, v) => s + v, 0) / n
    let num = 0, dx2 = 0, dy2 = 0
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my
      num += dx * dy; dx2 += dx * dx; dy2 += dy * dy
    }
    const denom = Math.sqrt(dx2 * dy2)
    return denom === 0 ? null : parseFloat((num / denom).toFixed(3))
  }

  // Línea de tendencia (least-squares) para el scatter chart
  function trendLine(points) {
    const n = points.length
    if (n < 3) return null
    const mx = points.reduce((s, p) => s + p.qty, 0) / n
    const my = points.reduce((s, p) => s + p.mood, 0) / n
    let num = 0, den = 0
    for (const p of points) {
      num += (p.qty - mx) * (p.mood - my)
      den += (p.qty - mx) ** 2
    }
    if (den === 0) return null
    const slope = num / den
    const intercept = my - slope * mx
    const xMin = Math.min(...points.map(p => p.qty))
    const xMax = Math.max(...points.map(p => p.qty))
    return [
      { qty: xMin, mood: parseFloat((slope * xMin + intercept).toFixed(2)) },
      { qty: xMax, mood: parseFloat((slope * xMax + intercept).toFixed(2)) },
    ]
  }

  const result = habits.map(habit => {
    const type = habit.trackingType || 'toggle'

    if (type === 'toggle') {
      // ── Hábito binario ──
      const isDone = e => (e.completedHabits || []).includes(habit.id)
      const withH = entries.filter(isDone)
      const withoutH = entries.filter(e => !isDone(e))
      const avgWith = avg(withH)
      const avgWithout = avg(withoutH)
      const impact = avgWith !== null && avgWithout !== null
        ? parseFloat((avgWith - avgWithout).toFixed(2)) : null
      const consistencyPct = entries.length
        ? Math.round((withH.length / entries.length) * 100) : 0
      return {
        habitId: habit.id, text: habit.text, icon: habit.icon,
        trackingType: 'toggle',
        avgWith, avgWithout, impact,
        countWith: withH.length, countWithout: withoutH.length,
        consistencyPct,
        scatterPoints: null, trend: null, pearsonR: null,
      }
    }

    if (type === 'toggle+qty') {
      // ── Hábito toggle + cantidad ──
      const isDone = e => e.habitData?.[habit.id]?.done === true
      const withH = entries.filter(isDone)
      const withoutH = entries.filter(e => !isDone(e))
      const avgWith = avg(withH)
      const avgWithout = avg(withoutH)
      const impact = avgWith !== null && avgWithout !== null
        ? parseFloat((avgWith - avgWithout).toFixed(2)) : null
      const consistencyPct = entries.length
        ? Math.round((withH.length / entries.length) * 100) : 0

      // Puntos scatter: cantidad vs ánimo
      const scatterPoints = withH
        .map(e => ({ qty: parseFloat(e.habitData?.[habit.id]?.qty), mood: e.moodScore }))
        .filter(x => !isNaN(x.qty))

      const pearsonR = scatterPoints.length >= 5
        ? pearson(scatterPoints.map(x => x.qty), scatterPoints.map(x => x.mood))
        : null

      return {
        habitId: habit.id, text: habit.text, icon: habit.icon,
        trackingType: 'toggle+qty',
        avgWith, avgWithout, impact,
        countWith: withH.length, countWithout: withoutH.length,
        consistencyPct,
        scatterPoints: scatterPoints.length >= 3 ? scatterPoints : null,
        trend: scatterPoints.length >= 3 ? trendLine(scatterPoints) : null,
        pearsonR,
        unit: habit.unit || '',
      }
    }

    if (type === 'qty') {
      // ── Hábito solo cantidad (sin toggle) ──
      const withQty = entries
        .map(e => ({ qty: parseFloat(e.habitData?.[habit.id]?.qty), mood: e.moodScore, ...e }))
        .filter(x => !isNaN(x.qty) && x.qty !== null && x.qty !== undefined)
      const withoutH = entries.filter(e => {
        const q = e.habitData?.[habit.id]?.qty
        return q === undefined || q === null || q === '' || isNaN(parseFloat(q))
      })

      if (withQty.length < 3) return null

      const avgWith = avg(withQty)
      const avgWithout = avg(withoutH)
      const impact = avgWith !== null && avgWithout !== null
        ? parseFloat((avgWith - avgWithout).toFixed(2)) : null
      const consistencyPct = entries.length
        ? Math.round((withQty.length / entries.length) * 100) : 0

      // Puntos scatter: cantidad vs ánimo (raw, sin categorizar)
      const scatterPoints = withQty.map(x => ({ qty: x.qty, mood: x.mood }))

      const pearsonR = scatterPoints.length >= 5
        ? pearson(scatterPoints.map(x => x.qty), scatterPoints.map(x => x.mood))
        : null

      return {
        habitId: habit.id, text: habit.text, icon: habit.icon,
        trackingType: 'qty',
        avgWith, avgWithout, impact,
        countWith: scatterPoints.length, countWithout: withoutH.length,
        consistencyPct,
        scatterPoints,
        trend: scatterPoints.length >= 3 ? trendLine(scatterPoints) : null,
        pearsonR,
        unit: habit.unit || '',
      }
    }

    return null
  }).filter(r => r !== null && r.countWith >= 3)

  return result
}

// ── Insights paciente (igual que localDb) ────────────────
function computeInsights(entries) {
  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
  const thisWeek = entries.filter(e => new Date(e.createdAt) >= weekAgo)
  const lastWeek = entries.filter(e => new Date(e.createdAt) >= twoWeeksAgo && new Date(e.createdAt) < weekAgo)
  const last14 = entries.filter(e => new Date(e.createdAt) >= twoWeeksAgo)
  const avg = arr => arr.length ? (arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(1) : null
  const avgThisWeek = avg(thisWeek)
  const avgLastWeek = avg(lastWeek)
  const trend = avgThisWeek && avgLastWeek ? (parseFloat(avgThisWeek) - parseFloat(avgLastWeek)).toFixed(1) : null
  const habitCount = {}
  last14.forEach(e => (e.completedHabits || []).forEach(h => { habitCount[h] = (habitCount[h] || 0) + 1 }))
  const topHabits = Object.entries(habitCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([habitId, count]) => ({ habitId, count }))
  // Racha de días consecutivos
  let streakDays = 0
  if (entries.length > 0) {
    const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const todayKey = sorted[0]?.entryDate
    let prevKey = todayKey
    for (const e of sorted) {
      if (e.entryDate === prevKey) { streakDays++; continue }
      const diff = (new Date(prevKey) - new Date(e.entryDate)) / 86400000
      if (diff <= 1) { streakDays++; prevKey = e.entryDate }
      else break
    }
  }
  const totalEntries = entries.length
  const bestMood = entries.length ? Math.max(...entries.map(e => e.moodScore)) : null
  const worstMood = entries.length ? Math.min(...entries.map(e => e.moodScore)) : null
  return { avgThisWeek, avgLastWeek, trend, topHabits, entriesThisWeek: thisWeek.length, streakDays, totalEntries, bestMood, worstMood }
}
