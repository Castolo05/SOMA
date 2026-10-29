import { useMemo, useState } from 'react'
import {
  BarChart2, TrendingUp, TrendingDown, Minus, Sparkles, Hourglass, MessageCircle,
} from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MOOD_ICONS, HABIT_ICONS } from '../lib/constants'
import {
  computeCorrelation, sortCorrelation, MIN_DAYS_PER_GROUP, MIN_POINTS_FOR_R, STRENGTH_RANK,
} from '../lib/stats'

// Colores del tema (src/theme.css): cambian solos entre claro y oscuro.
const TONES = {
  positive: { color: 'var(--ok-text)', bg: 'var(--ok-bg)' },
  // En la vista del paciente un hábito asociado a días bajos no es una alarma.
  negative: { color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  negativeSoft: { color: 'var(--warn-text)', bg: 'var(--warn-bg)' },
  neutral: { color: 'var(--theme-muted)', bg: 'var(--theme-inset)' },
}

const STRENGTH_LABEL = {
  none: 'Sin efecto claro',
  weak: 'Señal débil',
  moderate: 'Señal moderada',
  clear: 'Señal clara',
}

const PERIODS = [
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: null, label: 'Todo' },
]

const TYPE_LABEL = { toggle: 'Sí / No', qty: 'Cantidad', 'toggle+qty': 'Sí/No + cantidad' }

const fmt = (v, digits = 1) => Number(v).toFixed(digits)
const signed = (v, digits = 1) => `${v > 0 ? '+' : ''}${fmt(v, digits)}`
const moodConfig = v => MOOD_ICONS[Math.min(10, Math.max(1, Math.round(v)))]
const moodColor = v => moodConfig(v)?.color
const moodText = v => moodConfig(v)?.text

function toneOf(headline) {
  if (!headline || STRENGTH_RANK[headline.strength] < STRENGTH_RANK.moderate || headline.direction === 0) {
    return TONES.neutral
  }
  if (headline.direction > 0) return TONES.positive
  return TONES.negative
}

// ── Textos para el psicólogo ───────────────────────────────────
function narrative(item) {
  const h = item.headline
  const c = h.nextDay ? item.compareNextDay : item.compare
  const d = h.nextDay ? item.doseNextDay : item.dose

  if (h.strength === 'none') {
    return item.compare?.explainedByTrend
      ? `La diferencia cruda (${signed(item.compare.impact)}) casi desaparece al ajustar por la tendencia semanal (${signed(item.compare.adjustedImpact)}): probablemente refleja la evolución general del ánimo.`
      : 'Sin efecto claro con los datos actuales.'
  }

  if (h.source === 'compare') {
    let text = `${h.nextDay ? 'Ánimo del día siguiente' : 'Ánimo'} con el hábito ${c.avgWith} vs ${c.avgWithout} sin él (${signed(c.impact)}; ajustado por tendencia ${signed(c.adjustedImpact ?? c.impact)}).`
    if (h.direction < 0 && !h.nextDay) text += ' Posible conducta reactiva o de afrontamiento: se realiza en días de ánimo bajo.'
    return text
  }
  return `Cantidad vs. ánimo${h.nextDay ? ' del día siguiente' : ''}: r = ${signed(d.r, 2)} (n = ${d.n}).`
}

// ── Textos para el paciente: sin números técnicos ni jerga ─────
const plain = v => Number(v).toLocaleString('es-AR', { maximumFractionDigits: 1 })

function patientSentence(item) {
  const h = item.headline
  const positive = h.direction > 0
  if (h.source === 'compare') {
    if (h.nextDay) {
      return positive
        ? 'El día después de hacerlo, tu ánimo suele estar mejor.'
        : 'El día después de hacerlo, tu ánimo suele estar más bajo.'
    }
    return positive
      ? 'Los días que lo hacés, tu ánimo suele estar mejor.'
      : 'Aparece más en los días en que estás más bajo. Quizás es algo que te ayuda a sostenerte.'
  }
  const more = item.unit || 'cantidad'
  return `Cuando registrás más ${more}, tu ánimo${h.nextDay ? ' del día siguiente' : ''} suele estar ${positive ? 'mejor' : 'más bajo'}.`
}

