// ============================================================
// NexoMente — LocalDB
// Base de datos 100% local usando localStorage.
// Simula todas las rutas del backend original.
// ============================================================
import { entryDateKey } from './constants.js'

// ── IDs únicos simples ────────────────────────────────────
let _idCounter = Date.now()
function genId() { return `local_${++_idCounter}` }

// ── Claves de localStorage ────────────────────────────────
const KEYS = {
  users:        'nexo_db_users',
  journal:      'nexo_db_journal',
  sessionNotes: 'nexo_db_session_notes',
  appointments: 'nexo_db_appointments',
  goals:        'nexo_db_goals',
  habits:       'nexo_db_habits',
  seeded:       'nexo_db_seeded_v4', // v4: iconos en lugar de emojis
}

// ── Helpers de lectura/escritura ──────────────────────────
function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Datos demo ────────────────────────────────────────────
function generateDemoData() {
  const psychId   = 'demo_psych_001'
  const patientId = 'demo_patient_001'

  const users = [
    {
      id: psychId,
      name: 'Laura García',
      email: 'laura@nexomente.com',
      password: 'psicologo123',
      role: 'PSYCHOLOGIST',
      inviteCode: 'LAURA001',
      psychologistId: null,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    {
      id: patientId,
      name: 'Carlos Mendez',
      email: 'carlos@nexomente.com',
      password: 'paciente123',
      role: 'PATIENT',
      inviteCode: null,
      psychologistId: psychId,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  ]

  // Hábitos de demo para Carlos
  const habits = [
    { id: 'habit_1', userId: patientId, text: 'Tomar 2 litros de agua', icon: 'Droplet', order: 0, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: 'habit_2', userId: patientId, text: 'Leer 10 minutos', icon: 'BookOpen', order: 1, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: 'habit_3', userId: patientId, text: 'Salir a pasear', icon: 'Footprints', order: 2, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: 'habit_4', userId: patientId, text: 'Juntarme con amigos', icon: 'Users', order: 3, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  ]

  // ── Generador de 90 días de datos realistas ───────────────
  const SKIP_DAYS = new Set([7, 23, 38, 54, 71, 85]) // 6 días sin anotar

  const phrases = {
    low: [
      'Día difícil. Mucha presión en el trabajo y no pude desconectarme.',
      'Me costó levantarme. Pocas ganas de hacer cosas.',
      'No dormí bien, arrastré el cansancio todo el día.',
      'Sentí bastante ansiedad sin un motivo claro.',
      'Día muy pesado. Todo se acumuló y me abrumé.',
      'Me quedé encerrado en casa. No fue un buen día.',
      'Discusión por cosas tontas. Me quedé mal el resto del día.',
      'Sin energía. Postergué todo lo que tenía que hacer.',
    ],
    mid: [
      'Día regular. Cumplí con lo básico pero sin entusiasmo.',
      'Más o menos. Nada destacable, nada terrible.',
      'Trabajé bastante. Un poco cansado al final.',
      'Reunión que se extendió más de lo esperado. Salí bien parado igual.',
      'Día tranquilo. Me vino bien no tener tanto movimiento.',
      'Cumplí con mis obligaciones. Satisfecho pero sin mucha energía.',
      'Día normal. Me mantuve estable, que ya es algo.',
      'Tuve un momento de claridad entre tanta rutina.',
    ],
    high: [
      'Salí a caminar una hora. Me sentí mucho más liviano después.',
      'Hablé con amigos y me recargué de energía.',
      'Muy productivo hoy. Terminé antes y pude descansar.',
      'Dormí excelente y se notó en el humor. Todo fluyó mejor.',
      'Gran día. Me conecté con lo que realmente importa.',
      'Excelente comienzo de semana. Con ganas de todo.',
      'Me di tiempo para leer y desconectarme. Fue muy necesario.',
      'Agradecido por el día. Pequeñas cosas que hacen la diferencia.',
      'Todo salió bien hoy. Terminé el día con una sonrisa.',
      'Salí con mi familia. Momentos así son los que más valoro.',
    ],
    withAmigos: [
      'Me junté con amigos esta tarde. Era lo que necesitaba.',
      'Asado con el grupo. Me reí mucho, volví renovado.',
      'Café largo con un amigo. Hablamos de todo. Me hizo muy bien.',
      'Plan espontáneo con amigos. Terminé contento.',
    ],
    withPaseo: [
      'Salí a dar una vuelta y encontré que me despejaba la cabeza.',
      'Caminata larga por el parque. Llegué a casa distinto.',
      'Aproveché la tarde para salir a caminar. Necesario.',
      'Paseo de una hora. Simple pero efectivo para el ánimo.',
    ],
    withLeer: [
      'Leí antes de dormir. Me ayuda a desconectarme del trabajo.',
      'Buen rato de lectura. Me gusta ese tiempo para mí.',
      'Terminé el capítulo que tenía pendiente. Pequeño logro.',
    ],
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

  // Genera el mood del día con correlación de hábitos y tendencia temporal
  function dayMood(daysAgo, completedHabits) {
    // Tendencia: empieza en 4, mejora a 6.5 en 90 días con algo de ruido
    const progress = (90 - daysAgo) / 90
    const base = 4 + progress * 2.5

    // Ruido semanal: lunes bajo, viernes/sab alto
    const date = new Date(Date.now() - daysAgo * 86400000)
    const dow = date.getDay()
    const weekNoise = dow === 0 ? 0.3 : dow === 1 ? -0.4 : dow === 5 ? 0.5 : dow === 6 ? 0.6 : 0

    // Bonus de hábitos
    let habitBonus = 0
    if (completedHabits.includes('habit_3')) habitBonus += 1.8
    if (completedHabits.includes('habit_4')) habitBonus += 1.5
    if (completedHabits.includes('habit_2')) habitBonus += 0.9
    if (completedHabits.includes('habit_1')) habitBonus += 0.4

    // Ruido aleatorio pequeño
    const noise = (Math.random() - 0.5) * 1.2

    return clamp(Math.round(base + weekNoise + habitBonus * 0.6 + noise), 1, 10)
  }

  // Decide qué hábitos completó ese día (probabilidad aumenta con el tiempo)
  function dayHabits(daysAgo) {
    const progress = (90 - daysAgo) / 90   // 0 al principio, 1 al final
    const date = new Date(Date.now() - daysAgo * 86400000)
    const dow = date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const habits = []

    // habit_1 agua: alta prob siempre (60% → 85%)
    if (Math.random() < 0.6 + progress * 0.25) habits.push('habit_1')

    // habit_2 leer: crece con el tiempo (20% → 70%)
    if (Math.random() < 0.2 + progress * 0.5) habits.push('habit_2')

    // habit_3 pasear: más probable fines de semana, crece con el tiempo (15% → 65%)
    const pasearProb = isWeekend ? 0.35 + progress * 0.5 : 0.12 + progress * 0.45
    if (Math.random() < pasearProb) habits.push('habit_3')

    // habit_4 amigos: principalmente fines de semana (10% → 45% fds, 5% → 20% semana)
    const amigosProb = isWeekend ? 0.10 + progress * 0.35 : 0.05 + progress * 0.15
    if (Math.random() < amigosProb) habits.push('habit_4')

    return habits
  }

  function dayContent(completedHabits, mood) {
    if (completedHabits.includes('habit_4') && Math.random() < 0.7) return pick(phrases.withAmigos)
    if (completedHabits.includes('habit_3') && Math.random() < 0.65) return pick(phrases.withPaseo)
    if (completedHabits.includes('habit_2') && Math.random() < 0.5) return pick(phrases.withLeer)
    if (mood <= 4) return pick(phrases.low)
    if (mood <= 6) return pick(phrases.mid)
    return pick(phrases.high)
  }

  // Generar las entradas
  const journal = []
  for (let daysAgo = 89; daysAgo >= 1; daysAgo--) {
    if (SKIP_DAYS.has(daysAgo)) continue  // día sin anotar
    const completedHabits = dayHabits(daysAgo)
    const moodScore = dayMood(daysAgo, completedHabits)
    const content = dayContent(completedHabits, moodScore)
    const ts = new Date(Date.now() - daysAgo * 86400000)
    // Hora aleatoria entre 19:00 y 23:00
    ts.setHours(19 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0)
    journal.push({
      id: `demo_entry_d${daysAgo}`,
      patientId,
      moodScore,
      content,
      completedHabits,
      flaggedForSession: false,
      createdAt: ts.toISOString(),
      updatedAt: ts.toISOString(),
    })
  }

  write(KEYS.habits, habits)


  const sessionNotes = [
    {
      id: 'demo_note_1',
      psychologistId: psychId,
      patientId,
      title: 'Sesión inicial — evaluación',
      content: 'Primera sesión de evaluación. Carlos llega con síntomas de ansiedad laboral. Refiere dificultades para desconectarse del trabajo y episodios de insomnio. Estado de ánimo bajo (promedio 4/10 en sus registros). Se establece rapport adecuado. Plan: trabajar en técnicas de regulación emocional y límites laborales.',
      sessionDate: new Date(Date.now() - 85 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 85 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 85 * 86400000).toISOString(),
    },
    {
      id: 'demo_note_2',
      psychologistId: psychId,
      patientId,
      title: 'Sesión 2 — introducción de hábitos',
      content: 'Se propone incorporar hábitos simples: hidratación, lectura breve y caminatas. Carlos se muestra receptivo. Comenta que los fines de semana se siente mejor, lo que coincide con datos del diario. Se trabajará en mantener esa calidad de bienestar durante la semana.',
      sessionDate: new Date(Date.now() - 70 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 70 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 70 * 86400000).toISOString(),
    },
    {
      id: 'demo_note_3',
      psychologistId: psychId,
      patientId,
      title: 'Sesión 3 — técnicas de respiración',
      content: 'Se trabajó la técnica de respiración 4-4-4. Carlos reporta leve mejora en el sueño. Refiere que los días que sale a caminar se siente notablemente mejor. Se refuerza este hábito. Promedio de ánimo subiendo de 4 a 5 en las últimas semanas.',
      sessionDate: new Date(Date.now() - 55 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 55 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 55 * 86400000).toISOString(),
    },
    {
      id: 'demo_note_4',
      psychologistId: psychId,
      patientId,
      title: 'Sesión 4 — vínculos sociales',
      content: 'Revisión de hábitos: progreso sostenido en agua y caminatas. Se aborda el aislamiento social. Carlos comenta que cuando se junta con amigos su estado de ánimo mejora considerablemente. Se trabaja en planificar encuentros sociales de forma intencional. Ánimo promedio: 5.8/10.',
      sessionDate: new Date(Date.now() - 40 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
    {
      id: 'demo_note_5',
      psychologistId: psychId,
      patientId,
      title: 'Sesión 5 — revisión de objetivos',
      content: 'Buena sesión. Carlos muestra progreso notable. Completó el diario de forma consistente. Los datos muestran una tendencia clara: los días con caminatas y encuentros sociales presentan ánimos 1.5-2 puntos más altos en promedio. Se revisaron los objetivos terapéuticos y se agregó la meta de contacto social semanal.',
      sessionDate: new Date(Date.now() - 25 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'demo_note_6',
      psychologistId: psychId,
      patientId,
      title: 'Sesión 6 — consolidación',
      content: 'Excelente sesión. Ánimo promedio de las últimas dos semanas: 6.8/10. La mejora es clara y consistente. Carlos reconoce el impacto de los hábitos en su bienestar. Próximo foco: comunicación asertiva y gestión del tiempo en el trabajo para reducir la ansiedad laboral residual.',
      sessionDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ]

  const appointments = [
    {
      id: 'demo_appt_1',
      psychologistId: psychId,
      patientId,
      title: 'Sesión — Carlos Mendez',
      date: new Date(Date.now() + 3 * 86400000).toISOString(),
      duration: 50,
      notes: 'Continuar con trabajo de comunicación asertiva.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_appt_2',
      psychologistId: psychId,
      patientId: null,
      title: 'Supervisión clínica',
      date: new Date(Date.now() + 7 * 86400000).toISOString(),
      duration: 60,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_appt_3',
      psychologistId: psychId,
      patientId,
      title: 'Sesión — Carlos Mendez',
      date: new Date(Date.now() + 17 * 86400000).toISOString(),
      duration: 50,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  const goals = [
    {
      id: 'demo_goal_1',
      psychologistId: psychId,
      patientId,
      text: 'Hacer ejercicio físico al menos 3 veces por semana',
      completed: true,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'demo_goal_2',
      psychologistId: psychId,
      patientId,
      text: 'Escribir en el diario emocional todos los días',
      completed: true,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'demo_goal_3',
      psychologistId: psychId,
      patientId,
      text: 'Practicar técnica de respiración 4-4-4 en momentos de ansiedad',
      completed: false,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'demo_goal_4',
      psychologistId: psychId,
      patientId,
      text: 'Establecer límites claros con el trabajo (no revisar emails después de las 20h)',
      completed: false,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ]

  write(KEYS.users, users)
  write(KEYS.journal, journal)
  write(KEYS.sessionNotes, sessionNotes)
  write(KEYS.appointments, appointments)
  write(KEYS.goals, goals)
  write(KEYS.seeded, 'true')
}

// ── Inicialización ────────────────────────────────────────
export function initDb() {
  if (localStorage.getItem(KEYS.seeded) !== 'true') {
    generateDemoData()
  }
}

// ── AUTH ──────────────────────────────────────────────────
export function authLogin(email, password) {
  const users = read(KEYS.users)
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!user) throw new Error('Email o contraseña incorrectos.')
  const { password: _, ...safe } = user
  return { user: safe, token: `local_token_${user.id}` }
}

export function authRegister(name, email, password, role) {
  const users = read(KEYS.users)
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Ya existe una cuenta con ese email.')
  }
  const newUser = {
    id: genId(),
    name,
    email,
    password,
    role,
    inviteCode: role === 'PSYCHOLOGIST' ? Math.random().toString(36).slice(2, 10).toUpperCase() : null,
    psychologistId: null,
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  write(KEYS.users, users)
  const { password: _, ...safe } = newUser
  return { user: safe, token: `local_token_${newUser.id}` }
}

export function authLink(patientId, inviteCode) {
  const users = read(KEYS.users)
  const psych = users.find(u => u.inviteCode === inviteCode.toUpperCase() && u.role === 'PSYCHOLOGIST')
  if (!psych) throw new Error('Código de invitación inválido.')
  const idx = users.findIndex(u => u.id === patientId)
  if (idx === -1) throw new Error('Usuario no encontrado.')
  users[idx].psychologistId = psych.id
  write(KEYS.users, users)
  const { password: _, ...safe } = users[idx]
  return { user: safe, message: `¡Vinculado con ${psych.name}!` }
}

export function userUpdate(userId, newData) {
  const users = read(KEYS.users)
  const idx = users.findIndex(u => u.id === userId)
  if (idx === -1) throw new Error('Usuario no encontrado.')
  
  if (newData.name) users[idx].name = newData.name
  if (newData.email) {
    if (users.find(u => u.email.toLowerCase() === newData.email.toLowerCase() && u.id !== userId)) {
      throw new Error('Ese email ya está en uso.')
    }
    users[idx].email = newData.email
  }
  if (newData.password) users[idx].password = newData.password
  if (newData.avatar !== undefined) users[idx].avatar = newData.avatar
  
  write(KEYS.users, users)
  const { password: _, ...safe } = users[idx]
  return safe
}
// ── JOURNAL ───────────────────────────────────────────────
export function journalList(userId, role, patientId) {
  const all = read(KEYS.journal)
  let entries
  if (role === 'PSYCHOLOGIST' && patientId) {
    entries = all.filter(e => e.patientId === patientId)
  } else {
    entries = all.filter(e => e.patientId === userId)
  }
  return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function journalCreate(userId, { moodScore, content, completedHabits, habitData, entryDate }) {
  const all = read(KEYS.journal)
  const targetDateKey = entryDate || entryDateKey()
  const exists = all.find(e => e.patientId === userId && (e.entryDate === targetDateKey || entryDateKey(new Date(e.createdAt)) === targetDateKey))
  if (exists) {
    const err = new Error(`Ya existe una entrada para esta fecha (${targetDateKey}).`)
    err.status = 409
    throw err
  }
  // Derive completedHabits: include toggle habits + toggle+qty habits that are done
  const mergedCompleted = [...(completedHabits || [])]
  if (habitData) {
    Object.entries(habitData).forEach(([id, data]) => {
      if (data.done === true && !mergedCompleted.includes(id)) mergedCompleted.push(id)
    })
  }
  const entry = {
    id: genId(),
    patientId: userId,
    moodScore,
    content: content || '',
    completedHabits: mergedCompleted,
    habitData: habitData || {},
    flaggedForSession: false,
    entryDate: targetDateKey,
    createdAt: `${targetDateKey}T12:00:00`,
    updatedAt: new Date().toISOString(),
  }
  all.push(entry)
  write(KEYS.journal, all)
  return entry
}

export function journalUpdate(userId, entryId, { moodScore, content, completedHabits, habitData }) {
  const all = read(KEYS.journal)
  const idx = all.findIndex(e => e.id === entryId && e.patientId === userId)
  if (idx === -1) throw new Error('Entrada no encontrada.')
  // Derive completedHabits
  const mergedCompleted = [...(completedHabits || [])]
  if (habitData) {
    Object.entries(habitData).forEach(([id, data]) => {
      if (data.done === true && !mergedCompleted.includes(id)) mergedCompleted.push(id)
    })
  }
  all[idx] = {
    ...all[idx],
    moodScore,
    content,
    completedHabits: mergedCompleted,
    habitData: habitData || all[idx].habitData || {},
    updatedAt: new Date().toISOString(),
  }
  write(KEYS.journal, all)
  return all[idx]
}

export function journalDelete(userId, entryId) {
  const all = read(KEYS.journal)
  const filtered = all.filter(e => !(e.id === entryId && e.patientId === userId))
  write(KEYS.journal, filtered)
}

// ── PATIENTS ──────────────────────────────────────────────
export function patientsList(psychId) {
  const users = read(KEYS.users)
  const journal = read(KEYS.journal)
  const patients = users.filter(u => u.psychologistId === psychId && u.role === 'PATIENT')
  return patients.map(p => {
    const entries = journal.filter(e => e.patientId === p.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const lastEntry = entries[0]
    const last3 = entries.slice(0, 3)
    const hasAlert = last3.length >= 3 && last3.every(e => e.moodScore <= 3)
    const daysSinceLast = lastEntry
      ? Math.floor((Date.now() - new Date(lastEntry.createdAt)) / 86400000)
      : null
    const { password: _, ...safe } = p
    return {
      ...safe,
      totalEntries: entries.length,
      lastMood: lastEntry?.moodScore ?? null,
      lastEntryDate: lastEntry?.createdAt ?? null,
      hasAlert,
      hasInactivityAlert: daysSinceLast !== null && daysSinceLast >= 5,
      daysSinceLastEntry: daysSinceLast,
    }
  })
}

export function patientInsights(psychId, patientId) {
  const journal = read(KEYS.journal)
  const entries = journal.filter(e => e.patientId === patientId)
  const now = new Date()

  const weekAgo  = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)

  const thisWeek = entries.filter(e => new Date(e.createdAt) >= weekAgo)
  const lastWeek = entries.filter(e => new Date(e.createdAt) >= twoWeeksAgo && new Date(e.createdAt) < weekAgo)
  const last14   = entries.filter(e => new Date(e.createdAt) >= twoWeeksAgo)

  const avg = (arr) => arr.length ? (arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(1) : null
  const avgThisWeek = avg(thisWeek)
  const avgLastWeek = avg(lastWeek)
  const trend = avgThisWeek && avgLastWeek ? (parseFloat(avgThisWeek) - parseFloat(avgLastWeek)).toFixed(1) : null

  // Hábitos más frecuentes en las últimas 2 semanas
  const habitCount = {}
  last14.forEach(e => (e.completedHabits || []).forEach(h => { habitCount[h] = (habitCount[h] || 0) + 1 }))
  const topHabits = Object.entries(habitCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([habitId, count]) => ({ habitId, count }))

  return { avgThisWeek, avgLastWeek, trend, topHabits, entriesThisWeek: thisWeek.length }
}

// ── APPOINTMENTS ──────────────────────────────────────────
export function appointmentsList(userId, role) {
  const all = read(KEYS.appointments)
  const now = new Date()
  let appts
  if (role === 'PSYCHOLOGIST') {
    appts = all.filter(a => a.psychologistId === userId)
  } else {
    appts = all.filter(a => a.patientId === userId && new Date(a.date) >= now)
  }
  return appts.sort((a, b) => new Date(a.date) - new Date(b.date))
}

export function appointmentCreate(psychId, data) {
  const all = read(KEYS.appointments)
  const appt = { id: genId(), psychologistId: psychId, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  all.push(appt)
  write(KEYS.appointments, all)
  return appt
}

export function appointmentUpdate(psychId, apptId, data) {
  const all = read(KEYS.appointments)
  const idx = all.findIndex(a => a.id === apptId && a.psychologistId === psychId)
  if (idx === -1) throw new Error('Cita no encontrada.')
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() }
  write(KEYS.appointments, all)
  return all[idx]
}

export function appointmentDelete(psychId, apptId) {
  const all = read(KEYS.appointments)
  write(KEYS.appointments, all.filter(a => !(a.id === apptId && a.psychologistId === psychId)))
}

// ── SESSION NOTES ─────────────────────────────────────────
export function sessionNotesList(patientId) {
  const all = read(KEYS.sessionNotes)
  return all.filter(n => n.patientId === patientId).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
}

export function sessionNoteCreate(psychId, patientId, { title, content, sessionDate }) {
  const all = read(KEYS.sessionNotes)
  const note = {
    id: genId(),
    psychologistId: psychId,
    patientId,
    title: title || '',
    content: content || '',
    sessionDate: sessionDate || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  all.push(note)
  write(KEYS.sessionNotes, all)
  return note
}

export function sessionNoteUpdate(psychId, noteId, { title, content }) {
  const all = read(KEYS.sessionNotes)
  const idx = all.findIndex(n => n.id === noteId && n.psychologistId === psychId)
  if (idx === -1) throw new Error('Nota no encontrada.')
  all[idx] = { ...all[idx], title, content, updatedAt: new Date().toISOString() }
  write(KEYS.sessionNotes, all)
  return all[idx]
}

export function sessionNoteDelete(psychId, noteId) {
  const all = read(KEYS.sessionNotes)
  write(KEYS.sessionNotes, all.filter(n => !(n.id === noteId && n.psychologistId === psychId)))
}

// ── GOALS ─────────────────────────────────────────────────
export function goalsList(patientId) {
  return read(KEYS.goals).filter(g => g.patientId === patientId)
}

export function goalCreate(psychId, patientId, { text }) {
  const all = read(KEYS.goals)
  const goal = {
    id: genId(),
    psychologistId: psychId,
    patientId,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  all.push(goal)
  write(KEYS.goals, all)
  return goal
}

export function goalToggle(goalId) {
  const all = read(KEYS.goals)
  const idx = all.findIndex(g => g.id === goalId)
  if (idx === -1) throw new Error('Objetivo no encontrado.')
  all[idx].completed = !all[idx].completed
  all[idx].updatedAt = new Date().toISOString()
  write(KEYS.goals, all)
  return all[idx]
}

export function goalDelete(goalId) {
  write(KEYS.goals, read(KEYS.goals).filter(g => g.id !== goalId))
}

// ── HABITS ────────────────────────────────────────────────
export function habitsList(userId) {
  return read(KEYS.habits)
    .filter(h => h.userId === userId)
    .sort((a, b) => a.order - b.order)
}

export function habitCreate(userId, { text, icon = 'CheckCircle', trackingType = 'toggle', unit = '', hasNote = false }) {
  const all = read(KEYS.habits)
  const userHabits = all.filter(h => h.userId === userId)
  const habit = {
    id: genId(),
    userId,
    text,
    icon,
    trackingType, // 'toggle' | 'toggle+qty' | 'qty'
    unit,         // e.g. 'km', 'horas', 'vasos'
    hasNote,      // boolean: show optional freetext per entry
    order: userHabits.length,
    createdAt: new Date().toISOString(),
  }
  all.push(habit)
  write(KEYS.habits, all)
  return habit
}

export function habitUpdate(userId, habitId, { text, icon, trackingType, unit, hasNote }) {
  const all = read(KEYS.habits)
  const idx = all.findIndex(h => h.id === habitId && h.userId === userId)
  if (idx === -1) throw new Error('Hábito no encontrado.')
  if (text !== undefined) all[idx].text = text
  if (icon !== undefined) all[idx].icon = icon
  if (trackingType !== undefined) all[idx].trackingType = trackingType
  if (unit !== undefined) all[idx].unit = unit
  if (hasNote !== undefined) all[idx].hasNote = hasNote
  write(KEYS.habits, all)
  return all[idx]
}

export function habitDelete(userId, habitId) {
  // Remove habit from all journal entries too
  const journal = read(KEYS.journal)
  journal.forEach(e => {
    if (e.completedHabits) {
      e.completedHabits = e.completedHabits.filter(id => id !== habitId)
    }
    if (e.habitData && e.habitData[habitId] !== undefined) {
      delete e.habitData[habitId]
    }
  })
  write(KEYS.journal, journal)
  write(KEYS.habits, read(KEYS.habits).filter(h => !(h.id === habitId && h.userId === userId)))
}

// ── HABIT CORRELATION (análisis exhaustivo) ───────────
export function habitCorrelation(userId) {
  const habits = habitsList(userId)
  const entries = read(KEYS.journal).filter(e => e.patientId === userId)
  if (entries.length < 5) return []

  const avg = arr => arr.length
    ? parseFloat((arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(2))
    : null

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
      const isDone = e => e.habitData?.[habit.id]?.done === true
      const withH = entries.filter(isDone)
      const withoutH = entries.filter(e => !isDone(e))
      const avgWith = avg(withH)
      const avgWithout = avg(withoutH)
      const impact = avgWith !== null && avgWithout !== null
        ? parseFloat((avgWith - avgWithout).toFixed(2)) : null
      const consistencyPct = entries.length
        ? Math.round((withH.length / entries.length) * 100) : 0

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
