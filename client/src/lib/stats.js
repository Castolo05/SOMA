// ============================================================
// Métricas del diario compartidas por la vista del paciente y la del
// psicólogo, para que ambos vean los mismos números.
// ============================================================
import { entryDateKey } from './constants'

// ── Patient insights ────────────────────────────────────
// Las ventanas se miden por día de entrada (entryDate), no por instante:
// "esta semana" son hoy y los 6 días anteriores.
export function daysAgoKey(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return entryDateKey(d)
}

const avgMood = arr => arr.length ? (arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(1) : null

export function weeklyMood(entries) {
  const weekStart = daysAgoKey(6)
  const prevWeekStart = daysAgoKey(13)
  const thisWeek = entries.filter(e => e.entryDate >= weekStart)
  const lastWeek = entries.filter(e => e.entryDate >= prevWeekStart && e.entryDate < weekStart)
  const avgThisWeek = avgMood(thisWeek)
  const avgLastWeek = avgMood(lastWeek)
  const trend = avgThisWeek && avgLastWeek ? (parseFloat(avgThisWeek) - parseFloat(avgLastWeek)).toFixed(1) : null
  return { thisWeek, avgThisWeek, avgLastWeek, trend }
}

export function computeInsights(entries) {
  const { thisWeek, avgThisWeek, avgLastWeek, trend } = weeklyMood(entries)
  // Últimos 14 días: hoy y los 13 anteriores.
  const last14 = entries.filter(e => e.entryDate >= daysAgoKey(13))
  const avgLast14 = avgMood(last14)
  const habitCount = {}
  last14.forEach(e => (e.completedHabits || []).forEach(h => { habitCount[h] = (habitCount[h] || 0) + 1 }))
  const topHabits = Object.entries(habitCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([habitId, count]) => ({ habitId, count }))
  // Racha: días consecutivos con registro que terminan hoy, o ayer si hoy
  // todavía no registró. Si el último registro es más viejo, la racha es 0.
  const days = new Set(entries.map(e => e.entryDate))
  let streakDays = 0
  let offset = days.has(daysAgoKey(0)) ? 0 : 1
  while (days.has(daysAgoKey(offset))) { streakDays++; offset++ }
  const totalEntries = entries.length
  const bestMood = entries.length ? Math.max(...entries.map(e => e.moodScore)) : null
  const worstMood = entries.length ? Math.min(...entries.map(e => e.moodScore)) : null
  return { avgThisWeek, avgLastWeek, avgLast14, trend, topHabits, entriesThisWeek: thisWeek.length, streakDays, totalEntries, bestMood, worstMood }
}

// ── Correlación hábito-ánimo ────────────────────────────
// Cada hábito se analiza solo desde que existe (o desde el primer día en que
// se registró, si el paciente cargó días anteriores). Un día sin cantidad
// registrada no cuenta como 0: se excluye.
//
// Dos preguntas distintas por hábito:
// - compare: ¿el ánimo es distinto los días que se hace vs. los que no?
//   (hábitos sí/no y sí/no + cantidad). Su fuerza se mide sobre el ánimo
//   ajustado por la tendencia de esa semana, para que un hábito no parezca
//   bueno solo porque empezó cuando el paciente ya venía mejorando.
// - dose: entre los días con cantidad, ¿más cantidad acompaña mejor ánimo?
//   (hábitos de cantidad y sí/no + cantidad, solo días cumplidos).
// Ambas se miden también contra el ánimo del día siguiente.

// Mínimo de días en cada grupo (con / sin hábito) para comparar promedios.
export const MIN_DAYS_PER_GROUP = 5
// Mínimo de registros para estimar la correlación cantidad-ánimo.
export const MIN_POINTS_FOR_R = 10

// Umbrales únicos para todas las vistas. La fuerza combina el tamaño del
// efecto con un estadístico t aproximado (|t| ≥ 2 ≈ p < 0,05).
export const STRENGTH_THRESHOLDS = {
  minDiff: 0.3,   // diferencia de promedios por debajo de la cual no hay efecto
  minR: 0.15,     // |r| por debajo del cual no hay relación
  weakT: 1,       // |t| menor: sin señal
  solidT: 2,      // |t| menor: señal débil
  // El día siguiente es una segunda prueba sobre el mismo hábito: se le
  // exige más para no inflar los falsos positivos al quedarse con la mejor.
  solidTNextDay: 2.5,
  clearD: 0.5,    // d de Cohen desde el que la señal es clara
  clearR: 0.4,    // |r| desde el que la señal es clara
}
export const STRENGTH_RANK = { none: 0, weak: 1, moderate: 2, clear: 3 }

// Ventana centrada (±3 días) para estimar la tendencia del ánimo.
const TREND_WINDOW = 3

const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length
const round = (v, digits = 2) => parseFloat(v.toFixed(digits))

const addDaysKey = (key, n) => {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + n)
  return entryDateKey(d)
}