function patientDetail(item) {
  const h = item.headline
  if (h.source !== 'compare') return null
  const c = h.nextDay ? item.compareNextDay : item.compare
  return {
    label: h.nextDay ? 'Ánimo del día siguiente' : 'Ánimo promedio',
    withValue: c.avgWith,
    withoutValue: c.avgWithout,
  }
}

// ── Comparación con / sin en escala acotada ───────────────────
// Las barras de 0 a 10 aplastaban diferencias de medio punto: acá la escala
// se ajusta a los dos valores para que la distancia entre ellos se vea.
function MoodCompare({ stats, title }) {
  const { avgWith, avgWithout, countWith, countWithout } = stats
  const lo = Math.max(1, Math.floor(Math.min(avgWith, avgWithout)) - 1)
  const hi = Math.min(10, Math.ceil(Math.max(avgWith, avgWithout)) + 1)
  const pos = v => `${((v - lo) / (hi - lo)) * 100}%`
  const left = Math.min(avgWith, avgWithout)
  const right = Math.max(avgWith, avgWithout)

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 font-semibold mb-2">{title}</p>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: moodColor(avgWith) }} />
          Con el hábito <span className="text-gray-400">({countWith} días)</span>
        </span>
        <span className="font-bold" style={{ color: moodText(avgWith) }}>{avgWith}/10</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2.5">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-gray-400" />
          Sin el hábito <span className="text-gray-400">({countWithout} días)</span>
        </span>
        <span className="font-bold text-gray-400">{avgWithout}/10</span>
      </div>
      <div className="relative h-3 mx-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ left: pos(left), width: `calc(${pos(right)} - ${pos(left)})`, backgroundColor: 'var(--theme-border-strong)' }}
        />
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-400 bg-white dark:bg-gray-800"
          style={{ left: pos(avgWithout) }}
        />
        <span
          className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: pos(avgWith), backgroundColor: moodColor(avgWith) }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{lo}</span>
        <span>Ánimo</span>
        <span>{hi}</span>
      </div>
    </div>
  )
}

// ── Tooltip personalizado para el scatter chart ────────────────
function ScatterTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d || d.isTrend) return null
  const moodIcon = MOOD_ICONS[Math.round(d.mood)]
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200">
        {moodIcon?.emoji ?? ''} Ánimo: <span style={{ color: moodIcon?.text }}>{d.mood}/10</span>
      </p>
      <p className="text-gray-400 mt-0.5">
        Cantidad: <strong className="text-gray-600 dark:text-gray-300">{d.qty}{unit ? ` ${unit}` : ''}</strong>
      </p>
    </div>
  )
}

