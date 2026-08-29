import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  TrendingUp, CheckCircle2, Save, X, Edit2,
} from 'lucide-react'
import api from '../../lib/api'
import { MOOD_ICONS, HABIT_ICONS, formatDateShort, isSameDay, isEditable } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import MoodChart from '../../components/MoodChart'
import { usePageTitle } from '../../hooks/usePageTitle'

function todayString() {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatAppointmentDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    + ' — ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
}

// ── Formulario de nota inline ────────────────────────────────────
function NoteForm({ initialMood = 5, initialContent = '', initialHabits = [], initialHabitData = {}, habits = [], onSubmit, onCancel, isEdit = false, submitting }) {
  const [mood, setMood] = useState(initialMood)
  const [content, setContent] = useState(initialContent)
  // For "toggle" habits: array of IDs
  const [completedHabits, setCompletedHabits] = useState(initialHabits)
  // For "toggle+qty" and "qty" habits: { [habitId]: { done?, qty, note } }
  const [habitData, setHabitData] = useState(initialHabitData)
  const [preferInSession, setPreferInSession] = useState(false)

  const moodConfig = MOOD_ICONS[mood]
  const sliderPercent = ((mood - 1) / 9) * 100

  const toggleHabit = (id) =>
    setCompletedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id])

  const setHabitField = (id, field, value) =>
    setHabitData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const handleSubmit = () => {
    if (!preferInSession && !content.trim()) return
    onSubmit({ mood, content, completedHabits, habitData })
  }

  return (
    <div className="space-y-3 animate-fade-in">
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
          type="range" min={1} max={10} step={1} value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="mood-slider w-full h-3 rounded-full appearance-none cursor-grab active:cursor-grabbing"
          style={{
            background: `linear-gradient(to right, ${moodConfig.color} 0%, ${moodConfig.color} ${sliderPercent}%, var(--track-bg, #e5e7eb) ${sliderPercent}%, var(--track-bg, #e5e7eb) 100%)`,
          }}
        />
        <div className="flex justify-between mt-2 px-0.5">
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <button key={n} type="button" onClick={() => setMood(n)}
              className="text-[10px] font-bold transition-all"
              style={mood === n ? { color: moodConfig.color, transform: 'scale(1.15)' } : { color: '#d1d5db' }}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* Texto libre */}
      <div className="card">
        <label className="label mb-2">¿Qué pasó hoy?</label>
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
          <label className="label">¿Qué hábitos cumpliste hoy?</label>
          <div className="space-y-2">
            {habits.map(habit => {
              const type = habit.trackingType || 'toggle'
              const IconComp = HABIT_ICONS[habit.icon] || HABIT_ICONS.CheckCircle
              const hData = habitData[habit.id] || {}

              // ── TOGGLE (comportamiento clásico) ──────────────────
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
                        onChange={e => setHabitField(habit.id, 'note', e.target.value)}
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
                    {/* Toggle row */}
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
                    {/* Cantidad + nota si está marcado */}
                    {done && (
                      <div className="px-4 pb-3 space-y-2 border-t border-sage-200 dark:border-sage-800/50 pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="input py-2 text-sm w-28 text-center"
                            placeholder="0"
                            value={hData.qty ?? ''}
                            onChange={e => setHabitField(habit.id, 'qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          />
                          <span className="text-sm font-semibold text-sage-600 dark:text-sage-400">{habit.unit || 'unidades'}</span>
                        </div>
                        {habit.hasNote && (
                          <input
                            type="text"
                            className="input text-sm py-2"
                            placeholder="Aclaración opcional..."
                            value={hData.note || ''}
                            onChange={e => setHabitField(habit.id, 'note', e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // ── SOLO CANTIDAD (qty) ──────────────────────────────
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
                          onChange={e => setHabitField(habit.id, 'qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
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
                          onChange={e => setHabitField(habit.id, 'note', e.target.value)}
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
      <div className="flex gap-2">
        {onCancel && (
          <button onClick={onCancel} className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-sm">
            <X size={15} /> Cancelar
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || (!preferInSession && !content.trim())}
          className="btn-patient flex-1 flex items-center justify-center gap-1.5 text-sm shadow-sm"
        >
          <Save size={15} />
          {submitting ? 'Guardando...' : isEdit ? 'Actualizar nota' : 'Guardar nota de hoy'}
        </button>
      </div>
    </div>
  )
}

// ── Dashboard principal ──────────────────────────────────────────
export default function PatientDashboard() {
  usePageTitle('Mi día')
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [habits, setHabits] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [chartDays, setChartDays] = useState(14)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    // Cargar cada recurso de forma independiente:
    // si uno falla (ej: journal o appointments con 401 temporal),
    // los hábitos siguen cargando y aparecen en el formulario.
    setLoading(true)
    const fetches = [
      api.get('/journal').then(r => setEntries(r.data.entries)).catch(() => {}),
      api.get('/appointments').then(r => setAppointments(r.data.appointments)).catch(() => {}),
      api.get('/habits').then(r => setHabits(r.data.habits)).catch(() => {}),
    ]
    Promise.all(fetches).finally(() => setLoading(false))
  }, [])

  const todayEntry = entries.find((e) => isSameDay(new Date(e.createdAt), new Date()))
  const wroteToday = !!todayEntry
  const canEditToday = wroteToday && isEditable(todayEntry?.createdAt)
  const nextAppointment = appointments[0] || null

  // Filtrar entradas según el periodo del gráfico para el promedio
  const chartFilteredEntries = chartDays === 'all' ? entries : entries.filter((e) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - chartDays)
    cutoff.setHours(0, 0, 0, 0)
    return new Date(e.createdAt) >= cutoff
  })

  const avgMood = chartFilteredEntries.length
    ? Math.round((chartFilteredEntries.reduce((s, e) => s + e.moodScore, 0) / chartFilteredEntries.length) * 10) / 10
    : null

  const handleCreate = async ({ mood, content, completedHabits, habitData }) => {
    setSaveError('')
    setSubmitting(true)
    try {
      const { data } = await api.post('/journal', { moodScore: mood, content, completedHabits, habitData })
      setEntries((prev) => [data.entry, ...prev])
      showSuccess('¡Nota de hoy guardada! 🎉')
      setEditMode(false)
    } catch (err) {
      console.error('❌ Error guardando nota:', err)
      if (err.response?.status === 409) {
        showSuccess('Ya existe una nota hoy.')
      } else {
        setSaveError(err.response?.data?.error || err.message || 'Error al guardar. Intentá de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async ({ mood, content, completedHabits, habitData }) => {
    setSubmitting(true)
    try {
      const { data } = await api.put(`/journal/${todayEntry.id}`, { moodScore: mood, content, completedHabits, habitData })
      setEntries((prev) => prev.map((e) => e.id === todayEntry.id ? data.entry : e))
      showSuccess('Nota actualizada.')
      setEditMode(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar.')
    } finally {
      setSubmitting(false)
    }
  }

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-24 bg-gray-100 dark:bg-gray-800" />)}
      </div>
    )
  }

  const todayMoodConfig = todayEntry ? MOOD_ICONS[todayEntry.moodScore] : null

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* ── Fecha + Saludo ── */}
      <div className="px-1 pt-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest capitalize">
          {todayString()}
        </p>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
      </div>

      {/* ── Mensaje de éxito ── */}
      {successMsg && (
        <div className="card bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-semibold text-center animate-fade-in shadow-none">
          {successMsg}
        </div>
      )}

      {/* ── Error de guardado ── */}
      {saveError && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold text-center animate-fade-in shadow-none">
          ⚠️ {saveError}
        </div>
      )}


      {/* ── SECCIÓN PRINCIPAL: Nota de hoy ── */}
      {!wroteToday ? (
        // No hay nota hoy → mostrar formulario de creación
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
            ¿Cómo te sentís hoy?
          </p>
          <NoteForm
            onSubmit={handleCreate}
            habits={habits}
            submitting={submitting}
          />
        </div>
      ) : editMode ? (
        // Modo edición de la nota de hoy
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
            Editando nota de hoy
          </p>
          <NoteForm
            initialMood={todayEntry.moodScore}
            initialContent={todayEntry.content}
            initialHabits={todayEntry.completedHabits || []}
            initialHabitData={todayEntry.habitData || {}}
            habits={habits}
            onSubmit={handleUpdate}
            onCancel={() => setEditMode(false)}
            isEdit
            submitting={submitting}
          />
        </div>
      ) : (
        // Nota de hoy ya registrada → mostrar en modo lectura
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Nota de hoy
              </p>
            </div>
            {canEditToday && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Edit2 size={12} /> Editar
              </button>
            )}
          </div>

          <div className="card border-l-4" style={{ borderLeftColor: todayMoodConfig?.color }}>
            {/* Header de la nota */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: todayMoodConfig?.color }}
              >
                <MoodIcon score={todayEntry.moodScore} size={18} color="white" />
                <span className="text-[10px] font-bold" style={{ color: 'white' }}>
                  {todayEntry.moodScore}
                </span>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white"
                   style={{ color: todayMoodConfig?.color }}>
                  {todayMoodConfig?.label}
                </p>
                <p className="text-xs text-gray-400">
                  {!canEditToday && '🔒 Bloqueada · '}
                  Hoy
                </p>
              </div>
            </div>
            {/* Contenido */}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {todayEntry.content}
            </p>
            {/* Hábitos: toggle completados */}
            {todayEntry.completedHabits?.length > 0 && habits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {todayEntry.completedHabits.map(hId => {
                  const h = habits.find(x => x.id === hId)
                  if (!h) return null
                  const type = h.trackingType || 'toggle'
                  const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                  const hData = todayEntry.habitData?.[hId]
                  const showQty = (type === 'toggle+qty') && hData?.qty !== undefined && hData?.qty !== ''
                  return (
                    <span key={hId} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
                      <IconComp size={12} /> {h.text}
                      {showQty && <span className="font-bold ml-0.5">{hData.qty} {h.unit}</span>}
                    </span>
                  )
                })}
              </div>
            )}
            {/* Hábitos qty: siempre se muestran si tienen valor */}
            {habits.filter(h => (h.trackingType === 'qty') && todayEntry.habitData?.[h.id]?.qty !== undefined && todayEntry.habitData?.[h.id]?.qty !== '').length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {habits.filter(h => h.trackingType === 'qty' && todayEntry.habitData?.[h.id]?.qty !== undefined && todayEntry.habitData?.[h.id]?.qty !== '').map(h => {
                  const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                  const qty = todayEntry.habitData[h.id].qty
                  return (
                    <span key={h.id} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
                      <IconComp size={12} /> {h.text}: <span className="font-bold">{qty} {h.unit}</span>
                    </span>
                  )
                })}
              </div>
            )}
            {!canEditToday && (
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                🔒 El período de edición (24h) ha expirado.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Próxima sesión: removida ── */}

      {/* ── Vinculación pendiente ── */}
      {!user?.psychologistId && (
        <div className="card border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 shadow-none">
          <p className="text-sm text-indigo-700 dark:text-indigo-400">
            💡 Sin psicólogo vinculado.{' '}
            <Link to="/patient/profile" className="font-bold underline">Ingresar código</Link>
          </p>
        </div>
      )}

      {/* ── Gráfico (movido a Historial) ── */}
    </div>
  )
}
