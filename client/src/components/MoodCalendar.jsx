import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MOOD_ICONS, MONTH_NAMES, DAY_NAMES, isSameDay, entryDateToDate } from '../lib/constants'
import { MoodDot } from './MoodIcon'

/**
 * MoodCalendar — Calendario mensual de estado de ánimo
 *
 * Props:
 *   entries: array de JournalEntry (con moodScore y createdAt)
 *   onDayClick: fn(date: Date, entriesOfDay: Entry[])
 *   selectedDate?: Date — día actualmente seleccionado
 *   mode?: 'patient' | 'psych' — afecta los colores
 */
export default function MoodCalendar({ entries = [], onDayClick, selectedDate, mode = 'patient' }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  const accentClass = mode === 'psych'
    ? 'bg-indigo-600 text-white'
    : 'bg-sage-300 text-white'

  const todayClass = mode === 'psych'
    ? 'ring-2 ring-indigo-400'
    : 'ring-2 ring-sage-400'

  // Construir mapa: "YYYY-MM-DD" → entries[]
  const entryMap = useMemo(() => {
    const map = {}
    entries.forEach((e) => {
      const d = entryDateToDate(e.entryDate || e.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [entries])

  // Calcular los días del mes actual con offset del primer día
  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Dom
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    return { days: daysInMonth, startOffset: firstDay }
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = (day) => {
    const date = new Date(viewYear, viewMonth, day)
    const key = `${viewYear}-${viewMonth}-${day}`
    onDayClick?.(date, entryMap[key] || [])
  }

  const getDayEntries = (day) => entryMap[`${viewYear}-${viewMonth}-${day}`] || []

  const isToday = (day) => {
    const d = new Date(viewYear, viewMonth, day)
    return isSameDay(d, today)
  }

  const isSelected = (day) => {
    if (!selectedDate) return false
    const d = new Date(viewYear, viewMonth, day)
    return isSameDay(d, selectedDate)
  }

  const getAvgMood = (dayEntries) => {
    if (!dayEntries.length) return null
    return Math.round(dayEntries.reduce((s, e) => s + e.moodScore, 0) / dayEntries.length)
  }

  return (
    <div className="card dark:bg-gray-800 select-none">
      {/* Header: navegación de mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
        <h3 className="font-bold text-gray-800 dark:text-white text-base">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Offset vacío para el primer día del mes */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Días del mes */}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const dayEntries = getDayEntries(day)
          const avgMood = getAvgMood(dayEntries)
          const hasEntries = dayEntries.length > 0
          const selected = isSelected(day)
          const today_ = isToday(day)
          const moodConfig = avgMood ? MOOD_ICONS[avgMood] : null

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`
                relative flex flex-col items-center justify-center rounded-xl
                h-10 transition-all duration-150 border-2 border-transparent
                ${selected
                  ? `ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 ${hasEntries ? '' : accentClass}`
                  : hasEntries
                    ? 'hover:opacity-80 cursor-pointer'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer opacity-60'
                }
                ${today_ && !selected && !hasEntries ? todayClass : ''}
              `}
              style={hasEntries ? { backgroundColor: moodConfig?.color, borderColor: selected ? moodConfig?.color : 'transparent' } : {}}
            >
              <span className={`text-sm font-bold z-10 relative ${
                hasEntries ? 'text-white' : selected ? 'text-white' : today_ ? 'text-sage-600 dark:text-sage-400' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {day}
              </span>

              {hasEntries && dayEntries.length > 1 && (
                <span className="absolute bottom-0 right-0 -mr-1 -mb-1 bg-white dark:bg-gray-800 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm" style={{ color: moodConfig?.color }}>
                  {dayEntries.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {[[2, 'Bajo'], [5, 'Medio'], [8, 'Alto']].map(([score, label]) => (
          <div key={score} className="flex items-center gap-1">
            <MoodDot score={score} size={8} />
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