const parseQty = (value) => {
  if (value === undefined || value === null || value === '') return null
  const qty = parseFloat(value)
  return Number.isFinite(qty) ? qty : null
}

function classifyDiff(diff, t, d, solidT) {
  const T = STRENGTH_THRESHOLDS
  if (Math.abs(diff) < T.minDiff || Math.abs(t) < T.weakT) return 'none'
  if (Math.abs(t) < solidT) return 'weak'
  return Math.abs(d) >= T.clearD ? 'clear' : 'moderate'
}

function classifyR(r, n, solidT) {
  const T = STRENGTH_THRESHOLDS
  const t = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt((n - 2) / (1 - r * r))
  if (Math.abs(r) < T.minR || Math.abs(t) < T.weakT) return 'none'
  if (Math.abs(t) < solidT) return 'weak'
  return Math.abs(r) >= T.clearR ? 'clear' : 'moderate'
}

// Diferencia de medias con t de Welch y d de Cohen.
function diffStats(a, b, solidT) {
  const n1 = a.length, n2 = b.length
  const m1 = mean(a), m2 = mean(b)
  const v1 = a.reduce((s, x) => s + (x - m1) ** 2, 0) / (n1 - 1)
  const v2 = b.reduce((s, x) => s + (x - m2) ** 2, 0) / (n2 - 1)
  const diff = m1 - m2
  const se = Math.sqrt(v1 / n1 + v2 / n2)
  const sd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
  const t = se === 0 ? (diff === 0 ? 0 : Infinity) : diff / se
  const d = sd === 0 ? (diff === 0 ? 0 : Infinity) : diff / sd
  return { diff, strength: classifyDiff(diff, t, d, solidT) }
}

// Pearson r entre dos arrays del mismo largo
function pearson(xs, ys) {
  const n = xs.length
  if (n < MIN_POINTS_FOR_R) return null
  const mx = mean(xs), my = mean(ys)
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? null : round(num / denom, 3)
}

// Línea de tendencia (least-squares) para el scatter chart
function trendLine(points) {
  const n = points.length
  if (n < 3) return null
  const mx = mean(points.map(p => p.qty))
  const my = mean(points.map(p => p.mood))
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
    { qty: xMin, mood: round(slope * xMin + intercept) },
    { qty: xMax, mood: round(slope * xMax + intercept) },
  ]
}

// rows: [{ has: bool, mood, adjusted }] → comparación con / sin hábito.
function compareGroups(rows, solidT) {
  const withH = rows.filter(r => r.has)
  const withoutH = rows.filter(r => !r.has)
  const base = {
    countWith: withH.length,
    countWithout: withoutH.length,
    avgWith: withH.length ? round(mean(withH.map(r => r.mood))) : null,
    avgWithout: withoutH.length ? round(mean(withoutH.map(r => r.mood))) : null,
  }
  if (withH.length < MIN_DAYS_PER_GROUP || withoutH.length < MIN_DAYS_PER_GROUP) {
    return { ...base, ready: false }
  }
  const raw = diffStats(withH.map(r => r.mood), withoutH.map(r => r.mood), solidT)
  const adjWith = withH.filter(r => r.adjusted !== null).map(r => r.adjusted)
  const adjWithout = withoutH.filter(r => r.adjusted !== null).map(r => r.adjusted)
  const adj = adjWith.length >= MIN_DAYS_PER_GROUP && adjWithout.length >= MIN_DAYS_PER_GROUP
    ? diffStats(adjWith, adjWithout, solidT)
    : null
  const strength = adj ? adj.strength : raw.strength
  return {
    ...base,
    ready: true,
    impact: round(raw.diff),
    adjustedImpact: adj ? round(adj.diff) : null,
    strength,
    // La diferencia cruda parece clara pero desaparece al descontar la
    // tendencia: probablemente refleja cómo venía el ánimo esas semanas.
    explainedByTrend: adj !== null
      && STRENGTH_RANK[raw.strength] >= STRENGTH_RANK.moderate
      && STRENGTH_RANK[adj.strength] <= STRENGTH_RANK.weak,
    direction: Math.sign(adj ? adj.diff : raw.diff),
  }
}

function doseStats(points, solidT) {
  const r = pearson(points.map(p => p.qty), points.map(p => p.mood))
  return {
    points: points.length >= 3 ? points : null,
    n: points.length,
    ready: r !== null,
    r,
    // Sin r confiable no se dibuja tendencia: con pocos puntos sería ruido.
    trend: r !== null ? trendLine(points) : null,
    strength: r !== null ? classifyR(r, points.length, solidT) : null,
    direction: r !== null ? Math.sign(r) : 0,
  }
}

// La señal más fuerte del hábito; ante empate gana el mismo día y la
// comparación con / sin, que son más fáciles de leer.
function pickHeadline(candidates) {
  let best = null
  for (const c of candidates) {
    if (!c.stats?.ready) continue
    if (!best || STRENGTH_RANK[c.stats.strength] > STRENGTH_RANK[best.strength]) {
      best = { source: c.source, nextDay: c.nextDay, strength: c.stats.strength, direction: c.stats.direction }
    }
  }
  return best
}

