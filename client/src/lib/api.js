// ============================================================
// Acceso a datos de SOMA sobre Supabase: una función por operación.
// La autorización real la aplica RLS en la base; los chequeos de rol
// de este archivo solo evitan consultas que fallarían igual.
// ============================================================
import { supabase } from './supabase'
import { entryDateKey } from './constants'
import { computeInsights, daysAgoKey, weeklyMood } from './stats'

// ── Obtener usuario autenticado actual ────────────────────
// Usamos getSession() (caché local) en lugar de getUser() (llamada a red)
// para evitar race conditions justo después del registro donde el JWT
// puede no haber propagado aún a los servidores de validación de Supabase.
// El rol y los datos de vínculo no se pueden editar desde el cliente, así que
// el perfil se consulta una sola vez por usuario en lugar de en cada llamada.
let profileCache = null

export function clearProfileCache() {
  profileCache = null
}

async function currentUser() {
  // Primero intentamos con la sesión en caché (rápido, sin red)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return null

  if (profileCache?.id === user.id) return { ...profileCache, email: user.email }

  // Intentar leer el perfil con reintentos (puede haber delay de RLS post-registro)
  let profile = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, invite_code, psychologist_id, psychologist_status')
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

  // Sin perfil todavía (el trigger handle_new_user aún no lo creó): no se
  // adivina el rol desde user_metadata, que el propio usuario puede editar.
  if (!profile) {
    return {
      id: user.id,
      email: user.email,
      role: null,
      inviteCode: null,
      psychologistId: null,
    }
  }

  profileCache = {
    id: user.id,
    role: profile.role,
    inviteCode: profile.invite_code,
    psychologistId: profile.psychologist_id,
    psychologistStatus: profile.psychologist_status,
  }
  return { ...profileCache, email: user.email }
}


// Alternativa a psychologist_patient_summaries() si la función aún no existe
// en la base: una sola consulta para todos los pacientes, agregada en el cliente.
async function summarizeEntriesByPatient(patientIds) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('patient_id, mood_score, entry_date')
    .in('patient_id', patientIds)
    .order('entry_date', { ascending: false })
  if (error) return new Error(error.message)
  const byId = new Map()
  for (const e of data || []) {
    const summary = byId.get(e.patient_id)
    if (summary) summary.total_entries += 1
    else byId.set(e.patient_id, { total_entries: 1, last_mood: e.mood_score, last_entry_date: e.entry_date })
  }
  return byId
}

// ── Helpers ───────────────────────────────────────────────
function ok(data) { return Promise.resolve({ data }) }
function fail(message, status = 400) {
  const err = new Error(message)
  err.response = { status, data: { error: message } }
  return Promise.reject(err)
}

// ============================================================
// Operaciones de datos. Cada una devuelve { data } o rechaza con
// err.response.data.error, el contrato que esperan las pantallas.
// ============================================================

// Al crear o editar una entrada, los hábitos marcados en habitData también
// cuentan como completados.
function mergeCompletedHabits(completedHabits, habitData) {
  const merged = [...(completedHabits || [])]
  Object.entries(habitData || {}).forEach(([id, d]) => {
    if (d.done === true && !merged.includes(id)) merged.push(id)
  })
  return merged
}

// ── Diario ────────────────────────────────────────────────

// Sin patientId: las entradas propias. Con patientId: las de un paciente
// vinculado (RLS solo las devuelve al psicólogo con vínculo aceptado).
export async function getJournal(patientId) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('patient_id', patientId || user?.id)
    .order('entry_date', { ascending: false })
  if (error) return fail(error.message)
  return ok({ entries: (data || []).map(normalizeEntry) })
}

