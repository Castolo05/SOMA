import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { MOOD_ICONS, MOOD_CHART_COLOR, formatDateShort } from '../lib/constants'
import MoodIcon from './MoodIcon'

const DAYS_OPTIONS = [
  { value: 7,  label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
  { value: 'all', label: 'Todo' },
]

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const score = payload[0].value
    const config = MOOD_ICONS[score]
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-3 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <MoodIcon score={score} size={16} />
          <div>
            <p className="font-bold" style={{ color: config?.color }}>
              {score}/10 — {config?.label}
            </p>
            <p className="text-xs text-gray-400">{payload[0].payload.dateLabel}</p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomDot = (props) => {
  const { cx, cy, payload, isDark } = props
  return (
    <circle
      key={`dot-${cx}-${cy}`}
      cx={cx}
      cy={cy}
      r={5}
      fill={MOOD_CHART_COLOR(payload.mood)}
      stroke={isDark ? '#f3f6fa' : 'white'}
      strokeWidth={2}
    />
  )
}

function useIsDarkTheme() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ||
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const el = document.documentElement
    const apply = () => {
      setIsDark(el.dataset.theme === 'dark' || el.classList.contains('dark'))
    }
    const observer = new MutationObserver(apply)
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

/**
 * MoodChart — Gráfico de líneas del estado de ánimo (Recharts)
 *
 * Props:
 *   entries: JournalEntry[]       — todas las entradas (sin filtrar)
 *   defaultDays?: 7 | 14 | 30    — período inicial
 *   mode?: 'patient' | 'psych'
 *   height?: number
 *   showSelector?: boolean        — mostrar selector de período (default: true)
 *   days?: number | 'all'
 *   onDaysChange?: function
 */
export default function MoodChart({ entries = [], days = 14, onDaysChange, mode = 'patient', height = 220, showSelector = true, onDayClick }) {
  // Use internal state only if onDaysChange is not provided
  const [internalDays, setInternalDays] = useState(days)
  const currentDays = onDaysChange ? days : internalDays
  const handleDaysChange = (d) => {
    if (onDaysChange) onDaysChange(d)
    else setInternalDays(d)
  }
  const isDark = useIsDarkTheme()
  const lineColor = isDark ? '#f3f6fa' : mode === 'psych' ? '#267783' : '#2f876e'
  const gridColor = isDark ? 'rgba(230, 237, 245, 0.14)' : '#f0f0f0'
  const axisColor = isDark ? '#9aa6b8' : '#9ca3af'

  // Filtrar entradas por período seleccionado
  const chartData = useMemo(() => {
    let filtered = [...entries]
    
    if (currentDays !== 'all') {
      const now = new Date()
      const cutoff = new Date(now)
      cutoff.setDate(now.getDate() - currentDays)
      cutoff.setHours(0, 0, 0, 0)
      filtered = filtered.filter((e) => new Date(e.createdAt) >= cutoff)
    }

    return filtered
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((e) => ({
        id: e.id,
        dateLabel: formatDateShort(e.createdAt),
        mood: e.moodScore,
        rawDate: e.createdAt,
      }))
  }, [entries, currentDays])

  return (
    <div className="flex flex-col w-full" style={{ height }}>
      {/* Selector de período */}
      {showSelector && (
        <div className="flex gap-1 mb-3">
          {DAYS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleDaysChange(value)}
              className={`text-[11px] px-2.5 min-h-11 rounded-lg font-bold transition-all ${
                currentDays === value
                  ? mode === 'psych'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-sage-400 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Gráfico o estado vacío */}
      {chartData.length < 2 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs rounded-2xl bg-gray-50 dark:bg-gray-800/50">
          No hay suficientes datos para el período seleccionado.
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 8, right: 4, bottom: 0, left: -24 }}
            onClick={(e) => {
              if (onDayClick && e && e.activePayload && e.activePayload.length > 0) {
                const point = e.activePayload[0].payload
                onDayClick(new Date(point.rawDate), point.id)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: axisColor }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[1, 10]}
              ticks={[1, 3, 5, 7, 10]}
              tick={{ fontSize: 10, fill: axisColor }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="mood"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={chartData.length <= 15 ? <CustomDot isDark={isDark} /> : false}
              activeDot={{ r: 7, fill: lineColor, stroke: isDark ? '#161c26' : '#fff', strokeWidth: 2, cursor: onDayClick ? 'pointer' : 'default' }}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
