import { useState, useEffect } from 'react'
import {
  createJournalEntry,
  deleteJournalEntry,
  getHabits,
  getJournal,
  updateJournalEntry,
} from '../../lib/api'
import { MOOD_ICONS, HABIT_ICONS, isEditable, entryDateToDate, entryDateKey } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import MoodCalendar from '../../components/MoodCalendar'
import MoodChart from '../../components/MoodChart'
import NoteForm from '../../components/NoteForm'
import { syncDailyReminders } from '../../lib/reminders'
import {
  Trash2, ChevronDown, ChevronUp, Clock, TrendingUp, BarChart2, Book, Calendar,
  Edit2, X, Check, Plus, CalendarPlus,
} from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { getPatientCache, updatePatientCache } from '../../lib/patientCache'
import HabitCorrelationCard from '../../components/HabitCorrelation'
import ConfirmActionModal from '../../components/ConfirmActionModal'
import { useToast } from '../../context/ToastContext'

// ── Página de historial ───────────────────────────────────
export default function HistoryPage() {
  const { showError } = useToast()
  usePageTitle('Historial')
  const initialCache = getPatientCache()
  const [entries, setEntries] = useState(initialCache.entries || [])
  const [habits, setHabits] = useState(initialCache.habits || [])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [isAddingForDay, setIsAddingForDay] = useState(false)
  const [savingNew, setSavingNew] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [tab, setTab] = useState('entries') // 'entries' | 'correlation' | 'chart'
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null)

  const handleUpdate = async (entryId, { mood, content, completedHabits, habitData }) => {
    setSavingEdit(true)
    try {
      const { data } = await updateJournalEntry(entryId, {
        moodScore: mood,
        content,
        completedHabits,
        habitData,
      })
      const nextEntries = entries.map((item) => (item.id === entryId ? data.entry : item))
      setEntries(nextEntries)
      updatePatientCache('entries', nextEntries)
      syncDailyReminders(nextEntries).catch(() => {})
      setEditingEntryId(null)
      setFeedbackMsg('¡Anotación modificada con éxito! ✨')
      setTimeout(() => setFeedbackMsg(''), 4000)
    } catch (err) {
      console.error('Error al actualizar anotación:', err)
      showError(err.response?.data?.error || err.message || 'Error al actualizar la anotación.')
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    // La correlación se calcula en el componente a partir de entradas y hábitos.
    if (initialCache.entries && initialCache.habits) {
      setLoading(false)
      return
    }
    Promise.all([
      getJournal(),
      getHabits(),
    ]).then(([jRes, hRes]) => {
      setEntries(jRes.data.entries)
      setHabits(hRes.data.habits)
      updatePatientCache('entries', jRes.data.entries)
      updatePatientCache('habits', hRes.data.habits)
    }).catch(() => {}).finally(() => setLoading(false))
    // Solo al montar: la caché inicial ya se leyó en el primer render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await deleteJournalEntry(id)
      setEntries((prev) => {
        const nextEntries = prev.filter((e) => e.id !== id)
        updatePatientCache('entries', nextEntries)
        return nextEntries
      })
      setConfirmDeleteEntry(null)
    } catch (err) {
      showError(err.response?.data?.error || 'Error al eliminar.')
    } finally {
      setDeleting(null)
    }
  }

  const handleDayClick = (date) => {
    setSelectedDay((prev) => {
      const isSame = prev && entryDateKey(prev) === entryDateKey(date)
      return isSame ? null : date
    })
    setIsAddingForDay(false)
    setEditingEntryId(null)
  }

  const handleCreateForDay = async (targetDate, { mood, content, completedHabits, habitData }) => {
    setSavingNew(true)
    const targetDateKey = entryDateKey(targetDate)
    try {
      const { data } = await createJournalEntry({
        moodScore: mood,
        content,
        completedHabits,
        habitData,
        entryDate: targetDateKey,
      })
      const nextEntries = [data.entry, ...entries].sort((a, b) => {
        const da = a.entryDate || a.createdAt
        const db = b.entryDate || b.createdAt
        return db.localeCompare(da)
      })
      setEntries(nextEntries)
      updatePatientCache('entries', nextEntries)
      syncDailyReminders(nextEntries).catch(() => {})
      setIsAddingForDay(false)
      const dayName = targetDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
      setFeedbackMsg(`¡Anotación del ${dayName} guardada con éxito! 🎉`)
      setTimeout(() => setFeedbackMsg(''), 4000)
    } catch (err) {
      console.error('Error al crear anotación para el día:', err)
      showError(err.response?.data?.error || err.message || 'Error al guardar la anotación.')
    } finally {
      setSavingNew(false)
    }
  }

  const selectedDayKey = selectedDay ? entryDateKey(selectedDay) : null
  const todayKey = entryDateKey()
  const isFutureSelectedDay = selectedDayKey ? selectedDayKey > todayKey : false
  const canAddForSelectedDay = selectedDayKey ? isEditable(selectedDay) : false

  let filtered = entries
  if (selectedDayKey) {
    filtered = filtered.filter((e) => {
      const eDate = e.entryDate || entryDateKey(entryDateToDate(e.createdAt))
      return eDate === selectedDayKey
    })
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-20 bg-gray-100 dark:bg-gray-800" />)}
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-in pb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Historial</h1>
        <p className="text-sm text-gray-400">{entries.length} entradas</p>
      </div>

      <ConfirmActionModal
        isOpen={!!confirmDeleteEntry}
        onClose={() => setConfirmDeleteEntry(null)}
        onConfirm={() => handleDelete(confirmDeleteEntry)}
        title="¿Eliminar esta entrada?"
        description="Se eliminará esta anotación y no podrás recuperarla desde el historial."
        confirmLabel="Eliminar"
      />

      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white p-1">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-4">
        <button
          onClick={() => setTab('entries')}
          className={`flex-1 min-h-11 px-1 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tab === 'entries'
              ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Book size={14} /> Entradas
        </button>
        <button
          onClick={() => setTab('chart')}
          className={`flex-1 min-h-11 px-1 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tab === 'chart'
              ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <TrendingUp size={14} /> Evolución
        </button>
        <button
          onClick={() => setTab('correlation')}
          className={`flex-1 min-h-11 px-1 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tab === 'correlation'
              ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <BarChart2 size={14} /> Hábitos
        </button>
      </div>

      {/* TAB: Correlación */}
      {tab === 'correlation' && (
        <HabitCorrelationCard habits={habits} entries={entries} audience="patient" />
      )}

      {/* TAB: Gráfico */}
      {tab === 'chart' && (
        <>
          {entries.length >= 2 ? (
            <div className="card mb-4">
              <MoodChart 
                entries={entries} 
                mode="patient" 
                height={200} 
                onDayClick={handleDayClick} 
              />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Sin datos suficientes aún</p>
              <p className="text-sm mt-1">Registrá al menos 2 días para ver tu evolución.</p>
            </div>
          )}

          {selectedDay && (
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1">
                <Calendar size={14} /> {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button onClick={() => setSelectedDay(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Cerrar
              </button>
            </div>
          )}
          {!selectedDay && entries.length >= 2 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Tocá un punto en el gráfico para ver la nota de ese día.
            </div>
          )}
        </>
      )}

      {/* RENDERIZADO DE ENTRADAS (Para la tab 'entries' o cuando hay un 'selectedDay' en 'chart') */}
      {(tab === 'entries' || (tab === 'chart' && selectedDay)) && (
        <>
          {tab === 'entries' ? (
            <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-4">
              <div className="space-y-2">
                <MoodCalendar
                  entries={entries}
                  onDayClick={handleDayClick}
                  selectedDate={selectedDay}
                  mode="patient"
                />
                {selectedDay && (
                  <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-2xl bg-brand-50/80 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/60">
                    <p className="text-xs text-brand-700 dark:text-brand-300 font-semibold flex items-center gap-1.5 capitalize">
                      <Calendar size={14} className="text-brand-500" />
                      {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <button
                      onClick={() => { setSelectedDay(null); setIsAddingForDay(false) }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 font-medium flex items-center gap-1 hover:underline"
                    >
                      <X size={13} /> Ver todas
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {selectedDay && filtered.length === 0 && (
                  <div className="animate-fade-in my-2">
                    {canAddForSelectedDay ? (
                      <div className="card border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/60 dark:bg-brand-950/20 text-center py-6 px-4 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center shadow-sm border border-brand-200 dark:border-brand-800">
                          <CalendarPlus size={24} />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-gray-800 dark:text-white capitalize">
                            Sin anotación para el {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                            Podés registrar cómo te sentiste ese día.
                          </p>
                        </div>
                        {!isAddingForDay ? (
                          <button
                            type="button"
                            onClick={() => setIsAddingForDay(true)}
                            className="btn-patient inline-flex items-center gap-2 text-xs shadow-sm px-4 py-2.5 font-semibold"
                          >
                            <Plus size={15} /> Añadir anotación para este día
                          </button>
                        ) : (
                          <div className="mt-3 text-left border-t border-brand-200 dark:border-brand-800/60 pt-3">
                            <NoteForm
                              initialMood={5}
                              initialContent=""
                              initialHabits={[]}
                              initialHabitData={{}}
                              habits={habits}
                              dayLabel={selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                              isEdit={false}
                              submitting={savingNew}
                              onSubmit={(formData) => handleCreateForDay(selectedDay, formData)}
                              onCancel={() => setIsAddingForDay(false)}
                            />
                          </div>
                        )}
                      </div>
                    ) : isFutureSelectedDay ? (
                      <div className="card text-center py-8 text-gray-400">
                        <Calendar size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Día futuro</p>
                        <p className="text-xs text-gray-400 mt-1">No podés registrar anotaciones de días futuros.</p>
                      </div>
                    ) : (
                      <div className="card text-center py-8 text-gray-400">
                        <Clock size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Fecha no disponible</p>
                        <p className="text-xs text-gray-400 mt-1">Podés registrar o editar notas de hoy o de cualquier día anterior, pero no de fechas futuras.</p>
                      </div>
                    )}
                  </div>
                )}

                {!selectedDay && entries.length === 0 && (
                  <div className="text-center py-12">
                    <Book size={48} className="mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-bold text-gray-700 dark:text-white mb-2">Historial vacío</h2>
                    <p className="text-gray-400 text-sm">Tus anotaciones aparecerán aquí. Tocá un día en el calendario de arriba para añadirla.</p>
                  </div>
                )}

                {filtered.length > 0 && (
                  <div className="space-y-2">
                    {filtered.map((entry) => {
                      const canEdit = isEditable(entry.entryDate || entry.createdAt)
                      const isEditing = editingEntryId === entry.id
                      const open = expanded === entry.id || selectedDay !== null
                      const config = MOOD_ICONS[entry.moodScore]
                      const entryHabits = habits.filter(h => (entry.completedHabits || []).includes(h.id))
                      const entryDateObj = entryDateToDate(entry.entryDate || entry.createdAt)
                      const formattedDay = entryDateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })

                      if (isEditing) {
                        return (
                          <div key={entry.id} className="card border-2 border-brand-300 dark:border-brand-700 bg-white dark:bg-gray-800 shadow-md animate-fade-in">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                                  <Edit2 size={16} />
                                </span>
                                <div>
                                  <h2 className="text-sm font-bold text-gray-800 dark:text-white capitalize">
                                    Modificar anotación ({formattedDay})
                                  </h2>
                                  <p className="text-[11px] text-gray-400">
                                    Podés editar tu anotación
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingEntryId(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Cancelar edición"
                              >
                                <X size={18} />
                              </button>
                            </div>
                            <NoteForm
                              initialMood={entry.moodScore}
                              initialContent={entry.content || ''}
                              initialHabits={entry.completedHabits || []}
                              initialHabitData={entry.habitData || {}}
                              habits={habits}
                              dayLabel={formattedDay}
                              isEdit={true}
                              submitting={savingEdit}
                              onSubmit={(form) => handleUpdate(entry.id, form)}
                              onCancel={() => setEditingEntryId(null)}
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={entry.id} className="card cursor-pointer hover:shadow-md transition-all duration-200">
                          <div
                className="flex items-center gap-3"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : entry.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(open ? null : entry.id) } }}
              >
                            <div
                              className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm"
                              style={{ backgroundColor: config?.color, border: `1px solid ${config?.color}40` }}
                            >
                              <MoodIcon score={entry.moodScore} size={22} color="white" />
                              <span className="text-xs font-bold mt-0.5" style={{ color: 'white' }}>{entry.moodScore}/10</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold mb-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="capitalize" style={{ color: config?.color }}>
                                  {new Date(entry.createdAt).toLocaleDateString('es-AR', { weekday: 'long' })}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 font-normal text-xs">
                                  {new Date(entry.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{config?.label}</span>
                              {!open && entryHabits.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {entryHabits.slice(0, 3).map(h => {
                                    const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                    return <span key={h.id} className="p-1 bg-gray-100 dark:bg-gray-800 rounded-md text-brand-500"><IconComp size={12} /></span>
                                  })}
                                  {entryHabits.length > 3 && (
                                    <span className="text-xs text-gray-400">+{entryHabits.length - 3}</span>
                                  )}
                                </div>
                              )}
                              {!open && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{entry.content || '(Sin texto)'}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingEntryId(entry.id)
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                                    title="Modificar anotación"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteEntry(entry.id) }}
                                    disabled={deleting === entry.id}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Eliminar anotación"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                              {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                            </div>
                          </div>

                          {open && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fade-in space-y-3">
                              {entry.content && (
                                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                              )}
                              {(() => {
                                const toggleDone = habits.filter(h =>
                                  (!h.trackingType || h.trackingType === 'toggle') &&
                                  (entry.completedHabits || []).includes(h.id)
                                )
                                const qtyToggleDone = habits.filter(h =>
                                  h.trackingType === 'toggle+qty' &&
                                  entry.habitData?.[h.id]?.done === true
                                )
                                const qtyOnly = habits.filter(h =>
                                  h.trackingType === 'qty' &&
                                  entry.habitData?.[h.id]?.qty !== undefined &&
                                  entry.habitData?.[h.id]?.qty !== ''
                                )
                                const allHabits = [...toggleDone, ...qtyToggleDone, ...qtyOnly]
                                if (allHabits.length === 0) return null
                                return (
                                  <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Hábitos</p>
                                    <div className="flex flex-wrap gap-2">
                                      {toggleDone.map(h => {
                                        const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                        const note = entry.habitData?.[h.id]?.note
                                        return (
                                          <div key={h.id}>
                                            <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium">
                                              <IconComp size={14} /> {h.text}
                                            </span>
                                            {note && <p className="text-[11px] text-gray-400 mt-0.5 pl-1 italic">{note}</p>}
                                          </div>
                                        )
                                      })}
                                      {qtyToggleDone.map(h => {
                                        const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                        const hd = entry.habitData?.[h.id] || {}
                                        return (
                                          <div key={h.id}>
                                            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium">
                                              <IconComp size={14} /> {h.text}
                                              {hd.qty !== undefined && hd.qty !== '' && (
                                                <span className="font-bold text-brand-600 dark:text-brand-400 ml-0.5">{hd.qty} {h.unit}</span>
                                              )}
                                            </span>
                                            {hd.note && <p className="text-[11px] text-gray-400 mt-0.5 pl-1 italic">{hd.note}</p>}
                                          </div>
                                        )
                                      })}
                                      {qtyOnly.map(h => {
                                        const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                        const hd = entry.habitData?.[h.id] || {}
                                        return (
                                          <div key={h.id}>
                                            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium">
                                              <IconComp size={14} /> {h.text}
                                              <span className="font-bold ml-0.5">{hd.qty} {h.unit}</span>
                                            </span>
                                            {hd.note && <p className="text-[11px] text-gray-400 mt-0.5 pl-1 italic">{hd.note}</p>}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })()}
                              {canEdit && (
                                <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-gray-700/60 mt-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingEntryId(entry.id)
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-xl transition-all"
                                  >
                                    <Edit2 size={13} /> Modificar anotación
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // tab === 'chart' con un día seleccionado: mostrar las entradas del día
            <div className="space-y-2">
              {filtered.length === 0 && selectedDay && (
                <div className="card text-center py-8 text-gray-400 animate-fade-in">
                  <Calendar size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Sin anotación para este día</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              )}
              {filtered.map((entry) => {
                const canEdit = isEditable(entry.entryDate || entry.createdAt)
                const isEditing = editingEntryId === entry.id
                const config = MOOD_ICONS[entry.moodScore]
                const entryDateObj = entryDateToDate(entry.entryDate || entry.createdAt)
                const formattedDay = entryDateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })

                if (isEditing) {
                  return (
                    <div key={entry.id} className="card border-2 border-brand-300 dark:border-brand-700 bg-white dark:bg-gray-800 shadow-md animate-fade-in">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                            <Edit2 size={16} />
                          </span>
                          <div>
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white capitalize">
                              Modificar anotación ({formattedDay})
                            </h2>
                            <p className="text-[11px] text-gray-400">
                              Podés editar tu anotación
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingEntryId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Cancelar edición"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <NoteForm
                        initialMood={entry.moodScore}
                        initialContent={entry.content || ''}
                        initialHabits={entry.completedHabits || []}
                        initialHabitData={entry.habitData || {}}
                        habits={habits}
                        dayLabel={formattedDay}
                        isEdit={true}
                        submitting={savingEdit}
                        onSubmit={(form) => handleUpdate(entry.id, form)}
                        onCancel={() => setEditingEntryId(null)}
                      />
                    </div>
                  )
                }

                return (
                  <div key={entry.id} className="card animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: config?.color, border: `1px solid ${config?.color}40` }}
                      >
                        <MoodIcon score={entry.moodScore} size={22} color="white" />
                        <span className="text-xs font-bold mt-0.5" style={{ color: 'white' }}>{entry.moodScore}/10</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold mb-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="capitalize" style={{ color: config?.color }}>
                            {entryDateObj.toLocaleDateString('es-AR', { weekday: 'long' })}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 font-normal text-xs">
                            {entryDateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{config?.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingEntryId(entry.id) }}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                              title="Modificar anotación"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteEntry(entry.id) }}
                              disabled={deleting === entry.id}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar anotación"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detalle siempre expandido en el tab gráfico */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      {entry.content && (
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                      )}
                      {(() => {
                        const toggleDone = habits.filter(h =>
                          (!h.trackingType || h.trackingType === 'toggle') &&
                          (entry.completedHabits || []).includes(h.id)
                        )
                        const qtyToggleDone = habits.filter(h =>
                          h.trackingType === 'toggle+qty' &&
                          entry.habitData?.[h.id]?.done === true
                        )
                        const qtyOnly = habits.filter(h =>
                          h.trackingType === 'qty' &&
                          entry.habitData?.[h.id]?.qty !== undefined &&
                          entry.habitData?.[h.id]?.qty !== ''
                        )
                        const allHabits = [...toggleDone, ...qtyToggleDone, ...qtyOnly]
                        if (allHabits.length === 0) return null
                        return (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Hábitos</p>
                            <div className="flex flex-wrap gap-2">
                              {toggleDone.map(h => {
                                const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                const note = entry.habitData?.[h.id]?.note
                                return (
                                  <div key={h.id}>
                                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium">
                                      <IconComp size={14} /> {h.text}
                                    </span>
                                    {note && <p className="text-[11px] text-gray-400 mt-0.5 pl-1 italic">{note}</p>}
                                  </div>
                                )
                              })}
                              {qtyToggleDone.map(h => {
                                const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                const hd = entry.habitData?.[h.id] || {}
                                return (
                                  <div key={h.id}>
                                    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium">
                                      <IconComp size={14} /> {h.text}
                                      {hd.qty !== undefined && hd.qty !== '' && (
                                        <span className="font-bold text-brand-600 dark:text-brand-400 ml-0.5">{hd.qty} {h.unit}</span>
                                      )}
                                    </span>
                                    {hd.note && <p className="text-[11px] text-gray-400 mt-0.5 pl-1 italic">{hd.note}</p>}
                                  </div>
                                )
                              })}
                              {qtyOnly.map(h => {
                                const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                                const hd = entry.habitData?.[h.id] || {}
                                return (
                                  <div key={h.id}>
                                    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium">
                                      <IconComp size={14} /> {h.text}
                                      <span className="font-bold ml-0.5">{hd.qty} {h.unit}</span>
                                    </span>
                                    {hd.note && <p className="text-[11px] text-gray-400 mt-0.5 pl-1 italic">{hd.note}</p>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                      {canEdit && (
                        <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-gray-700/60 mt-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingEntryId(entry.id) }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-xl transition-all"
                          >
                            <Edit2 size={13} /> Modificar anotación
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