export async function createJournalEntry({ moodScore, content, completedHabits, habitData, entryDate }) {
  const user = await currentUser()
  const today = entryDateKey()
  const requestedEntryDate = entryDate || today

  if (requestedEntryDate > today) {
    return fail('No podés crear anotaciones para fechas futuras.', 403)
  }

  // Una entrada por día de registro.
  const { data: existing, error: existingError } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('patient_id', user?.id)
    .eq('entry_date', requestedEntryDate)
    .limit(1)
  if (existingError) return fail(existingError.message)
  if (existing?.length > 0) {
    return fail(`Ya existe una entrada para esta fecha (${requestedEntryDate}).`, 409)
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      patient_id: user?.id,
      mood_score: moodScore,
      content: content || '',
      completed_habits: mergeCompletedHabits(completedHabits, habitData),
      habit_data: habitData || {},
      flagged_for_session: false,
      entry_date: requestedEntryDate,
    })
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ entry: normalizeEntry(data) })
}

export async function updateJournalEntry(entryId, { moodScore, content, completedHabits, habitData }) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('journal_entries')
    .update({
      mood_score: moodScore,
      content,
      completed_habits: mergeCompletedHabits(completedHabits, habitData),
      habit_data: habitData || {},
    })
    .eq('id', entryId)
    .eq('patient_id', user?.id)
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ entry: normalizeEntry(data) })
}

export async function deleteJournalEntry(entryId) {
  const user = await currentUser()
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('patient_id', user?.id)
  if (error) return fail(error.message)
  return ok({ ok: true })
}

// ── Hábitos ───────────────────────────────────────────────

export async function getHabits(patientId) {
  const user = await currentUser()
  if (patientId && user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', patientId || user?.id)
    .order('order', { ascending: true })
  if (error) return fail(error.message)
  return ok({ habits: (data || []).map(normalizeHabit) })
}

export async function createHabit({ text, icon, trackingType, unit, hasNote }) {
  const user = await currentUser()
  const { count, error: countError } = await supabase
    .from('habits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id)
  if (countError) return fail(countError.message)

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user?.id,
      text,
      icon: icon || 'CheckCircle',
      tracking_type: trackingType || 'toggle',
      unit: unit || '',
      has_note: hasNote || false,
      order: count ?? 0,
    })
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ habit: normalizeHabit(data) })
}

export async function updateHabit(habitId, { text, icon, trackingType, unit, hasNote }) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('habits')
    .update({ text, icon, tracking_type: trackingType, unit, has_note: hasNote })
    .eq('id', habitId)
    .eq('user_id', user?.id)
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ habit: normalizeHabit(data) })
}

export async function deleteHabit(habitId) {
  const user = await currentUser()
  // Se quita el hábito de las entradas de diario que lo tenían completado.
  const { data: entries, error: entriesError } = await supabase
    .from('journal_entries')
    .select('id, completed_habits')
    .eq('patient_id', user?.id)
    .contains('completed_habits', [habitId])
  if (entriesError) return fail(entriesError.message)
  if (entries?.length > 0) {
    const results = await Promise.all(entries.map(e => supabase
      .from('journal_entries')
      .update({ completed_habits: e.completed_habits.filter(h => h !== habitId) })
      .eq('id', e.id)
    ))
    const updateError = results.find(r => r.error)?.error
    if (updateError) return fail(updateError.message)
  }

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user?.id)
  if (error) return fail(error.message)
  return ok({ ok: true })
}

// ── Pacientes del psicólogo ───────────────────────────────

