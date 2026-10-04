import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import api from '../../lib/api'
import { MOOD_ICONS, formatDateShort } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import MoodChart from '../../components/MoodChart'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Plus,
  Target, CheckCircle2, Circle, Trash2,
  ChevronDown, ChevronUp, Pencil, Calendar,
  BookOpen, User, FileText,
  Activity, BarChart2, MessageSquare, Eye, EyeOff,
  LayoutGrid, RotateCcw, GripHorizontal,
} from 'lucide-react'
import HabitCorrelationCard from '../../components/HabitCorrelation'
import { usePageTitle } from '../../hooks/usePageTitle'
import AvatarDisplay from '../../components/AvatarDisplay'
import ConfirmActionModal from '../../components/ConfirmActionModal'

const RGL = WidthProvider(Responsive)

// ── Layout defaults ────────────────────────────────────────
const PANELS = [
  { i: 'pre',      label: 'Ficha Pre-Sesión',       icon: BarChart2  },
  { i: 'chart',    label: 'Evolución del Ánimo',    icon: Activity   },
  { i: 'entries',  label: 'Historial del Paciente', icon: BookOpen   },
  { i: 'goals',    label: 'Objetivos',              icon: Target     },
  { i: 'notes',    label: 'Notas de Sesión',        icon: FileText   },
  { i: 'habits',   label: 'Análisis de Hábitos',    icon: Activity   },
]

const DEFAULT_LG = [
  // Fila 1: Resumen rápido y gráfico principal
  { i: 'pre',     x: 0, y: 0,  w: 4,  h: 8,  minW: 3, minH: 4 },
  { i: 'chart',   x: 4, y: 0,  w: 8,  h: 8,  minW: 5, minH: 5 },
  
  // Fila 2: Entradas del paciente y correlación de hábitos
  { i: 'entries', x: 0, y: 8,  w: 5,  h: 14, minW: 2, minH: 6 },
  { i: 'habits',  x: 5, y: 8,  w: 7,  h: 14, minW: 4, minH: 6 },
  
  // Fila 3: Objetivos y Notas clínicas
  { i: 'goals',   x: 0, y: 22, w: 6,  h: 8,  minW: 3, minH: 4 },
  { i: 'notes',   x: 6, y: 22, w: 6,  h: 8,  minW: 3, minH: 4 },
]

const lsLayout  = () => `psych_layout_global_v1`
const lsVisible = () => `psych_vis_global_v1`

const readLayout = () => {
  try { const s = JSON.parse(localStorage.getItem(lsLayout())); return Array.isArray(s) && s.length ? s : DEFAULT_LG.map(l => ({...l})) }
  catch { return DEFAULT_LG.map(l => ({...l})) }
}
const readVisible = () => {
  try { const s = JSON.parse(localStorage.getItem(lsVisible())); return Array.isArray(s) ? s : PANELS.map(p => p.i) }
  catch { return PANELS.map(p => p.i) }
}

// ── PanelWrapper ───────────────────────────────────────────
function PanelWrapper({ title, icon: Icon, onHide, scrollable = false, children }) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group">
      {/* Drag handle */}
      <div className="psych-panel-handle select-none cursor-grab active:cursor-grabbing flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/80">
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400 group-hover:text-indigo-400 transition-colors shrink-0" />
          {Icon && <Icon size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />}
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{title}</span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onHide}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-md shrink-0"
          title="Ocultar panel"
        >
          <EyeOff size={12} />
        </button>
      </div>
      {/* Scrollable body */}
      <div className={`flex-1 min-h-0 p-4 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden flex flex-col'}`} style={{ scrollbarWidth: 'thin' }}>
        {children}
      </div>
    </div>
  )
}

