import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { MOOD_ICONS, HABIT_ICONS, formatDate, isEditable } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import MoodCalendar from '../../components/MoodCalendar'
import MoodChart from '../../components/MoodChart'
import { Trash2, ChevronDown, ChevronUp, Clock, TrendingUp, TrendingDown, Minus, BarChart2, Book, Calendar } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { getPatientCache, updatePatientCache } from '../../lib/patientCache'

// ── Tarjeta de correlación hábito-ánimo ──────────────────
function HabitCorrelationCard({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-sage-500" />
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
          Hábitos y estado de ánimo
        </h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Comparación de tu ánimo promedio en días que cumpliste cada hábito vs. los que no.
      </p>
      <div className="space-y-3">
        {data.sort((a, b) => (b.impact ?? -99) - (a.impact ?? -99)).map(item => {
          const impact = item.impact ?? 0
          const positive = impact > 0.2
          const negative = impact < -0.2
          const ImpactIcon = positive ? TrendingUp : negative ? TrendingDown : Minus
          const impactColor = positive ? 'text-emerald-500' : negative ? 'text-red-400' : 'text-gray-400'
          const barColor = positive ? 'bg-emerald-400' : negative ? 'bg-red-400' : 'bg-gray-300'
          const maxBar = 100

          // Barras normalizadas a 10
          const withPct  = item.avgWith    ? (item.avgWith    / 10) * 100 : 0
          const withoutPct = item.avgWithout ? (item.avgWithout / 10) * 100 : 0

          const IconComp = HABIT_ICONS[item.icon] || HABIT_ICONS.CheckCircle

          return (
            <div key={item.habitId} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-sage-500 shadow-sm border border-gray-100 dark:border-gray-600">
                    <IconComp size={16} />
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.text}</span>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${impactColor}`}>
                  <ImpactIcon size={14} />
                  {impact > 0 ? '+' : ''}{impact.toFixed(1)}
                </div>
              </div>

              <div className="space-y-2">
                {/* Con hábito */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Con este hábito <span className="text-gray-400">({item.countWith} días)</span></span>
                    <span className="font-bold" style={{ color: item.avgWith ? MOOD_ICONS[Math.round(item.avgWith)]?.color : '#9ca3af' }}>
                      {item.avgWith ?? '—'}/10
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${withPct}%`, backgroundColor: item.avgWith ? MOOD_ICONS[Math.round(item.avgWith)]?.color : '#d1d5db' }}
                    />
                  </div>
                </div>

                {/* Sin hábito */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Sin este hábito <span className="text-gray-400">({item.countWithout} días)</span></span>
                    <span className="font-bold text-gray-500">
                      {item.avgWithout ?? '—'}/10
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full transition-all duration-500"
                      style={{ width: `${withoutPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {Math.abs(impact) > 0.5 && (
                <p className={`text-xs mt-2 font-medium ${impactColor}`}>
                  {positive
                    ? `📈 Los días que cumplís este hábito tu ánimo es ${impact.toFixed(1)} puntos más alto en promedio.`
                    : `📉 Los días que cumplís este hábito tu ánimo tiende a ser ${Math.abs(impact).toFixed(1)} puntos más bajo.`}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-400 mt-3 text-center space-y-1">
        <p>* Se muestran hábitos con al menos 3 días de cumplimiento registrado.</p>
        <p>** Aclaración: Los datos mostrados arriba no necesariamente demuestran un patrón de comportamiento o causalidad clínica.</p>
      </div>
    </div>
  )
}

// ── Página de historial ───────────────────────────────────
export default function HistoryPage() {
  usePageTitle('Historial')
  const initialCache = getPatientCache()
  const [entries, setEntries] = useState(initialCache.entries || [])
  const [habits, setHabits] = useState(initialCache.habits || [])
  const [correlation, setCorrelation] = useState(initialCache.correlation || [])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [tab, setTab] = useState('entries') // 'entries' | 'correlation' | 'chart'

  useEffect(() => {
    if (initialCache.entries && initialCache.habits && initialCache.correlation) {
      setLoading(false)
      return
    }
    Promise.all([
      api.get('/journal'),
      api.get('/habits'),
      api.get('/habits/correlation'),
    ]).then(([jRes, hRes, cRes]) => {
      setEntries(jRes.data.entries)
      setHabits(hRes.data.habits)
      setCorrelation(cRes.data)
      updatePatientCache('entries', jRes.data.entries)
      updatePatientCache('habits', hRes.data.habits)
      updatePatientCache('correlation', cRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    setDeleting(id)
    try {
      await api.delete(`/journal/${id}`)
      setEntries((prev) => {
        const nextEntries = prev.filter((e) => e.id !== id)
        updatePatientCache('entries', nextEntries)
        return nextEntries
      })
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar.')
    } finally {
      setDeleting(null)
    }
  }

  const handleDayClick = (date) => {
    setSelectedDay(prev => prev?.toDateString() === date.toDateString() ? null : date)
  }

  let filtered = entries
  if (selectedDay) {
    filtered = filtered.filter(e => new Date(e.createdAt).toDateString() === selectedDay.toDateString())
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-20 bg-gray-100 dark:bg-gray-800" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Historial</h1>
        <p className="text-sm text-gray-400">{entries.length} entradas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-4">
        <button
          onClick={() => setTab('entries')}
          className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tab === 'entries'
              ? 'bg-white dark:bg-gray-700 text-sage-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Book size={14} /> Entradas
        </button>
        <button
          onClick={() => setTab('chart')}
          className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tab === 'chart'
              ? 'bg-white dark:bg-gray-700 text-sage-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <TrendingUp size={14} /> Evolución
        </button>
        <button
          onClick={() => setTab('correlation')}
          className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            tab === 'correlation'
              ? 'bg-white dark:bg-gray-700 text-sage-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <BarChart2 size={14} /> Hábitos
        </button>
      </div>

      {/* TAB: Correlación */}
      {tab === 'correlation' && (
        correlation.length > 0
          ? <HabitCorrelationCard data={correlation} />
          : (
            <div className="text-center py-12 text-gray-400">
              <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Sin datos suficientes aún</p>
              <p className="text-sm mt-1">Necesitás al menos 5 entradas con hábitos para ver correlaciones.</p>
            </div>
          )
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
              <p className="text-xs text-sage-600 dark:text-sage-400 font-semibold flex items-center gap-1">
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
          {/* Calendario de ánimo (Solo en tab entries) */}
          {tab === 'entries' && entries.length > 0 && (
            <div>
              <MoodCalendar
                entries={entries}
                onDayClick={handleDayClick}
                selectedDate={selectedDay}
                mode="patient"
              />
              {selectedDay && (
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-sage-600 dark:text-sage-400 font-semibold flex items-center gap-1">
                    <Calendar size={14} /> {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <button onClick={() => setSelectedDay(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                    Ver todo
                  </button>
                </div>
              )}
            </div>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-16">
              <Book size={48} className="mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-bold text-gray-700 dark:text-white mb-2">Historial vacío</h2>
              <p className="text-gray-400">Tus anotaciones aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {selectedDay ? 'Sin anotaciones ese día.' : 'Sin entradas.'}
                </div>
              )}
              {filtered.map((entry) => {
                const canEdit = isEditable(entry.createdAt)
                const open = expanded === entry.id
                const config = MOOD_ICONS[entry.moodScore]
                const entryHabits = habits.filter(h => (entry.completedHabits || []).includes(h.id))

                return (
                  <div key={entry.id} className="card cursor-pointer hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3" onClick={() => setExpanded(open ? null : entry.id)}>
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
                        {/* Hábitos completados (resumen) */}
                        {!open && entryHabits.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {entryHabits.slice(0, 3).map(h => {
                              const IconComp = HABIT_ICONS[h.icon] || HABIT_ICONS.CheckCircle
                              return <span key={h.id} className="p-1 bg-gray-100 dark:bg-gray-800 rounded-md text-sage-500"><IconComp size={12} /></span>
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
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                            disabled={deleting === entry.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
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
                          // Hábitos toggle completados
                          const toggleDone = habits.filter(h =>
                            (!h.trackingType || h.trackingType === 'toggle') &&
                            (entry.completedHabits || []).includes(h.id)
                          )
                          // Hábitos toggle+qty: completados via habitData.done
                          const qtyToggleDone = habits.filter(h =>
                            h.trackingType === 'toggle+qty' &&
                            entry.habitData?.[h.id]?.done === true
                          )
                          // Hábitos qty: siempre se muestran si tienen valor
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
                                      <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
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
                                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
                                        <IconComp size={14} /> {h.text}
                                        {hd.qty !== undefined && hd.qty !== '' && (
                                          <span className="font-bold text-sage-600 dark:text-sage-400 ml-0.5">{hd.qty} {h.unit}</span>
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
                                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300 font-medium">
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
                        {!canEdit && (
                          <p className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} /> Solo editable en las primeras 24h
                          </p>
                        )}
                      </div>
                    )}
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
