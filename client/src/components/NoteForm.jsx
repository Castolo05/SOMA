import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { MOOD_ICONS, HABIT_ICONS } from '../lib/constants'
import MoodIcon from './MoodIcon'

/**
 * NoteForm — Formulario compartido para crear o editar una anotación de diario.
 */
export default function NoteForm({
  initialMood = 5,
  initialContent = '',
  initialHabits = [],
  initialHabitData = {},
  habits = [],
  onSubmit,
  onCancel,
  isEdit = false,
  submitting = false,
  dayLabel = 'hoy',
}) {
  const [mood, setMood] = useState(initialMood)
  const [content, setContent] = useState(initialContent)
  // Para hábitos tipo "toggle": lista de IDs
  const [completedHabits, setCompletedHabits] = useState(initialHabits)
  // Para hábitos "toggle+qty" y "qty": { [habitId]: { done?, qty, note } }
  const [habitData, setHabitData] = useState(initialHabitData)
  const [preferInSession, setPreferInSession] = useState(false)

  const moodConfig = MOOD_ICONS[mood]
  const sliderPercent = ((mood - 1) / 9) * 100

  const toggleHabit = (id) =>
    setCompletedHabits((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]))

  const setHabitField = (id, field, value) =>
    setHabitData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    if (!preferInSession && !content.trim()) return
    onSubmit({ mood, content, completedHabits, habitData })
  }

  return (
    <div className="space-y-3 animate-fade-in text-left">
      {/* Slider de ánimo */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Estado de ánimo</span>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm"
            style={{ backgroundColor: moodConfig.bg, color: moodConfig.color }}
          >
            <MoodIcon score={mood} size={15} />
            <span>{mood}/10</span>
            <span className="text-xs opacity-70">{moodConfig.label}</span>
          </div>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="mood-slider w-full h-3 rounded-full appearance-none cursor-grab active:cursor-grabbing"
          style={{
            background: `linear-gradient(to right, ${moodConfig.color} 0%, ${moodConfig.color} ${sliderPercent}%, var(--track-bg, #e5e7eb) ${sliderPercent}%, var(--track-bg, #e5e7eb) 100%)`,
          }}
        />
        <div className="flex justify-between mt-2 px-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMood(n)}
              className="text-[10px] font-bold transition-all"
              style={mood === n ? { color: moodConfig.color, transform: 'scale(1.15)' } : { color: '#d1d5db' }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Texto libre */}
      <div className="card">
        <label className="label mb-2">¿Qué pasó {dayLabel}?</label>
        <textarea
          className="input resize-none h-28 mb-3"
          placeholder={preferInSession ? '(Opcional) Puedes dejar esto vacío...' : 'Contá cómo te sentiste, qué te pasó...'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPreferInSession(!preferInSession)}
            className={`text-sm px-4 py-2.5 rounded-xl font-semibold transition-all border ${
              preferInSession
                ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-800'
                : 'btn-ghost'
            }`}
          >
            {preferInSession ? '✓ Prefiero contarlo en la sesión' : 'Prefiero contarlo en la sesión'}
          </button>
          <p className="text-right text-xs text-gray-400">{content.length}/5000</p>
        </div>
      </div>

      {/* Hábitos del día */}
      {habits.length > 0 && (
        <div className="card">
          <label className="label">¿Qué hábitos cumpliste {dayLabel}?</label>
          <div className="space-y-2">
            {habits.map((habit) => {
              const type = habit.trackingType || 'toggle'
              const IconComp = HABIT_ICONS[habit.icon] || HABIT_ICONS.CheckCircle
              const hData = habitData[habit.id] || {}

              // ── TOGGLE ──────────────────────────────────────────
              if (type === 'toggle') {
                const done = completedHabits.includes(habit.id)
                return (
                  <div key={habit.id}>
                    <button
                      type="button"
                      onClick={() => toggleHabit(habit.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                        done
                          ? 'border-sage-400 bg-sage-50 dark:bg-sage-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-sage-300'
                      }`}
                    >
                      <span className={`p-1.5 rounded-lg ${done ? 'bg-white dark:bg-sage-800 text-sage-500 shadow-sm' : 'text-gray-400'}`}>
                        <IconComp size={18} />
                      </span>
                      <span className={`flex-1 text-sm font-semibold ${done ? 'text-sage-700 dark:text-sage-300' : 'text-gray-600 dark:text-gray-300'}`}>
                        {habit.text}
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        done ? 'bg-sage-400 border-sage-400' : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {done && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                    </button>
                    {done && habit.hasNote && (
                      <input
                        type="text"
                        className="input mt-1.5 text-sm py-2"
                        placeholder="Aclaración opcional..."
                        value={hData.note || ''}
                        onChange={(e) => setHabitField(habit.id, 'note', e.target.value)}
                      />
                    )}
                  </div>
                )
              }

              // ── TOGGLE + CANTIDAD ────────────────────────────────
              if (type === 'toggle+qty') {
                const done = hData.done === true
                return (
                  <div key={habit.id} className={`rounded-2xl border-2 transition-all overflow-hidden ${
                    done ? 'border-sage-400 bg-sage-50 dark:bg-sage-900/20' : 'border-gray-200 dark:border-gray-600'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setHabitField(habit.id, 'done', !done)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={`p-1.5 rounded-lg ${done ? 'bg-white dark:bg-sage-800 text-sage-500 shadow-sm' : 'text-gray-400'}`}>
                        <IconComp size={18} />
                      </span>
                      <span className={`flex-1 text-sm font-semibold ${done ? 'text-sage-700 dark:text-sage-300' : 'text-gray-600 dark:text-gray-300'}`}>
                        {habit.text}
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        done ? 'bg-sage-400 border-sage-400' : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {done && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                    </button>
                    {done && (
                      <div className="px-4 pb-3 space-y-2 border-t border-sage-200 dark:border-sage-800/50 pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="input py-2 text-sm w-28 text-center"
                            placeholder="0"
                            value={hData.qty ?? ''}
                            onChange={(e) => setHabitField(habit.id, 'qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          />
                          <span className="text-sm font-semibold text-sage-600 dark:text-sage-400">{habit.unit || 'unidades'}</span>
                        </div>
                        {habit.hasNote && (
                          <input
                            type="text"
                            className="input text-sm py-2"
                            placeholder="Aclaración opcional..."
                            value={hData.note || ''}
                            onChange={(e) => setHabitField(habit.id, 'note', e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // ── SOLO CANTIDAD ───────────────────────────────────
              if (type === 'qty') {
                const hasValue = hData.qty !== undefined && hData.qty !== ''
                return (
                  <div key={habit.id} className={`rounded-2xl border-2 transition-all overflow-hidden ${
                    hasValue ? 'border-sage-400 bg-sage-50 dark:bg-sage-900/20' : 'border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={`p-1.5 rounded-lg ${hasValue ? 'bg-white dark:bg-sage-800 text-sage-500 shadow-sm' : 'text-gray-400'}`}>
                        <IconComp size={18} />
                      </span>
                      <span className={`flex-1 text-sm font-semibold ${hasValue ? 'text-sage-700 dark:text-sage-300' : 'text-gray-600 dark:text-gray-300'}`}>
                        {habit.text}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          className="w-20 text-center rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sage-400"
                          placeholder="—"
                          value={hData.qty ?? ''}
                          onChange={(e) => setHabitField(habit.id, 'qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{habit.unit || 'unidades'}</span>
                      </div>
                    </div>
                    {habit.hasNote && (
                      <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                        <input
                          type="text"
                          className="input text-sm py-2"
                          placeholder="Aclaración opcional..."
                          value={hData.note || ''}
                          onChange={(e) => setHabitField(habit.id, 'note', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )
              }

              return null
            })}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-sm"
          >
            <X size={15} /> Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!preferInSession && !content.trim())}
          className="btn-patient flex-1 flex items-center justify-center gap-1.5 text-sm shadow-sm"
        >
          <Save size={15} />
          {submitting ? 'Guardando...' : isEdit ? `Actualizar nota` : `Guardar nota`}
        </button>
      </div>
    </div>
  )
}