export async function getPatients() {
  const user = await currentUser()
  if (user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)

  const { data: links, error: linksError } = await supabase
    .from('patient_psychologists')
    .select('patient_id')
    .eq('psychologist_id', user.id)
    .eq('status', 'ACCEPTED')
  if (linksError) return fail(linksError.message)
  const patientIds = [...new Set((links || []).map(link => link.patient_id))]
  if (!patientIds.length) return ok({ patients: [] })

  // Perfiles, resumen de entradas y ánimo de las últimas dos semanas en
  // paralelo, en lugar de una consulta por paciente.
  const [{ data: patients, error }, { data: summaries, error: summariesError }, { data: recent, error: recentError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, role, avatar_url')
      .in('id', patientIds)
      .eq('role', 'PATIENT'),
    supabase.rpc('psychologist_patient_summaries'),
    supabase
      .from('journal_entries')
      .select('patient_id, mood_score, entry_date')
      .in('patient_id', patientIds)
      .gte('entry_date', daysAgoKey(13)),
  ])
  if (error) return fail(error.message)
  if (recentError) return fail(recentError.message)
  const recentById = new Map()
  for (const e of recent || []) {
    const list = recentById.get(e.patient_id) || []
    list.push({ moodScore: e.mood_score, entryDate: e.entry_date })
    recentById.set(e.patient_id, list)
  }
  const summaryById = summariesError
    ? await summarizeEntriesByPatient(patientIds)
    : new Map((summaries || []).map(s => [s.patient_id, s]))
  if (summaryById instanceof Error) return fail(summaryById.message)

  const enriched = (patients || []).map((p) => {
    const summary = summaryById.get(p.id)
    const { avgThisWeek, trend } = weeklyMood(recentById.get(p.id) || [])
    return {
      id: p.id,
      name: p.name,
      email: '', // protegido por RLS, no exponer
      role: p.role,
      avatarUrl: p.avatar_url,
      psychologistId: user.id,
      totalEntries: Number(summary?.total_entries ?? 0),
      lastMood: summary?.last_mood ?? null,
      lastEntryDate: summary?.last_entry_date ?? null,
      avgThisWeek,
      trend,
    }
  })
  return ok({ patients: enriched })
}

// El psicólogo termina el vínculo con un paciente. Conserva sus notas y
// objetivos, que pasan a verse como paciente archivado.
export async function unlinkPatient(patientId) {
  const user = await currentUser()
  if (user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)
  const { error } = await supabase
    .from('patient_psychologists')
    .delete()
    .eq('patient_id', patientId)
    .eq('psychologist_id', user.id)
  if (error) return fail(error.message)
  return ok({ ok: true })
}

// Pacientes desvinculados sobre los que el psicólogo tiene notas u objetivos.
export async function getArchivedPatients() {
  const user = await currentUser()
  if (user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)
  const { data, error } = await supabase.rpc('psychologist_archived_patients')
  if (error) return fail(error.message)
  return ok({ patients: (data || [])
    .map(p => ({
      id: p.patient_id,
      name: p.name,
      avatarUrl: p.avatar_url,
      notesCount: Number(p.notes_count),
      goalsCount: Number(p.goals_count),
      lastRecordAt: p.last_record_at,
    }))
    .sort((a, b) => new Date(b.lastRecordAt) - new Date(a.lastRecordAt)) })
}

// Ficha de un paciente vinculado: perfil, entradas y hábitos se piden una sola
// vez, y las estadísticas se calculan sobre esos mismos datos (la correlación
// la calcula HabitCorrelation con el período elegido).
// RLS solo devuelve el perfil si el vínculo está ACCEPTED.
export async function getPatientDetail(patientId) {
  const user = await currentUser()
  if (user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)

  const [profileResult, entriesResult, habitsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', patientId)
      .eq('role', 'PATIENT')
      .maybeSingle(),
    supabase
      .from('journal_entries')
      .select('*')
      .eq('patient_id', patientId)
      .order('entry_date', { ascending: false }),
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', patientId)
      .order('order', { ascending: true }),
  ])
  if (profileResult.error) return fail(profileResult.error.message)
  if (!profileResult.data) return fail('Paciente no encontrado.', 404)
  if (entriesResult.error) return fail(entriesResult.error.message)
  if (habitsResult.error) return fail(habitsResult.error.message)

  const entries = (entriesResult.data || []).map(normalizeEntry)
  const habits = (habitsResult.data || []).map(normalizeHabit)
  const p = profileResult.data
  return ok({
    patient: {
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
      totalEntries: entries.length,
      lastMood: entries[0]?.moodScore ?? null,
      lastEntryDate: entries[0]?.entryDate ?? null,
    },
    entries,
    habits,
    insights: computeInsights(entries),
  })
}