// ── Scatter chart cantidad vs ánimo ───────────────────────────
function HabitScatterChart({ dose, unit, onlyDoneDays }) {
  const { points, trend, r, strength } = dose

  const tone = toneOf(r !== null ? { strength, direction: Math.sign(r) } : null)

  const trendPoints = (() => {
    if (!trend || trend.length < 2 || trend[0].qty === trend[1].qty) return null

    const [t0, t1] = trend
    const slope = (t1.mood - t0.mood) / (t1.qty - t0.qty)
    const intercept = t0.mood - slope * t0.qty
    const clampX = y => (slope !== 0 ? (y - intercept) / slope : null)

    let x0 = t0.qty, y0 = t0.mood
    let x1 = t1.qty, y1 = t1.mood
    if (y0 < 1) { y0 = 1; x0 = clampX(1) ?? x0 } else if (y0 > 10) { y0 = 10; x0 = clampX(10) ?? x0 }
    if (y1 < 1) { y1 = 1; x1 = clampX(1) ?? x1 } else if (y1 > 10) { y1 = 10; x1 = clampX(10) ?? x1 }

    return [
      { qty: parseFloat(Number(x0).toFixed(2)), mood: parseFloat(Number(y0).toFixed(2)), isTrend: true },
      { qty: parseFloat(Number(x1).toFixed(2)), mood: parseFloat(Number(y1).toFixed(2)), isTrend: true },
    ]
  })()

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
          <BarChart2 size={11} /> Cantidad vs. ánimo{onlyDoneDays ? ' (días cumplidos)' : ''}
        </p>
        {r !== null && (
          <span className="text-[10px] font-bold" style={{ color: tone.color }}>
            r = {signed(r, 2)} · n = {points.length}
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/40 p-3">
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 20, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-chart-grid)" />
            <XAxis
              dataKey="qty"
              type="number"
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: 'var(--theme-muted)' }}
              label={{ value: unit || 'Cantidad', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--theme-muted)' }}
            />
            <YAxis
              dataKey="mood"
              type="number"
              domain={[1, 10]}
              ticks={[2, 4, 6, 8, 10]}
              tick={{ fontSize: 10, fill: 'var(--theme-muted)' }}
              label={{ value: 'Ánimo', angle: -90, position: 'insideLeft', offset: 14, fontSize: 10, fill: 'var(--theme-muted)' }}
            />
            <Tooltip content={<ScatterTooltip unit={unit} />} />

            <Scatter
              name="Registros"
              data={points}
              shape={(props) => {
                const { cx, cy, payload } = props
                return <circle cx={cx} cy={cy} r={5.5} fill={moodColor(payload.mood)} fillOpacity={0.88} stroke="var(--theme-raised)" strokeWidth={1.5} />
              }}
            />

            {trendPoints && (
              <Scatter
                name="Tendencia"
                data={trendPoints}
                line={{ stroke: tone.color, strokeWidth: 2.5, strokeDasharray: '6 4' }}
                lineType="joint"
                shape={() => null}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>

        {r === null && (
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Faltan {MIN_POINTS_FOR_R - points.length} registros con cantidad para estimar la relación.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta de un hábito analizado ─────────────────────────────
function HabitCard({ item }) {
  const h = item.headline
  const tone = toneOf(h)
  const Arrow = STRENGTH_RANK[h.strength] < STRENGTH_RANK.weak || h.direction === 0
    ? Minus
    : h.direction > 0 ? TrendingUp : TrendingDown
  const IconComp = HABIT_ICONS[item.icon] || HABIT_ICONS.CheckCircle
  const showNextDay = h.nextDay && h.source === 'compare' && item.compareNextDay?.ready

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800 shrink-0">
            <IconComp size={18} />
          </span>
          <div className="min-w-0">
            <span className="text-sm font-bold text-gray-800 dark:text-white break-words">{item.text}</span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400">
                {TYPE_LABEL[item.trackingType]}, {item.consistencyPct}% de los días
              </span>
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0"
          style={{ color: tone.color, backgroundColor: tone.bg }}
        >
          <Arrow size={13} />
          {STRENGTH_LABEL[h.strength]}
        </div>
      </div>

      <p className="text-xs font-medium leading-relaxed" style={{ color: h.strength === 'none' ? 'var(--theme-muted)' : tone.color }}>
        {narrative(item)}
      </p>

      {item.compare?.ready && (
        <MoodCompare stats={item.compare} title="Ánimo del mismo día" />
      )}
      {item.compare && !item.compare.ready && (
        <p className="text-xs text-gray-400 mt-3">
          Para comparar días con y sin este hábito faltan datos ({item.compare.countWith}/{MIN_DAYS_PER_GROUP} con y {item.compare.countWithout}/{MIN_DAYS_PER_GROUP} sin).
        </p>
      )}
      {showNextDay && (
        <MoodCompare stats={item.compareNextDay} title="Ánimo del día siguiente" />
      )}

      {item.dose?.points && (
        <HabitScatterChart
          dose={item.dose}
          unit={item.unit}
          onlyDoneDays={item.trackingType === 'toggle+qty'}
        />
      )}
    </div>
  )
}

// ── Hábitos que todavía no tienen datos suficientes ───────────
function collectingProgress(item) {
  if (item.compare) {
    const missingWith = Math.max(0, MIN_DAYS_PER_GROUP - item.compare.countWith)
    const missingWithout = Math.max(0, MIN_DAYS_PER_GROUP - item.compare.countWithout)
    const parts = []
    if (missingWith) parts.push(`${missingWith} ${missingWith === 1 ? 'día' : 'días'} con el hábito`)
    if (missingWithout) parts.push(`${missingWithout} ${missingWithout === 1 ? 'día' : 'días'} sin él`)
    return {
      pct: (Math.min(item.compare.countWith, MIN_DAYS_PER_GROUP) + Math.min(item.compare.countWithout, MIN_DAYS_PER_GROUP)) / (2 * MIN_DAYS_PER_GROUP),
      text: `Faltan registrar ${parts.join(' y ')}`,
    }
  }
  const n = item.dose?.n ?? 0
  const missing = MIN_POINTS_FOR_R - n
  return {
    pct: Math.min(n, MIN_POINTS_FOR_R) / MIN_POINTS_FOR_R,
    text: `Faltan ${missing} ${missing === 1 ? 'registro' : 'registros'} con cantidad`,
  }
}

function CollectingList({ items }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <Hourglass size={14} className="text-gray-400" />
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300">Juntando datos</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">Estos hábitos todavía no tienen registros suficientes para sacar conclusiones.</p>
      <ul className="space-y-3">
        {items.map(item => {
          const IconComp = HABIT_ICONS[item.icon] || HABIT_ICONS.CheckCircle
          const { pct, text } = collectingProgress(item)
          return (
            <li key={item.habitId}>
              <div className="flex items-center gap-2 text-xs mb-1">
                <IconComp size={14} className="text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-700 dark:text-gray-200 truncate">{item.text}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.round(pct * 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{text}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Resumen para el psicólogo ─────────────────────────────────
const isNotable = i => i.headline && STRENGTH_RANK[i.headline.strength] >= STRENGTH_RANK.moderate

function Summary({ analyzed }) {
  const good = analyzed.filter(i => isNotable(i) && i.headline.direction > 0)
  const bad = analyzed.filter(i => isNotable(i) && i.headline.direction < 0)

  if (!good.length && !bad.length) {
    return (
      <div className="card">
        <p className="text-xs text-gray-500 dark:text-gray-400">Sin asociaciones moderadas o claras en este período.</p>
      </div>
    )
  }

  const names = list => list.map(i => i.text).join(', ')
  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-brand-500" />
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300">Resumen</h3>
      </div>
      {good.length > 0 && (
        <p className="text-sm" style={{ color: TONES.positive.color }}>
          Asociados a mejor ánimo: <strong>{names(good)}</strong>
        </p>
      )}
      {bad.length > 0 && (
        <p className="text-sm" style={{ color: TONES.negative.color }}>
          Asociados a peor ánimo: <strong>{names(bad)}</strong>
        </p>
      )}
    </div>
  )
}

// ── Vista del paciente ───────────────────────────────────────
// Lo esencial agrupado: lo que le hace bien, lo que conviene charlar en
// sesión y lo que todavía no está claro. Sin gráficos ni estadística: los
// detalles técnicos quedan en la vista del psicólogo.
function PatientHabitRow({ item }) {
  const IconComp = HABIT_ICONS[item.icon] || HABIT_ICONS.CheckCircle
  const detail = patientDetail(item)
  return (
    <li className="flex gap-3">
      <span className="p-2 h-fit rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800 shrink-0">
        <IconComp size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-white break-words">{item.text}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug mt-0.5">{patientSentence(item)}</p>
        {detail && (
          <p className="text-xs text-gray-400 mt-1">
            {detail.label}:{' '}
            <strong style={{ color: moodText(detail.withValue) }}>{plain(detail.withValue)}</strong> cuando lo hacés
            {', '}
            <strong>{plain(detail.withoutValue)}</strong> cuando no
          </p>
        )}
      </div>
    </li>
  )
}

function PatientGroup({ title, hint, icon: Icon, tone, items }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-lg" style={{ color: tone.color, backgroundColor: tone.bg }}>
          <Icon size={14} />
        </span>
        <h3 className="text-sm font-bold" style={{ color: tone.color }}>{title}</h3>
      </div>
      {hint && <p className="text-xs text-gray-400 mb-3">{hint}</p>}
      <ul className={`space-y-4 ${hint ? '' : 'mt-3'}`}>
        {items.map(item => <PatientHabitRow key={item.habitId} item={item} />)}
      </ul>
    </div>
  )
}

function PatientView({ items }) {
  const good = items.filter(i => isNotable(i) && i.headline.direction > 0)
  const talk = items.filter(i => isNotable(i) && i.headline.direction < 0)
  const unclear = items.filter(i => i.headline && !isNotable(i))
  const collecting = items.filter(i => !i.headline)

  return (
    <>
      {good.length > 0 && (
        <PatientGroup title="Lo que te hace bien" icon={TrendingUp} tone={TONES.positive} items={good} />
      )}
      {talk.length > 0 && (
        <PatientGroup
          title="Para charlar en sesión"
          hint="No es algo malo: son patrones que vale la pena mirar con tu psicólogo/a."
          icon={MessageCircle}
          tone={TONES.negativeSoft}
          items={talk}
        />
      )}
      {!good.length && !talk.length && (
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Todavía no aparecen patrones claros entre tus hábitos y tu ánimo. Seguí registrando: con más días se ven mejor.
          </p>
        </div>
      )}
      {unclear.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Minus size={14} className="text-gray-400" />
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300">Sin relación clara por ahora</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{unclear.map(i => i.text).join(', ')}</p>
          <p className="text-xs text-gray-400 mt-1">Puede que te sirvan igual: solo que con estos datos no se nota en tu ánimo.</p>
        </div>
      )}
      {collecting.length > 0 && <CollectingList items={collecting} />}
    </>
  )
}

// audience: 'patient' muestra solo conclusiones en lenguaje cotidiano;
// 'psychologist' ve tarjetas completas con gráficos, r, n y la diferencia
// ajustada por tendencia.
export default function HabitCorrelationCard({ habits, entries, audience = 'patient' }) {
  const [periodDays, setPeriodDays] = useState(null)

  const items = useMemo(
    () => sortCorrelation(computeCorrelation(habits || [], entries || [], { periodDays })),
    [habits, entries, periodDays],
  )
  const analyzed = items.filter(i => i.headline)
  const collecting = items.filter(i => !i.headline)

  if (!habits?.length) return (
    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
      <BarChart2 size={28} className="text-gray-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-400">
        {audience === 'patient' ? 'Todavía no tenés hábitos' : 'El paciente no tiene hábitos'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {audience === 'patient'
          ? 'Cuando agregues hábitos y los registres, acá vas a ver cómo se relacionan con tu ánimo.'
          : 'Cuando registre hábitos, acá se verá su relación con el ánimo.'}
      </p>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-brand-500" />
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Hábitos y estado de ánimo
            </h2>
          </div>
          {audience === 'psychologist' && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-xl" role="group" aria-label="Período">
            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => setPeriodDays(p.value)}
                aria-pressed={periodDays === p.value}
                className={`min-h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  periodDays === p.value
                    ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {audience === 'patient'
            ? 'Lo que tus registros muestran sobre cómo tus hábitos acompañan tu ánimo.'
            : 'Diferencia de ánimo con / sin cada hábito (mismo día y día siguiente) y, en hábitos con cantidad, correlación entre cantidad y ánimo en los días registrados. La fuerza de la señal se calcula sobre el ánimo ajustado por la tendencia de ±3 días.'}
        </p>
      </div>

      {audience === 'patient' ? (
        <PatientView items={items} />
      ) : (
        <>
          <Summary analyzed={analyzed} />
          {analyzed.map(item => <HabitCard key={item.habitId} item={item} />)}
          {collecting.length > 0 && <CollectingList items={collecting} />}
        </>
      )}

      <div className="text-xs text-gray-400 text-center space-y-1 px-1">
        {audience === 'patient' ? (
          <p>Estas relaciones muestran qué suele pasar junto, no qué causa qué.</p>
        ) : (
          <>
            <p>* Cada hábito se analiza desde su creación. Comparar requiere {MIN_DAYS_PER_GROUP} días en cada grupo; la correlación, {MIN_POINTS_FOR_R} registros.</p>
            <p>** Asociaciones observacionales: no implican causalidad clínica.</p>
          </>
        )}
      </div>
    </div>
  )
}
