import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  TrendingUp, CheckCircle2, Save, X, Edit2,
} from 'lucide-react'
import api from '../../lib/api'
import { MOOD_ICONS, HABIT_ICONS, entryDateKey, isEditable } from '../../lib/constants'
import { syncDailyReminders } from '../../lib/reminders'
import MoodIcon from '../../components/MoodIcon'
import MoodChart from '../../components/MoodChart'
import { usePageTitle } from '../../hooks/usePageTitle'
import { getPatientCache, updatePatientCache } from '../../lib/patientCache'

import NoteForm from '../../components/NoteForm'

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

// ── Dashboard principal ──────────────────────────────────────────
export default function PatientDashboard() {
  usePageTitle('Mi día')
  const { user } = useAuth()
  const initialCache = getPatientCache()
  const [entries, setEntries] = useState(initialCache.entries || [])
  const [habits, setHabits] = useState(initialCache.habits || [])
  const [appointments, setAppointments] = useState(initialCache.appointments || [])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [chartDays, setChartDays] = useState(14)
  const [yesterdayMode, setYesterdayMode] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    // Cargar cada recurso de forma independiente:
    // si uno falla (ej: journal o appointments con 401 temporal),
    // los hábitos siguen cargando y aparecen en el formulario.
    setLoading(true)
    const fetches = [
      api.get('/journal').then(r => {
        setEntries(r.data.entries)
        updatePatientCache('entries', r.data.entries)
        // El permiso se solicita una vez al entrar como paciente. Si la persona
        // lo rechaza, puede volver a intentarlo desde Perfil.
        syncDailyReminders(r.data.entries, { requestPermission: true }).catch(() => {})
      }).catch(() => {}),
      api.get('/appointments').then(r => { setAppointments(r.data.appointments); updatePatientCache('appointments', r.data.appointments) }).catch(() => {}),
      api.get('/habits').then(r => { setHabits(r.data.habits); updatePatientCache('habits', r.data.habits) }).catch(() => {}),
    ]
    Promise.all(fetches).finally(() => setLoading(false))
  }, [])

  const todayDate = entryDateKey()
  const yesterdayDate = entryDateKey(new Date(Date.now() - 86400000))
  const todayEntry = entries.find((entry) => entry.entryDate === todayDate)
  const yesterdayEntry = entries.find((entry) => entry.entryDate === yesterdayDate)
  const wroteToday = !!todayEntry
  const canEditToday = wroteToday && isEditable(todayEntry?.entryDate)
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

  const handleCreate = async ({ mood, content, completedHabits, habitData }, entryDate = todayDate) => {
    setSaveError('')
    setSubmitting(true)
    try {
      const { data } = await api.post('/journal', { moodScore: mood, content, completedHabits, habitData, entryDate })
      const nextEntries = [data.entry, ...entries]
      setEntries(nextEntries)
      updatePatientCache('entries', nextEntries)
      syncDailyReminders(nextEntries).catch(() => {})
      showSuccess(entryDate === todayDate ? '¡Nota de hoy guardada! 🎉' : '¡Nota de ayer guardada!')
      setEditMode(false)
      setYesterdayMode(false)
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

  const handleUpdate = async (entry, { mood, content, completedHabits, habitData }) => {
    setSubmitting(true)
    try {
      const { data } = await api.put(`/journal/${entry.id}`, { moodScore: mood, content, completedHabits, habitData })
      const nextEntries = entries.map((item) => item.id === entry.id ? data.entry : item)
      setEntries(nextEntries)
      updatePatientCache('entries', nextEntries)
      syncDailyReminders(nextEntries).catch(() => {})
      showSuccess('Nota actualizada.')
      setEditMode(false)
      setYesterdayMode(false)
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
      <div className="px-1 pt-1 sm:pt-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest capitalize">
          {todayString()}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-0.5">
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
            onSubmit={(form) => handleCreate(form, todayDate)}
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
            onSubmit={(form) => handleUpdate(todayEntry, form)}
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
                🔒 El período de edición (1 semana) ha expirado.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Recuperar o editar únicamente la anotación de ayer ── */}
      {yesterdayMode ? (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
              {yesterdayEntry ? 'Editando la nota de ayer' : 'Anotación pendiente de ayer'}
            </p>
            <span className="text-[11px] text-gray-400">Disponible solo hoy</span>
          </div>
          <NoteForm
            initialMood={yesterdayEntry?.moodScore ?? 5}
            initialContent={yesterdayEntry?.content ?? ''}
            initialHabits={yesterdayEntry?.completedHabits || []}
            initialHabitData={yesterdayEntry?.habitData || {}}
            habits={habits}
            dayLabel="ayer"
            onSubmit={(form) => yesterdayEntry
              ? handleUpdate(yesterdayEntry, form)
              : handleCreate(form, yesterdayDate)}
            onCancel={() => setYesterdayMode(false)}
            isEdit={Boolean(yesterdayEntry)}
            submitting={submitting}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setYesterdayMode(true)}
          className="w-full card !p-4 flex items-center gap-3 text-left border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
        >
          <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
            <Edit2 size={19} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">
              {yesterdayEntry ? '¿Querés revisar la nota de ayer?' : '¿Te olvidaste de anotar ayer?'}
            </span>
            <span className="block text-xs text-gray-400 mt-0.5">
              {yesterdayEntry ? 'Todavía podés editarla hasta que termine el día.' : 'Todavía podés crearla. Después de hoy se bloqueará.'}
            </span>
          </span>
        </button>
      )}

      {/* ── Próxima sesión: removida ── */}

      {/* ── Gráfico (movido a Historial) ── */}
    </div>
  )
}