export async function getPatientRequests() {
  const user = await currentUser()
  if (user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)

  const { data: links, error: linksError } = await supabase
    .from('patient_psychologists')
    .select('patient_id, created_at')
    .eq('psychologist_id', user.id)
    .eq('status', 'PENDING')
  if (linksError) return fail(linksError.message)
  const patientIds = [...new Set((links || []).map(link => link.patient_id))]
  if (!patientIds.length) return ok({ requests: [] })
  const requestDates = new Map(links.map(link => [link.patient_id, link.created_at]))

  const { data: requests, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', patientIds)
    .eq('role', 'PATIENT')
  if (error) return fail(error.message)
  return ok({ requests: (requests || [])
    .map(r => ({ id: r.id, name: r.name, avatarUrl: r.avatar_url, date: requestDates.get(r.id) }))
    .sort((a, b) => new Date(b.date) - new Date(a.date)) })
}

export async function getPatientRequestCount() {
  const user = await currentUser()
  if (user?.role !== 'PSYCHOLOGIST') return fail('No autorizado', 403)

  const { count, error } = await supabase
    .from('patient_psychologists')
    .select('id', { count: 'exact', head: true })
    .eq('psychologist_id', user.id)
    .eq('status', 'PENDING')
  if (error) return fail(error.message)
  return ok({ count: count ?? 0 })
}

export async function acceptPatientRequest(patientId) {
  const user = await currentUser()
  const { data: acceptedLink, error } = await supabase
    .from('patient_psychologists')
    .update({ status: 'ACCEPTED', updated_at: new Date().toISOString() })
    .eq('patient_id', patientId)
    .eq('psychologist_id', user?.id)
    .eq('status', 'PENDING')
    .select('id')
    .maybeSingle()
  if (error) return fail(error.message)
  if (!acceptedLink) return fail('La solicitud ya no está disponible.', 404)
  return ok({ success: true })
}

export async function rejectPatientRequest(patientId) {
  const user = await currentUser()
  const { error } = await supabase
    .from('patient_psychologists')
    .delete()
    .eq('patient_id', patientId)
    .eq('psychologist_id', user?.id)
    .eq('status', 'PENDING')
  if (error) return fail(error.message)
  return ok({ success: true })
}

// ── Notas de sesión (privadas del psicólogo) ──────────────

export async function getSessionNotes(patientId) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('session_notes')
    .select('*')
    .eq('psychologist_id', user?.id)
    .eq('patient_id', patientId)
    .order('session_date', { ascending: false })
  if (error) return fail(error.message)
  return ok({ notes: (data || []).map(normalizeNote) })
}

export async function createSessionNote(patientId, { title, content, sessionDate }) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('session_notes')
    .insert({
      psychologist_id: user?.id,
      patient_id: patientId,
      title: title || '',
      content: content || '',
      session_date: sessionDate || new Date().toISOString(),
    })
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ note: normalizeNote(data) })
}

export async function updateSessionNote(noteId, { title, content, sessionDate }) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('session_notes')
    .update({ title, content, ...(sessionDate ? { session_date: sessionDate } : {}) })
    .eq('id', noteId)
    .eq('psychologist_id', user?.id)
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ note: normalizeNote(data) })
}

export async function deleteSessionNote(noteId) {
  const user = await currentUser()
  const { error } = await supabase
    .from('session_notes')
    .delete()
    .eq('id', noteId)
    .eq('psychologist_id', user?.id)
  if (error) return fail(error.message)
  return ok({ ok: true })
}

// ── Objetivos terapéuticos ────────────────────────────────

export async function getGoals(patientId) {
  const { data, error } = await supabase
    .from('therapy_goals')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
  if (error) return fail(error.message)
  return ok({ goals: (data || []).map(normalizeGoal) })
}

export async function createGoal(patientId, { text, visibleToPatient = false }) {
  const user = await currentUser()
  const { data, error } = await supabase
    .from('therapy_goals')
    .insert({ psychologist_id: user?.id, patient_id: patientId, text, completed: false, visible_to_patient: visibleToPatient })
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ goal: normalizeGoal(data) })
}

export async function toggleGoal(goalId) {
  const { data: goal, error: goalError } = await supabase
    .from('therapy_goals')
    .select('completed')
    .eq('id', goalId)
    .single()
  if (goalError) return fail(goalError.message)
  const { data, error } = await supabase
    .from('therapy_goals')
    .update({ completed: !goal.completed })
    .eq('id', goalId)
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ goal: normalizeGoal(data) })
}