// ── PreSessionCard ─────────────────────────────────────────
function PreSessionCard({ insights, patient }) {
  if (!insights) return <div className="animate-pulse space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}</div>
  const { avgThisWeek, trend, streakDays, totalEntries } = insights
  const trendNum  = trend ? parseFloat(trend) : 0
  const TrendIcon = trendNum > 0 ? TrendingUp : trendNum < 0 ? TrendingDown : Minus
  const trendCls  = trendNum > 0 ? 'text-emerald-600 dark:text-emerald-400' : trendNum < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'

  const stats = [
    {
      label: 'Promedio esta semana',
      main: avgThisWeek ?? '—',
      sub: avgThisWeek ? <MoodIcon score={Math.round(parseFloat(avgThisWeek))} size={14} /> : null,
    },
    {
      label: 'Tendencia',
      main: trend ? `${trendNum > 0 ? '+' : ''}${trend}` : '—',
      icon: trend ? <TrendIcon size={18} className={trendCls} /> : null,
      cls: trendCls,
    },
    {
      label: 'Racha actual',
      main: streakDays ?? 0,
      sub: <span className="text-xs text-gray-400">{streakDays === 1 ? 'día' : 'días'} seguidos</span>,
    },
    {
      label: 'Total registros',
      main: totalEntries ?? patient?.totalEntries ?? '—',
      sub: <span className="text-xs text-gray-400">entradas</span>,
    },
  ]

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
            <div className={`flex items-center justify-center gap-1 ${s.cls ?? ''}`}>
              {s.icon}
              <p className="text-xl font-black text-gray-900 dark:text-white">{s.main}</p>
            </div>
            {s.sub && <div className="mt-0.5 flex justify-center">{s.sub}</div>}
          </div>
        ))}
      </div>

    </div>
  )
}

