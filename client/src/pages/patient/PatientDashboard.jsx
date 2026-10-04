import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  CheckCircle2, Edit2, Flame, BarChart2, BookOpen, TrendingUp,
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

// ── Tarjeta de stat rápida ──────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="card !p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '22' }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold text-gray-800 dark:text-white leading-none">
          {value ?? '—'}
        </div>
        <div className="text-xs text-gray-400 font-medium truncate">{label}</div>
        {sub && <div className="text-[11px] text-gray-300 dark:text-gray-500 truncate">{sub}</div>}
      </div>
    </div>
  )
}

// ── Dashboard principal ──────────────────────────────────────────
export default function PatientDashboard() {
  usePageTitle('Mi día')
  const { user } = useAuth()
  const initialCache = getPatientCache()
  const [entries, setEntries] = useState(initialCache.entries || [])
  const [habits, setHabits] = useState(initialCache.habits || [])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [yesterdayMode, setYesterdayMode] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    setLoading(true)
    const fetches = [
      api.get('/journal').then(r => {
        setEntries(r.data.entries)
        updatePatientCache('entries', r.data.entries)
        syncDailyReminders(r.data.entries, { requestPermission: true }).catch(() => {})
      }).catch(() => {}),
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

  // Stats para desktop
  const last14 = entries.filter(e => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14); cutoff.setHours(0,0,0,0)
    return new Date(e.createdAt) >= cutoff
  })
  const avgMood = last14.length
    ? Math.round((last14.reduce((s, e) => s + e.moodScore, 0) / last14.length) * 10) / 10
    : null

  // Racha de días consecutivos
  const streak = (() => {
    if (!entries.length) return 0
    let count = 0
    let cursor = new Date(); cursor.setHours(0,0,0,0)
    const keys = new Set(entries.map(e => e.entryDate))
    while (true) {
      const key = entryDateKey(cursor)
      if (!keys.has(key)) break
      count++
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  })()

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
    <div className="animate-fade-in pb-6">

      {/* ── Feedback ── */}
      {successMsg && (
        <div className="card bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-semibold text-center animate-fade-in shadow-none mb-4">
          {successMsg}
        </div>
      )}
      {saveError && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold text-center animate-fade-in shadow-none mb-4">
          ⚠️ {saveError}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT (md+): hero + stats + 2 cols
          ══════════════════════════════════════════════ */}
      <div className="hidden md:block space-y-5">

        {/* ── Hero: saludo + stats ── */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest capitalize">
              {todayString()}
            </p>
            <h1 className="font-display text-3xl font-bold text-gray-800 dark:text-white mt-0.5">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
          </div>
          <StatCard
            label="Racha actual"
            value={`${streak} día${streak !== 1 ? 's' : ''}`}
            color="#bd5940"
            icon={Flame}
          />
          <StatCard
            label="Ánimo promedio"
            value={avgMood ? `${avgMood}/10` : '—'}
            sub="Últimos 14 días"
            color="#059669"
            icon={TrendingUp}
          />
          <StatCard
            label="Entradas totales"
            value={entries.length}
            color="#267783"
            icon={BookOpen}
          />
        </div>

        {/* ── Cuerpo principal: nota de hoy (izq) + gráfico + ayer (der) ── */}
        <div className="grid grid-cols-5 gap-4 items-start">

          {/* Columna izquierda: nota de hoy (3/5 del ancho) */}
          <div className="col-span-3">
            {!wroteToday ? (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                  ¿Cómo te sentís hoy?
                </p>
                <NoteForm
                  onSubmit={(form) => handleCreate(form, todayDate)}
                  habits={habits}
                  submitting={submitting}
                />
              </div>
            ) : editMode ? (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
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
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      Nota de hoy
                    </p>
                  </div>
                  {canEditToday && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                  )}
                </div>

                <div className="card border-l-4" style={{ borderLeftColor: todayMoodConfig?.color }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-3xl flex flex-col items-center justify-center shrink-0 shadow-md"
                      style={{ backgroundColor: todayMoodConfig?.color }}
                    >
                      <MoodIcon score={todayEntry.moodScore} size={24} color="white" />
                      <span className="text-xs font-extrabold mt-1" style={{ color: 'white' }}>
                        {todayEntry.moodScore}/10
                      </span>
                    </div>
                    <div>
                      <p className="text-xl font-bold" style={{ color: todayMoodConfig?.color }}>
                        {todayMoodConfig?.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {!canEditToday ? '🔒 Período de edición expirado' : 'Hoy'}
                      </p>
                    </div>
                  </div>

                  {todayEntry.content && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
                      {todayEntry.content}
                    </p>
                  )}

                  {/* Hábitos toggle */}
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
                  {/* Hábitos qty */}
                  {habits.filter(h => h.trackingType === 'qty' && todayEntry.habitData?.[h.id]?.qty !== undefined && todayEntry.habitData?.[h.id]?.qty !== '').length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {habits.filter(h => h.trackingType === 'qty' && todayEntry.habitData?.[h.id]?.qty !== undefined && todayEntry.habitData?.[h.id]?.qty !== '').map(h => {
                        const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                        return (
                          <span key={h.id} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
                            <IconComp size={12} /> {h.text}: <span className="font-bold">{todayEntry.habitData[h.id].qty} {h.unit}</span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: mini chart + nota de ayer (2/5 del ancho) */}
          <div className="col-span-2 space-y-4">

            {/* Mini gráfico de ánimo */}
            {entries.length >= 2 && (
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <BarChart2 size={13} />
                    Evolución del ánimo
                  </div>
                  {avgMood && (
                    <span className="text-xs font-bold" style={{ color: todayMoodConfig?.color || '#059669' }}>
                      Prom. {avgMood}/10
                    </span>
                  )}
                </div>
                <MoodChart
                  entries={entries}
                  mode="patient"
                  height={160}
                  showSelector={false}
                  days={14}
                />
              </div>
            )}

            {/* Nota de ayer */}
            {yesterdayMode ? (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                    {yesterdayEntry ? 'Editando nota de ayer' : 'Anotación de ayer'}
                  </p>
                  <span className="text-[11px] text-gray-400">Solo disponible hoy</span>
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
                className="w-full card !p-4 flex items-center gap-3 text-left border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
              >
                <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                  <Edit2 size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                    {yesterdayEntry ? '¿Querés revisar la nota de ayer?' : '¿Olvidaste anotar ayer?'}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {yesterdayEntry
                      ? 'Podés editarla hasta que termine el día.'
                      : 'Podés crearla. Después de hoy se bloqueará.'}
                  </span>
                </span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT (< md): layout original vertical
          ══════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">

        {/* Fecha + Saludo */}
        <div className="px-1 pt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest capitalize">
            {todayString()}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-0.5">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
        </div>

        {/* Nota de hoy */}
        {!wroteToday ? (
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
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Nota de hoy
                </p>
              </div>
              {canEditToday && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Edit2 size={12} /> Editar
                </button>
              )}
            </div>
            <div className="card border-l-4" style={{ borderLeftColor: todayMoodConfig?.color }}>
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
                  <p className="font-bold" style={{ color: todayMoodConfig?.color }}>
                    {todayMoodConfig?.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {!canEditToday && '🔒 Bloqueada · '}Hoy
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {todayEntry.content}
              </p>
              {todayEntry.completedHabits?.length > 0 && habits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {todayEntry.completedHabits.map(hId => {
                    const h = habits.find(x => x.id === hId)
                    if (!h) return null
                    const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                    return (
                      <span key={hId} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
                        <IconComp size={12} /> {h.text}
                      </span>
                    )
                  })}
                </div>
              )}
              {!canEditToday && (
                <p className="text-xs text-gray-400 mt-3">🔒 Período de edición (1 semana) expirado.</p>
              )}
            </div>
          </div>
        )}

        {/* Nota de ayer (mobile) */}
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

      </div>
    </div>
  )
}
