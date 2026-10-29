// ============================================================
// Métricas del diario compartidas por la vista del paciente y la del
// psicólogo, para que ambos vean los mismos números.
// ============================================================
import { entryDateKey } from './constants'

// Mínimo de días en cada grupo (con / sin hábito) para comparar promedios.
export const MIN_DAYS_PER_GROUP = 5
// Mínimo de registros para estimar la correlación cantidad-ánimo.
export const MIN_POINTS_FOR_R = 10

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
export function computeCorrelation(habits, entries) {
  if (entries.length < 5) return []

  const avg = arr => arr.length
    ? parseFloat((arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(2))
    : null

  // Diferencia de promedios solo si ambos grupos tienen datos suficientes.
  const impactOf = (withH, withoutH) =>
    withH.length >= MIN_DAYS_PER_GROUP && withoutH.length >= MIN_DAYS_PER_GROUP
      ? parseFloat((avg(withH) - avg(withoutH)).toFixed(2))
      : null

  const parseQty = (value) => {
    if (value === undefined || value === null || value === '') return null
    const qty = parseFloat(value)
    return Number.isFinite(qty) ? qty : null
  }

  // Pearson r entre dos arrays del mismo largo
  function pearson(xs, ys) {
    const n = xs.length
    if (n < MIN_POINTS_FOR_R) return null
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

  function scatterStats(scatterPoints) {
    const pearsonR = pearson(scatterPoints.map(x => x.qty), scatterPoints.map(x => x.mood))
    return {
      scatterPoints: scatterPoints.length >= 3 ? scatterPoints : null,
      // Sin r confiable no se dibuja tendencia: con pocos puntos sería ruido.
      trend: pearsonR !== null ? trendLine(scatterPoints) : null,
      pearsonR,
    }
  }

  const result = habits.map(habit => {
    const type = habit.trackingType || 'toggle'
    const hasRecord = e => type === 'toggle'
      ? (e.completedHabits || []).includes(habit.id)
      : e.habitData?.[habit.id] !== undefined
    const habitStart = habit.createdAt ? entryDateKey(habit.createdAt) : null
    const firstRecord = entries.filter(hasRecord).map(e => e.entryDate).sort()[0]
    const since = [habitStart, firstRecord].filter(Boolean).sort()[0]
    const relevant = since ? entries.filter(e => e.entryDate >= since) : entries
    const consistencyPct = days => relevant.length ? Math.round((days / relevant.length) * 100) : 0
    const base = { habitId: habit.id, text: habit.text, icon: habit.icon, trackingType: type }

    if (type === 'toggle') {
      // ── Hábito binario ──
      const withH = relevant.filter(hasRecord)
      const withoutH = relevant.filter(e => !hasRecord(e))
      return {
        ...base,
        avgWith: avg(withH), avgWithout: avg(withoutH), impact: impactOf(withH, withoutH),
        countWith: withH.length, countWithout: withoutH.length,
        consistencyPct: consistencyPct(withH.length),
        scatterPoints: null, trend: null, pearsonR: null,
      }
    }

    if (type === 'toggle+qty') {
      // ── Hábito toggle + cantidad ──
      const isDone = e => e.habitData?.[habit.id]?.done === true
      const withH = relevant.filter(isDone)
      const withoutH = relevant.filter(e => !isDone(e))

      // No hecho = 0; hecho sin cantidad registrada = sin dato.
      const scatterPoints = relevant
        .map(e => {
          if (!isDone(e)) return { qty: 0, mood: e.moodScore }
          const qty = parseQty(e.habitData?.[habit.id]?.qty)
          return qty !== null ? { qty, mood: e.moodScore } : null
        })
        .filter(Boolean)

      return {
        ...base,
        avgWith: avg(withH), avgWithout: avg(withoutH), impact: impactOf(withH, withoutH),
        countWith: withH.length, countWithout: withoutH.length,
        consistencyPct: consistencyPct(withH.length),
        ...scatterStats(scatterPoints),
        unit: habit.unit || '',
      }
    }

    if (type === 'qty') {
      // ── Hábito solo cantidad (sin toggle) ──
      const withQty = relevant.filter(e => parseQty(e.habitData?.[habit.id]?.qty) !== null)
      const withoutH = relevant.filter(e => parseQty(e.habitData?.[habit.id]?.qty) === null)
      const scatterPoints = withQty.map(e => ({
        qty: parseQty(e.habitData[habit.id].qty),
        mood: e.moodScore,
      }))

      return {
        ...base,
        avgWith: avg(withQty), avgWithout: avg(withoutH), impact: impactOf(withQty, withoutH),
        countWith: withQty.length, countWithout: withoutH.length,
        consistencyPct: consistencyPct(withQty.length),
        ...scatterStats(scatterPoints),
        unit: habit.unit || '',
      }
    }

    return null
  }).filter(r => r !== null && (
    r.trackingType === 'toggle+qty'
      ? r.scatterPoints?.length >= 3
      : r.countWith >= 3
  ))

  return result
}