// periodDays: null = todo el historial; n = hoy y los n-1 días anteriores.
export function computeCorrelation(habits, entries, { periodDays = null } = {}) {
  // Ánimo promedio por día, sobre todo el historial (para tendencia y día siguiente).
  const moodsByDay = new Map()
  for (const e of entries) {
    if (!moodsByDay.has(e.entryDate)) moodsByDay.set(e.entryDate, [])
    moodsByDay.get(e.entryDate).push(e.moodScore)
  }
  const dayMood = key => moodsByDay.has(key) ? mean(moodsByDay.get(key)) : null

  // Ánimo de un día menos el promedio de los días vecinos (sin contar ese día).
  const adjustedMood = (key, mood) => {
    const around = []
    for (let k = -TREND_WINDOW; k <= TREND_WINDOW; k++) {
      const near = k !== 0 && moodsByDay.get(addDaysKey(key, k))
      if (near) around.push(...near)
    }
    return mood !== null && around.length ? mood - mean(around) : null
  }

  const windowStart = periodDays ? daysAgoKey(periodDays - 1) : null
  const inPeriod = windowStart ? entries.filter(e => e.entryDate >= windowStart) : entries

  return habits.map(habit => {
    const type = habit.trackingType || 'toggle'
    const qtyOf = e => parseQty(e.habitData?.[habit.id]?.qty)
    const hasRecord = e => type === 'toggle'
      ? (e.completedHabits || []).includes(habit.id)
      : e.habitData?.[habit.id] !== undefined
    const isDone = type === 'toggle'
      ? hasRecord
      : e => e.habitData?.[habit.id]?.done === true

    const habitStart = habit.createdAt ? entryDateKey(habit.createdAt) : null
    const firstRecord = entries.filter(hasRecord).map(e => e.entryDate).sort()[0]
    const since = [habitStart, firstRecord].filter(Boolean).sort()[0]
    const relevant = since ? inPeriod.filter(e => e.entryDate >= since) : inPeriod

    const nextDayMood = e => dayMood(addDaysKey(e.entryDate, 1))
    const nextDayAdjusted = e => adjustedMood(addDaysKey(e.entryDate, 1), nextDayMood(e))

    let compare = null, compareNextDay = null, dose = null, doseNextDay = null
    let daysDone

    if (type === 'toggle' || type === 'toggle+qty') {
      const rows = relevant.map(e => ({ has: isDone(e), mood: e.moodScore, adjusted: adjustedMood(e.entryDate, e.moodScore) }))
      compare = compareGroups(rows, STRENGTH_THRESHOLDS.solidT)
      const nextRows = relevant
        .map(e => ({ has: isDone(e), mood: nextDayMood(e), adjusted: nextDayAdjusted(e) }))
        .filter(r => r.mood !== null)
      compareNextDay = compareGroups(nextRows, STRENGTH_THRESHOLDS.solidTNextDay)
      daysDone = compare.countWith
    }

    if (type === 'qty' || type === 'toggle+qty') {
      // En sí/no + cantidad solo cuentan los días cumplidos: el "no hecho"
      // ya lo mide la comparación con / sin.
      const withQty = relevant.filter(e => qtyOf(e) !== null && (type === 'qty' || isDone(e)))
      dose = doseStats(withQty.map(e => ({ qty: qtyOf(e), mood: e.moodScore })), STRENGTH_THRESHOLDS.solidT)
      doseNextDay = doseStats(withQty
        .map(e => ({ qty: qtyOf(e), mood: nextDayMood(e) }))
        .filter(p => p.mood !== null), STRENGTH_THRESHOLDS.solidTNextDay)
      if (type === 'qty') daysDone = withQty.length
    }

    const headline = pickHeadline([
      { source: 'compare', nextDay: false, stats: compare },
      { source: 'dose', nextDay: false, stats: dose },
      { source: 'compare', nextDay: true, stats: compareNextDay },
      { source: 'dose', nextDay: true, stats: doseNextDay },
    ])

    return {
      habitId: habit.id,
      text: habit.text,
      icon: habit.icon,
      trackingType: type,
      unit: habit.unit || '',
      daysTracked: relevant.length,
      consistencyPct: relevant.length ? Math.round((daysDone / relevant.length) * 100) : 0,
      compare, compareNextDay, dose, doseNextDay,
      headline,
    }
  })
}

// Orden: señales más fuertes primero; dentro de la misma fuerza, positivas antes.
export function sortCorrelation(items) {
  const score = it => it.headline
    ? STRENGTH_RANK[it.headline.strength] * 2 + (it.headline.direction > 0 ? 1 : 0)
    : -1
  return [...items].sort((a, b) => score(b) - score(a))
}
