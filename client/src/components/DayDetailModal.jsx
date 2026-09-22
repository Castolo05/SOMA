import { X, Clock, Pencil, Trash2 } from 'lucide-react'
import MoodIcon, { MoodBadge } from './MoodIcon'
import { MONTH_NAMES, DAY_NAMES, formatTime, isEditable } from '../lib/constants'

/**
 * DayDetailModal — Modal que muestra las entradas de un día del calendario
 *
 * Props:
 *   date: Date
 *   entries: JournalEntry[]
 *   appointments?: Appointment[] (para el psicólogo)
 *   onClose: fn()
 *   onDelete?: fn(id)
 *   mode: 'patient' | 'psych'
 */
export default function DayDetailModal({ date, entries = [], appointments = [], onClose, onDelete, mode = 'patient' }) {
  if (!date) return null

  const dayName = DAY_NAMES[date.getDay()]
  const dayNum = date.getDate()
  const monthName = MONTH_NAMES[date.getMonth()]
  const year = date.getFullYear()

  const isPsych = mode === 'psych'
  const accentColor = isPsych ? 'text-indigo-600' : 'text-sage-600'
  const hasContent = entries.length > 0 || appointments.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{dayName}</p>
            <h2 className={`text-xl font-bold ${accentColor} dark:text-white`}>
              {dayNum} de {monthName}, {year}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {!hasContent && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm">Sin registros para este día.</p>
            </div>
          )}

          {/* Entradas de diario */}
          {entries.length > 0 && (
            <div className="space-y-3">
              {entries.length > 1 && (
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  {entries.length} entradas de diario
                </p>
              )}
              {entries.map((entry) => {
                const canDelete = !isPsych && isEditable(entry.createdAt)
                return (
                  <div key={entry.id} className="card dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <MoodIcon score={entry.moodScore} size={22} showScore showLabel />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} />
                          {formatTime(entry.createdAt)}
                        </span>
                        {canDelete && (
                          <button
                            onClick={() => onDelete?.(entry.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {entry.tags.map((t) => (
                          <span key={t} className="tag text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Citas del psicólogo */}
          {appointments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                {appointments.length} cita{appointments.length > 1 ? 's' : ''}
              </p>
              {appointments.map((appt) => (
                <div key={appt.id} className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm">{appt.title}</div>
                    {appt.patient && (
                      <div className="text-xs text-indigo-500 dark:text-indigo-400">👤 {appt.patient.name}</div>
                    )}
                    <div className="text-xs text-indigo-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {formatTime(appt.date)} · {appt.duration} min
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">{appt.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