export async function setGoalVisibility(goalId, visibleToPatient) {
  const { data, error } = await supabase
    .from('therapy_goals')
    .update({ visible_to_patient: visibleToPatient })
    .eq('id', goalId)
    .select()
    .single()
  if (error) return fail(error.message)
  return ok({ goal: normalizeGoal(data) })
}

// Objetivos que los psicólogos compartieron con el paciente (RLS solo
// devuelve los marcados como visibles).
export async function getMySharedGoals() {
  const user = await currentUser()
  if (user?.role !== 'PATIENT') return fail('No autorizado', 403)
  const { data, error } = await supabase
    .from('therapy_goals')
    .select('id, text, completed, psychologist_id, created_at')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: true })
  if (error) return fail(error.message)
  return ok({ goals: (data || []).map(normalizeGoal) })
}

export async function deleteGoal(goalId) {
  const { error } = await supabase
    .from('therapy_goals')
    .delete()
    .eq('id', goalId)
  if (error) return fail(error.message)
  return ok({ ok: true })
}

// ── Vínculo paciente–psicólogo ────────────────────────────

export async function getMyPsychologists() {
  const user = await currentUser()
  const { data: links, error } = await supabase
    .from('patient_psychologists')
    .select('psychologist_id, status')
    .eq('patient_id', user?.id)
  if (error) return fail(error.message)
  if (!links?.length) return ok({ psychologists: [] })

  const statusById = new Map(links.map(l => [l.psychologist_id, l.status]))
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', [...statusById.keys()])
  if (profilesError) return fail(profilesError.message)
  return ok({ psychologists: (profiles || []).map(p => ({ ...p, status: statusById.get(p.id) })) })
}

async function findPsychologistByInviteCode(inviteCode) {
  const { data, error } = await supabase.rpc('preview_psychologist_by_invite_code', {
    p_invite_code: inviteCode,
  })
  if (error) return { error: error.message }
  const psychologist = data?.[0]
  if (!psychologist) return { error: 'Código de invitación inválido.' }
  return { psychologist }
}

export async function previewPsychologistLink(inviteCode) {
  const { psychologist, error } = await findPsychologistByInviteCode(inviteCode?.trim().toUpperCase())
  if (error) return fail(error)
  return ok({ psychologist })
}

export async function requestPsychologistLink(rawInviteCode) {
  const user = await currentUser()
  if (user?.role !== 'PATIENT') return fail('Inicia sesión como paciente para enviar una solicitud.', 401)
  const inviteCode = rawInviteCode?.trim().toUpperCase()
  if (!inviteCode) return fail('Ingresa el código de invitación.')

  const { psychologist, error } = await findPsychologistByInviteCode(inviteCode)
  if (error) return fail(error)
  if (psychologist.id === user.id) return fail('No puedes vincularte con tu propia cuenta.')

  const { error: insertErr } = await supabase
    .from('patient_psychologists')
    .insert({ patient_id: user.id, psychologist_id: psychologist.id, status: 'PENDING' })
  if (insertErr?.code === '23505') return fail('Ya existe una solicitud o vinculación con este psicólogo.')
  if (insertErr) return fail(insertErr.message)
  return ok({ message: `Solicitud enviada a ${psychologist.name}.` })
}

export async function unlinkPsychologist(psychologistId) {
  const user = await currentUser()
  if (!user) return fail('No autorizado', 401)
  const { error } = await supabase
    .from('patient_psychologists')
    .delete()
    .eq('patient_id', user.id)
    .eq('psychologist_id', psychologistId)
  if (error) return fail(error.message)
  return ok({ ok: true })
}

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

function normalizeGoal(g) {
  return {
    id: g.id,
    psychologistId: g.psychologist_id,
    patientId: g.patient_id,
    text: g.text,
    completed: g.completed,
    visibleToPatient: g.visible_to_patient ?? false,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }
}