// ── SessionNotes ───────────────────────────────────────────
function SessionNotes({ patientId }) {
  const [notes, setNotes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing]   = useState(null)
  const [editTitle, setEditTitle]     = useState('')
  const [editContent, setEditContent] = useState('')
  const [newTitle, setNewTitle]       = useState('')
  const [newContent, setNewContent]   = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null)

  useEffect(() => {
    api.get(`/session-notes/${patientId}`)
      .then(({ data }) => setNotes(data.notes ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [patientId])

  const create = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post(`/session-notes/${patientId}`, {
        title: newTitle || `Sesión ${new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' })}`,
        content: newContent,
        sessionDate: new Date().toISOString(),
      })
      setNotes(p => [data.note, ...p])
      setNewTitle(''); setNewContent(''); setCreating(false)
    } catch { alert('Error al crear nota.') }
    finally { setSaving(false) }
  }

  const update = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/session-notes/note/${id}`, { title: editTitle, content: editContent })
      setNotes(p => p.map(n => n.id === id ? data.note : n))
      setEditing(null)
    } catch { alert('Error al actualizar.') }
    finally { setSaving(false) }
  }

  const confirmDel = async () => {
    if (!confirmDeleteNote) return
    try {
      await api.delete(`/session-notes/note/${confirmDeleteNote}`)
      setNotes(p => p.filter(n => n.id !== confirmDeleteNote))
      setConfirmDeleteNote(null)
    } catch {
      alert('Error.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">{notes.length}</span>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setCreating(v => !v)} className="flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          <Plus size={14} /> Nueva nota
        </button>
      </div>

      {creating && (
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-3 space-y-2">
          <input className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
            placeholder="Contenido de la sesión..." value={newContent} onChange={e => setNewContent(e.target.value)} autoFocus />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button onClick={create} disabled={saving || !newContent.trim()} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-50">
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="animate-pulse space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}</div>}
      {!loading && notes.length === 0 && !creating && (
        <div className="text-center py-8"><FileText size={24} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Sin notas de sesión</p></div>
      )}

      <ConfirmActionModal
        isOpen={!!confirmDeleteNote}
        onClose={() => setConfirmDeleteNote(null)}
        onConfirm={confirmDel}
        title="¿Eliminar nota?"
        description="Esta nota se borrará del historial del paciente."
        confirmLabel="Eliminar"
      />

      <div className="space-y-2">
        {notes.map(note => {
          const open = expanded === note.id
          const ed   = editing  === note.id
          return (
            <div key={note.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/40 cursor-pointer"
                onClick={() => !ed && setExpanded(open ? null : note.id)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{note.title || 'Sin título'}</p>
                  <p className="text-xs text-gray-400">{new Date(note.sessionDate).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setEditing(note.id); setEditTitle(note.title); setEditContent(note.content); setExpanded(note.id) }}
                    className="p-1.5 text-gray-400 hover:text-indigo-500 rounded"><Pencil size={14} /></button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConfirmDeleteNote(note.id) }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                  {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </div>
              {open && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  {ed ? (
                    <div className="space-y-3">
                      <input className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                      <textarea className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32"
                        value={editContent} onChange={e => setEditContent(e.target.value)} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500">Cancelar</button>
                        <button onClick={() => update(note.id)} disabled={saving} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold">Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TherapyGoals ───────────────────────────────────────────
function TherapyGoals({ patientId }) {
  const [goals, setGoals] = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [adding, setAdding]   = useState(false)

  useEffect(() => {
    api.get(`/goals/${patientId}`).then(({ data }) => setGoals(data.goals ?? [])).catch(console.error)
  }, [patientId])

  const add    = async () => {
    if (!newGoal.trim()) return
    const { data } = await api.post(`/goals/${patientId}`, { text: newGoal }).catch(() => ({ data: null }))
    if (data?.goal) { setGoals(p => [...p, data.goal]); setNewGoal(''); setAdding(false) }
  }
  const toggle = async (id) => {
    const { data } = await api.patch(`/goals/${id}/toggle`).catch(() => ({ data: null }))
    if (data?.goal) setGoals(p => p.map(g => g.id === id ? data.goal : g))
  }
  const del = async (id) => {
    await api.delete(`/goals/${id}`).catch(() => {})
    setGoals(p => p.filter(g => g.id !== id))
  }

  const done = goals.filter(g => g.completed).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {goals.length > 0
          ? <span className="text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">{done}/{goals.length}</span>
          : <span />}
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setAdding(v => !v)} className="flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          <Plus size={14} /> Añadir
        </button>
      </div>

      {adding && (
        <div className="flex gap-2">
          <input className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Nuevo objetivo..." value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} autoFocus />
          <button onMouseDown={e => e.stopPropagation()} onClick={add} className="text-sm px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Ok</button>
        </div>
      )}

      {goals.length === 0 && !adding && (
        <div className="text-center py-8"><Target size={24} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Sin objetivos</p></div>
      )}

      {goals.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Progreso</span><span>{done}/{goals.length}</span></div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${(done / goals.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {goals.map(g => (
          <div key={g.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all ${
            g.completed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
          }`}>
            <button onMouseDown={e => e.stopPropagation()} onClick={() => toggle(g.id)} className="shrink-0 mt-0.5">
              {g.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-gray-300" />}
            </button>
            <span className={`text-sm flex-1 leading-relaxed ${g.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{g.text}</span>
            <button onMouseDown={e => e.stopPropagation()} onClick={() => del(g.id)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PatientEntries ─────────────────────────────────────────
function PatientEntries({ entries, habitsList, selectedEntryId, onClearSelectedEntry }) {
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter]     = useState('all')

  const filtered = useMemo(() => entries.filter(e => {
    if (selectedEntryId) return e.id === selectedEntryId
    if (filter === 'low')  return e.moodScore <= 3
    if (filter === 'high') return e.moodScore >= 7
    return true
  }), [entries, filter, selectedEntryId])

  if (entries.length === 0) return (
    <div className="text-center py-10">
      <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-400">Sin entradas registradas</p>
      <p className="text-xs text-gray-400 mt-1">El paciente aún no ha hecho registros.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {selectedEntryId ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Entrada seleccionada en el gráfico</p>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClearSelectedEntry}
            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            Ver todas las entradas
          </button>
        </div>
      ) : (
        <div className="flex gap-1 flex-wrap">
          {[
            { id: 'all',  label: `Todas (${entries.length})` },
            { id: 'low',  label: '😟 Bajo' },
            { id: 'high', label: '😊 Alto' },
          ].map(({ id, label }) => (
            <button key={id} onMouseDown={e => e.stopPropagation()} onClick={() => setFilter(id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${filter === id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Sin entradas para este filtro.</p>}
        {filtered.map(entry => {
          const cfg  = MOOD_ICONS[entry.moodScore]
          const open = selectedEntryId ? true : expanded === entry.id
          return (
            <div key={entry.id} className={`rounded-xl border cursor-pointer transition-all ${open ? 'border-indigo-200 dark:border-indigo-700' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}>
              <div className="flex items-center gap-3 p-3" onClick={() => setExpanded(open ? null : entry.id)}>
                <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ backgroundColor: cfg?.bg }}>
                  <MoodIcon score={entry.moodScore} size={16} />
                  <span className="text-[10px] font-black" style={{ color: cfg?.color }}>{entry.moodScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color: cfg?.color }}>{cfg?.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDateShort(entry.createdAt)}</p>
                </div>
                {entry.content && <MessageSquare size={14} className="text-gray-300 shrink-0" />}
                {open ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
              </div>
              {open && (
                <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                  {entry.content
                    ? <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    : <p className="text-sm text-gray-400 italic">Sin nota escrita.</p>}
                  {(entry.completedHabits?.length > 0 || Object.keys(entry.habitData || {}).length > 0) && (
                    <div className="mt-3 flex flex-col gap-1">
                      <span className="text-xs text-gray-400 font-medium">Hábitos registrados:</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {habitsList?.filter(h => entry.completedHabits?.includes(h.id) || entry.habitData?.[h.id]?.done || entry.habitData?.[h.id]?.qty !== undefined).map(h => {
                          const hData = entry.habitData?.[h.id] || {}
                          const qtyText = hData.qty !== undefined ? `: ${hData.qty} ${h.unit || ''}` : ''
                          const noteText = hData.note ? ` (${hData.note})` : ''
                          return (
                            <span key={h.id} className="text-[11px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md font-medium border border-emerald-100 dark:border-emerald-800/30">
                              ✓ {h.text}{qtyText}{noteText}
                            </span>
                          )
                        })}
                        {/* Keep unknown historical IDs neutral; missing from this list does not prove deletion. */}
                        {entry.completedHabits?.filter(hId => !habitsList?.find(x => x.id === hId)).map(hId => (
                          <span key={hId} className="text-[11px] bg-gray-50 text-gray-500 px-2 py-1 rounded-md font-medium">
                            ✓ Hábito sin información disponible
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PatientDetail (main) ───────────────────────────────────
export default function PatientDetail() {
  const { id } = useParams()
  const [patient,  setPatient]  = useState(null)
  const [entries,  setEntries]  = useState([])
  const [insights, setInsights] = useState(null)
  const [habitsCorr, setHabitsCorr] = useState([])
  const [habitsList, setHabitsList] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  usePageTitle(patient ? patient.name : 'Paciente')

  // Grid state
  const [layout,  setLayout]  = useState(() => readLayout())
  const [visible, setVisible] = useState(() => readVisible())
  const [panelMenu, setPanelMenu] = useState(false)

  const togglePanel = (panelId) => {
    setVisible(prev => {
      const next = prev.includes(panelId) ? prev.filter(p => p !== panelId) : [...prev, panelId]
      localStorage.setItem(lsVisible(), JSON.stringify(next))
      return next
    })
  }

  const handleLayoutChange = (currentLayout, allLayouts) => {
    // Only persist the layout if we have the lg layout available.
    // This prevents narrow breakpoint clamps from permanently corrupting the desktop layout.
    if (!allLayouts || !allLayouts.lg) return;

    setLayout(prev => {
      const merged = prev.map(item => {
        const upd = allLayouts.lg.find(n => n.i === item.i)
        return upd ? { ...item, ...upd } : item
      })
      // Prevent infinite render loop by checking if state actually changed
      if (JSON.stringify(prev) === JSON.stringify(merged)) {
        return prev;
      }
      localStorage.setItem(lsLayout(), JSON.stringify(merged))
      return merged
    })
  }

  const resetAll = () => {
    const fresh = DEFAULT_LG.map(l => ({ ...l }))
    const allPanels = PANELS.map(p => p.i)
    setLayout(fresh)
    setVisible(allPanels)
    localStorage.setItem(lsLayout(),  JSON.stringify(fresh))
    localStorage.setItem(lsVisible(), JSON.stringify(allPanels))
  }

  const activeLayout = useMemo(
    () => layout.filter(item => visible.includes(item.i)),
    [layout, visible]
  )

  const responsiveLg = useMemo(() => activeLayout, [activeLayout])
  const responsiveMd = useMemo(() => activeLayout.map(i => ({ ...i, w: Math.min(i.w, 8),  x: Math.min(i.x, 8  - Math.min(i.w, 8))  })), [activeLayout])
  const responsiveSm = useMemo(() => activeLayout.map(i => ({ ...i, w: 1, x: 0 })), [activeLayout])

  useEffect(() => {
    setSelectedEntryId(null)
    const load = async () => {
      try {
        const [pRes, jRes, iRes, hRes, lRes] = await Promise.allSettled([
          api.get('/patients'),
          api.get(`/journal?patientId=${id}`),
          api.get(`/patients/${id}/insights`),
          api.get(`/habits/correlation?patientId=${id}`),
          api.get(`/habits?patientId=${id}`),
        ])
        if (pRes.status === 'fulfilled') {
          setPatient(pRes.value.data.patients?.find(p => p.id === id) ?? null)
        }
        if (jRes.status === 'fulfilled') setEntries(jRes.value.data.entries ?? [])
        if (iRes.status === 'fulfilled') setInsights(iRes.value.data)
        if (hRes.status === 'fulfilled') setHabitsCorr(hRes.value.data)
        if (lRes.status === 'fulfilled') setHabitsList(lRes.value.data.habits ?? [])
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!loading) {
      // Disparamos un resize después de que la carga finalice y las animaciones empiecen,
      // para forzar a react-grid-layout a recalcular el ancho correcto de los paneles.
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 150)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  )

  if (!patient) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <User size={28} className="text-gray-400" />
      </div>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">Paciente no encontrado</p>
      <Link to="/psych/patients" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">← Volver a la lista</Link>
    </div>
  )

  const lastEntry = entries[0]?.createdAt
  const avgMood   = entries.length
    ? (entries.slice(0, 7).reduce((s, e) => s + e.moodScore, 0) / Math.min(entries.length, 7)).toFixed(1)
    : null

  return (
    <div className="animate-fade-in pb-16">
      {/* ── Patient card (sticky) ─────────────────── */}
      <div className="sticky top-[60px] lg:top-0 z-30 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 shadow-sm">
          <Link to="/psych/patients" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
            <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden font-black text-base shrink-0 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
            {patient.avatarUrl ? (
              <AvatarDisplay avatar={patient.avatarUrl} size={28} className="text-current" />
            ) : (
              patient.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{patient.name}</h1>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1"><Activity size={11} /> {patient.totalEntries} entradas</span>
              {lastEntry && <span className="flex items-center gap-1"><Calendar size={11} /> Último: {formatDateShort(lastEntry)}</span>}
              {patient.lastMood && (
                <span className="flex items-center gap-1">
                  Ánimo: <MoodIcon score={patient.lastMood} size={13} />
                  <span style={{ color: MOOD_ICONS[patient.lastMood]?.color }}>{MOOD_ICONS[patient.lastMood]?.label}</span>
                </span>
              )}
              {avgMood && <span className="flex items-center gap-1"><TrendingUp size={11} /> Prom. 7d: <strong>{avgMood}</strong></span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setPanelMenu(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-indigo-300 transition-all"
          >
            <LayoutGrid size={14} /> Paneles ({visible.length}/{PANELS.length})
          </button>

          {panelMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPanelMenu(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-2 animate-scale-in">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-1">Visibilidad</p>
                {PANELS.map(panel => {
                  const on = visible.includes(panel.i)
                  return (
                    <button key={panel.i} onClick={() => togglePanel(panel.i)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors ${on ? 'text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <span className="flex items-center gap-2"><panel.icon size={12} /> {panel.label}</span>
                      {on ? <Eye size={12} /> : <EyeOff size={12} className="text-gray-300" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <button
          onClick={resetAll}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 transition-all"
        >
          <RotateCcw size={13} /> Restablecer
        </button>

        <p className="ml-auto text-xs font-medium text-gray-400 hidden sm:block">
          Arrastrá por el título · Redimensioná desde las esquinas
        </p>
      </div>

      {/* ── Grid ───────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <LayoutGrid size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 dark:text-gray-400 mb-3">Todos los paneles están ocultos</p>
          <button onClick={resetAll} className="text-sm px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold">Restablecer</button>
        </div>
      ) : (
        <RGL
          className="psych-dashboard-grid w-full"
          layouts={{ lg: responsiveLg, md: responsiveMd, sm: responsiveSm }}
          rowHeight={40}
          margin={[14, 14]}
          containerPadding={[0, 0]}
          isDraggable
          isResizable
          draggableHandle=".psych-panel-handle"
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 1 }}
          compactType="vertical"
          useCSSTransforms={true}
          resizeHandles={['se', 'sw']}
          onLayoutChange={(currentLayout, allLayouts) => handleLayoutChange(currentLayout, allLayouts)}
        >
          {visible.includes('pre') && (
            <div key="pre">
              <PanelWrapper title="Ficha Pre-Sesión" icon={BarChart2} onHide={() => togglePanel('pre')}>
                <PreSessionCard insights={insights} patient={patient} />
              </PanelWrapper>
            </div>
          )}
          {visible.includes('chart') && (
            <div key="chart">
              <PanelWrapper title="Evolución del Ánimo" icon={Activity} onHide={() => togglePanel('chart')}>
                <MoodChart
                  entries={entries}
                  mode="psych"
                  height="100%"
                  defaultDays={14}
                  onDayClick={(_, entryId) => {
                    if (entryId == null) return
                    setSelectedEntryId(entryId)
                    if (!visible.includes('entries')) togglePanel('entries')
                  }}
                />
              </PanelWrapper>
            </div>
          )}
          {visible.includes('entries') && (
            <div key="entries">
              <PanelWrapper title="Historial del Paciente" icon={BookOpen} onHide={() => togglePanel('entries')} scrollable={true}>
                <PatientEntries
                  entries={entries}
                  habitsList={habitsList}
                  selectedEntryId={selectedEntryId}
                  onClearSelectedEntry={() => setSelectedEntryId(null)}
                />
              </PanelWrapper>
            </div>
          )}
          {visible.includes('habits') && (
            <div key="habits">
              <PanelWrapper title="Hábitos del Paciente" icon={Activity} onHide={() => togglePanel('habits')} scrollable={true}>
                <div className="space-y-6 animate-fade-in pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                      Hábitos configurados
                    </h3>
                    {habitsList.length === 0 ? (
                      <p className="text-sm text-gray-400 px-1">El paciente no tiene hábitos configurados actualmente.</p>
                    ) : (
                      <div className="grid gap-2">
                        {habitsList.map(h => {
                          const habitEntries = entries.filter(e => e.completedHabits?.includes(h.id) || (e.habitData && e.habitData[h.id] !== undefined))
                          const totalTimes = habitEntries.length
                          
                          let totalQty = null
                          if (h.trackingType === 'qty' || h.trackingType === 'toggle+qty') {
                            totalQty = habitEntries.reduce((sum, e) => sum + (e.habitData?.[h.id]?.qty || 0), 0)
                          }

                          return (
                            <div key={h.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 flex items-center justify-between border border-gray-100 dark:border-gray-700">
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{h.text}</p>
                                <p className="text-xs text-gray-500 font-medium capitalize">{h.trackingType === 'toggle' ? 'Sí/No' : h.trackingType === 'qty' ? 'Cantidad' : 'Sí/No + Cantidad'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Registrado</p>
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                  {totalTimes} {totalTimes === 1 ? 'día' : 'días'}
                                </p>
                                {totalQty !== null && totalQty > 0 && (
                                  <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                                    Suma cant: {totalQty} {h.unit ? h.unit : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                      Análisis de Correlación
                    </h3>
                    <HabitCorrelationCard data={habitsCorr} />
                  </div>
                </div>
              </PanelWrapper>
            </div>
          )}
          {visible.includes('goals') && (
            <div key="goals">
              <PanelWrapper title="Objetivos Terapéuticos" icon={Target} onHide={() => togglePanel('goals')}>
                <TherapyGoals patientId={id} />
              </PanelWrapper>
            </div>
          )}
          {visible.includes('notes') && (
            <div key="notes">
              <PanelWrapper title="Notas de Sesión" icon={FileText} onHide={() => togglePanel('notes')}>
                <SessionNotes patientId={id} />
              </PanelWrapper>
            </div>
          )}
        </RGL>
      )}
    </div>
  )
}
