import {
  BarChart2, TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MOOD_ICONS, HABIT_ICONS } from '../lib/constants'

// ── Tooltip personalizado para el scatter chart ────────────────
function ScatterTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d || d.isTrend) return null
  const moodIcon = MOOD_ICONS[Math.round(d.mood)]
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200">
        {moodIcon?.emoji ?? ''} Ánimo: <span style={{ color: moodIcon?.color }}>{d.mood}/10</span>
      </p>
      <p className="text-gray-400 mt-0.5">
        Cantidad: <strong className="text-gray-600 dark:text-gray-300">{d.qty}{unit ? ` ${unit}` : ''}</strong>
      </p>
    </div>
  )
}

// ── Scatter chart cantidad vs ánimo ───────────────────────────
function HabitScatterChart({ scatterPoints, trend, pearsonR, unit }) {
  if (!scatterPoints || scatterPoints.length < 3) return null

  const dotColor = (mood) => {
    if (mood >= 8) return '#10b981'
    if (mood >= 6) return '#0d9488'
    if (mood >= 4) return '#f59e0b'
    return '#ef4444'
  }

  const r = pearsonR
  const absr = r !== null ? Math.abs(r) : 0
  const directionText = r !== null
    ? (r > 0.1 ? 'A más cantidad, mejor ánimo' : r < -0.1 ? 'A más cantidad, peor ánimo' : 'Sin relación clara con la cantidad')
    : null

  const lineColor = r !== null
    ? (r >= 0.15 ? '#0d9488' : r <= -0.15 ? '#ef4444' : '#64748b')
    : '#64748b'

  const badgeColor = r !== null
    ? (absr > 0.5 ? '#10b981' : absr > 0.3 ? '#f59e0b' : '#64748b')
    : '#64748b'

  const trendPoints = (() => {
    let t = trend
    if (!t && scatterPoints && scatterPoints.length >= 3) {
      const n = scatterPoints.length
      const mx = scatterPoints.reduce((s, p) => s + p.qty, 0) / n
      const my = scatterPoints.reduce((s, p) => s + p.mood, 0) / n
      let num = 0, den = 0
      for (const p of scatterPoints) {
        num += (p.qty - mx) * (p.mood - my)
        den += (p.qty - mx) ** 2
      }
      if (den > 0) {
        const slope = num / den
        const intercept = my - slope * mx
        const xMin = Math.min(...scatterPoints.map(p => p.qty))
        const xMax = Math.max(...scatterPoints.map(p => p.qty))
        t = [
          { qty: xMin, mood: slope * xMin + intercept },
          { qty: xMax, mood: slope * xMax + intercept },
        ]
      }
    }
    if (!t || t.length < 2 || t[0].qty === t[1].qty) return null

    const [t0, t1] = t
    const slope = (t1.mood - t0.mood) / (t1.qty - t0.qty)
    const intercept = t0.mood - slope * t0.qty

    let x0 = t0.qty, y0 = t0.mood
    let x1 = t1.qty, y1 = t1.mood

    if (y0 < 1) { y0 = 1; if (slope !== 0) x0 = (1 - intercept) / slope }
    else if (y0 > 10) { y0 = 10; if (slope !== 0) x0 = (10 - intercept) / slope }

    if (y1 < 1) { y1 = 1; if (slope !== 0) x1 = (1 - intercept) / slope }
    else if (y1 > 10) { y1 = 10; if (slope !== 0) x1 = (10 - intercept) / slope }

    return [
      { qty: parseFloat(Number(x0).toFixed(2)), mood: parseFloat(Number(y0).toFixed(2)), isTrend: true },
      { qty: parseFloat(Number(x1).toFixed(2)), mood: parseFloat(Number(y1).toFixed(2)), isTrend: true },
    ]
  })()

  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <BarChart2 size={11} /> Cantidad vs. ánimo ({scatterPoints.length} registros)
        </p>
        {r !== null && (
          <span className="text-[10px] font-bold" style={{ color: badgeColor }}>
            r = {r > 0 ? '+' : ''}{r}
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/40 p-3">
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 20, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
            <XAxis
              dataKey="qty"
              type="number"
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              label={{ value: unit || 'Cantidad', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#9ca3af' }}
            />
            <YAxis
              dataKey="mood"
              type="number"
              domain={[1, 10]}
              ticks={[2, 4, 6, 8, 10]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              label={{ value: 'Ánimo', angle: -90, position: 'insideLeft', offset: 14, fontSize: 10, fill: '#9ca3af' }}
            />
            <Tooltip content={<ScatterTooltip unit={unit} />} />

            <Scatter
              name="Registros"
              data={scatterPoints}
              shape={(props) => {
                const { cx, cy, payload } = props
                return <circle cx={cx} cy={cy} r={5.5} fill={dotColor(payload.mood)} fillOpacity={0.88} stroke="white" strokeWidth={1.5} />
              }}
            />

            {trendPoints && (
              <Scatter
                name="Tendencia"
                data={trendPoints}
                line={{ stroke: lineColor, strokeWidth: 2.5, strokeDasharray: '6 4' }}
                lineType="joint"
                shape={<circle r={0} opacity={0} />}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>

        {r !== null && Math.abs(r) >= 0.15 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="inline-block w-5 h-0 border-t-2 border-dashed"
              style={{ borderColor: lineColor }}
            />
            <p className="text-[11px] font-medium" style={{ color: lineColor }}>
              {directionText}
            </p>
          </div>
        )}
        {r !== null && Math.abs(r) < 0.15 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="inline-block w-5 h-0 border-t-2 border-dashed"
              style={{ borderColor: lineColor }}
            />
            <p className="text-[11px] text-gray-400">
              Tendencia: sin relación clara entre cantidad y ánimo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HabitCorrelationCard({ data }) {
  if (!data || data.length === 0) return (
    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
      <BarChart2 size={28} className="text-gray-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-400">No hay datos suficientes</p>
      <p className="text-xs text-gray-400 mt-1">Se necesitan más registros para calcular correlaciones.</p>
    </div>
  )

  const sorted = [...data].sort((a, b) => (b.impact ?? -99) - (a.impact ?? -99))

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={16} className="text-sage-500" />
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Hábitos y estado de ánimo
          </h2>
        </div>
        <p className="text-xs text-gray-400">
          Cómo cada hábito se relaciona con el ánimo. Los hábitos con cantidad muestran cada registro como un punto: eje X = cantidad, eje Y = ánimo de ese día. En los hábitos cuantificables, los días no cumplidos o sin cantidad registrada cuentan como 0.
        </p>
      </div>

      {sorted.map(item => {
        const impact = item.impact ?? 0
        const positive = impact > 0.2
        const negative = impact < -0.2
        const ImpactIcon = positive ? TrendingUp : negative ? TrendingDown : Minus
        const impactColor = positive ? 'text-emerald-500' : negative ? 'text-red-400' : 'text-gray-400'
        const impactBg = positive ? 'bg-emerald-50 dark:bg-emerald-900/20' : negative ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800/50'

        const IconComp = HABIT_ICONS[item.icon] || HABIT_ICONS.CheckCircle
        const withPct    = item.avgWith    ? (item.avgWith    / 10) * 100 : 0
        const withoutPct = item.avgWithout ? (item.avgWithout / 10) * 100 : 0

        function narrativeText() {
          const absi = Math.abs(impact)
          if (item.trackingType === 'toggle') {
            if (absi < 0.2) return null
            if (positive) return `📈 Los días que se cumple este hábito el ánimo promedia ${item.avgWith}/10 vs ${item.avgWithout ?? '—'}/10 cuando no se hace (+${impact.toFixed(1)} pts).`
            return `📉 Los días que se cumple este hábito el ánimo tiende a ser ${absi.toFixed(1)} pts más bajo. Puede ser un hábito reactivo (se hace cuando ya se está bajo).`
          }
          return null
        }

        const narrative = narrativeText()

        return (
          <div key={item.habitId} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-sage-50 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400 border border-sage-100 dark:border-sage-800">
                  <IconComp size={18} />
                </span>
                <div>
                  <span className="text-sm font-bold text-gray-800 dark:text-white">{item.text}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                      {item.trackingType === 'toggle' ? 'Sí / No' : item.trackingType === 'qty' ? 'Cantidad' : 'Sí/No + cantidad'}
                    </span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {item.consistencyPct}% de los días
                    </span>
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm font-bold ${impactColor} ${impactBg}`}>
                <ImpactIcon size={13} />
                {item.impact !== null ? `${item.impact > 0 ? '+' : ''}${item.impact.toFixed(1)}` : '—'}
              </div>
            </div>

            {item.trackingType === 'toggle' && item.avgWith !== null && (
              <div className="space-y-2.5 mb-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Con este hábito <span className="text-gray-400 ml-1">({item.countWith} días)</span></span>
                    <span className="font-bold" style={{ color: item.avgWith ? MOOD_ICONS[Math.round(item.avgWith)]?.color : '#9ca3af' }}>
                      {item.avgWith ?? '—'}/10
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${withPct}%`, backgroundColor: item.avgWith ? MOOD_ICONS[Math.round(item.avgWith)]?.color : '#d1d5db' }}
                    />
                  </div>
                </div>
                {item.avgWithout !== null && item.countWithout > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Sin este hábito <span className="text-gray-400 ml-1">({item.countWithout} días)</span></span>
                      <span className="font-bold text-gray-400">{item.avgWithout ?? '—'}/10</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300 dark:bg-gray-500 rounded-full transition-all duration-700" style={{ width: `${withoutPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {item.scatterPoints && (
              <HabitScatterChart
                scatterPoints={item.scatterPoints}
                trend={item.trend}
                pearsonR={item.pearsonR}
                unit={item.unit}
              />
            )}

            {item.trackingType === 'toggle+qty' && item.avgWith !== null && (
              <div className="space-y-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Comparación días con / sin hábito</p>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Con el hábito <span className="text-gray-400 ml-1">({item.countWith} días)</span></span>
                    <span className="font-bold" style={{ color: MOOD_ICONS[Math.round(item.avgWith)]?.color ?? '#9ca3af' }}>{item.avgWith}/10</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${withPct}%`, backgroundColor: MOOD_ICONS[Math.round(item.avgWith)]?.color ?? '#0d9488' }} />
                  </div>
                </div>
                {item.avgWithout !== null && item.countWithout > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Sin el hábito <span className="text-gray-400 ml-1">({item.countWithout} días)</span></span>
                      <span className="font-bold text-gray-400">{item.avgWithout}/10</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300 dark:bg-gray-500 rounded-full transition-all duration-700" style={{ width: `${withoutPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {narrative && (
              <p className={`text-xs mt-3 font-medium leading-relaxed ${impactColor}`}>
                {narrative}
              </p>
            )}

            {!narrative && Math.abs(impact) <= 0.2 && (
              <p className="text-xs text-gray-400 mt-2">
                — Este hábito no muestra un efecto claro en el ánimo con los datos actuales.
              </p>
            )}
          </div>
        )
      })}

      <div className="text-xs text-gray-400 text-center space-y-1 px-1">
        <p>* Se muestran hábitos con al menos 3 días de datos registrados.</p>
        <p>** Los datos no implican causalidad clínica.</p>
      </div>
    </div>
  )
}
