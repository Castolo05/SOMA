import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  createGoal,
  createSessionNote,
  deleteGoal,
  deleteSessionNote,
  getArchivedPatients,
  getGoals,
  getPatientDetail,
  getSessionNotes,
  setGoalVisibility,
  toggleGoal,
  unlinkPatient,
  updateSessionNote,
} from '../../lib/api'
import { MOOD_ICONS, entryDateKey, entryDateToDate, formatDateShort } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import MoodChart from '../../components/MoodChart'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Plus,
  Target, CheckCircle2, Circle, Trash2,
  ChevronDown, ChevronUp, Pencil, Calendar,
  BookOpen, User, FileText,
  Activity, BarChart2, MessageSquare, Eye, EyeOff,
  LayoutGrid, RotateCcw, GripHorizontal, UserMinus, Archive,
} from 'lucide-react'
import HabitCorrelationCard from '../../components/HabitCorrelation'
import { usePageTitle } from '../../hooks/usePageTitle'
import AvatarDisplay from '../../components/AvatarDisplay'
import ConfirmActionModal from '../../components/ConfirmActionModal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const RGL = WidthProvider(Responsive)

// ── Layout defaults ────────────────────────────────────────
const PANELS = [
  { i: 'pre',      label: 'Ficha Pre-Sesión',       icon: BarChart2  },
  { i: 'chart',    label: 'Evolución del Ánimo',    icon: Activity   },
  { i: 'entries',  label: 'Historial del Paciente', icon: BookOpen   },
  { i: 'goals',    label: 'Objetivos Terapéuticos', icon: Target     },
  { i: 'notes',    label: 'Notas de Sesión',        icon: FileText   },
  { i: 'habits',   label: 'Hábitos del Paciente',   icon: Activity   },
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

// Una disposición por profesional: varios pueden compartir el mismo equipo.
// Si no hay una propia, se toma la global anterior para no perder la existente.
const lsLayout  = (userId) => `psych_layout_${userId}_v1`
const lsVisible = (userId) => `psych_vis_${userId}_v1`
const LEGACY_LAYOUT  = 'psych_layout_global_v1'
const LEGACY_VISIBLE = 'psych_vis_global_v1'

const readStored = (key, legacyKey) => {
  try { return JSON.parse(localStorage.getItem(key) ?? localStorage.getItem(legacyKey)) }
  catch { return null }
}
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* almacenamiento no disponible */ }
}
const readLayout = (userId) => {
  const s = readStored(lsLayout(userId), LEGACY_LAYOUT)
  return Array.isArray(s) && s.length ? s : DEFAULT_LG.map(l => ({...l}))
}
const readVisible = (userId) => {
  const s = readStored(lsVisible(userId), LEGACY_VISIBLE)
  return Array.isArray(s) ? s : PANELS.map(p => p.i)
}

// ── PanelWrapper ───────────────────────────────────────────
function PanelWrapper({ title, icon: Icon, onHide, scrollable = false, children }) {
  // Sin onHide el panel es fijo (vista de archivado): sin arrastre ni ocultar.
  const movable = !!onHide
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group">
      {/* Drag handle */}
      <div className={`${movable ? 'psych-panel-handle select-none cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700/80' : ''} flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0 transition-colors`}>
        <div className="flex items-center gap-2">
          {movable && <GripHorizontal size={14} className="text-gray-400 group-hover:text-pro-400 transition-colors shrink-0" />}
          {Icon && <Icon size={14} className="text-pro-500 dark:text-pro-400 shrink-0" />}
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{title}</span>
        </div>
        {movable && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onHide}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-md shrink-0"
            title="Ocultar panel"
            aria-label={`Ocultar panel ${title}`}
          >
            <EyeOff size={12} />
          </button>
        )}
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
      label: 'Promedio últimos 7 días',
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
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.main}</p>
            </div>
            {s.sub && <div className="mt-0.5 flex justify-center">{s.sub}</div>}
          </div>
        ))}
      </div>

    </div>
  )
}

// ── SessionNotes ───────────────────────────────────────────
// La sesión se guarda al mediodía local del día elegido, como las entradas del diario.
const sessionDateToISO = (dayKey) => entryDateToDate(dayKey).toISOString()
const sortBySessionDate = (notes) => [...notes].sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))

function SessionNotes({ patientId, readOnly = false }) {
  const { showError } = useToast()
  const [notes, setNotes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing]   = useState(null)
  const [editTitle, setEditTitle]     = useState('')
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate]       = useState('')
  const [newTitle, setNewTitle]       = useState('')
  const [newContent, setNewContent]   = useState('')
  const [newDate, setNewDate]         = useState(() => entryDateKey())
  const [saving, setSaving] = useState(false)
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null)

  useEffect(() => {
    getSessionNotes(patientId)
      .then(({ data }) => setNotes(data.notes ?? []))
      .catch(() => showError('No se pudieron cargar las notas de sesión.'))
      .finally(() => setLoading(false))
  }, [patientId, showError])

  const create = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    try {
      const { data } = await createSessionNote(patientId, {
        title: newTitle.trim() || `Sesión ${entryDateToDate(newDate).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' })}`,
        content: newContent,
        sessionDate: sessionDateToISO(newDate),
      })
      setNotes(p => sortBySessionDate([data.note, ...p]))
      setNewTitle(''); setNewContent(''); setNewDate(entryDateKey()); setCreating(false)
    } catch { showError('Error al crear nota.') }
    finally { setSaving(false) }
  }

  const update = async (id) => {
    if (!editContent.trim() || !editDate) return
    setSaving(true)
    try {
      const { data } = await updateSessionNote(id, { title: editTitle, content: editContent, sessionDate: sessionDateToISO(editDate) })
      setNotes(p => sortBySessionDate(p.map(n => n.id === id ? data.note : n)))
      setEditing(null)
    } catch { showError('Error al actualizar.') }
    finally { setSaving(false) }
  }

  const confirmDel = async () => {
    if (!confirmDeleteNote) return
    try {
      await deleteSessionNote(confirmDeleteNote)
      setNotes(p => p.filter(n => n.id !== confirmDeleteNote))
      setConfirmDeleteNote(null)
    } catch {
      showError('No se pudo eliminar la nota.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">{notes.length}</span>
        {!readOnly && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => setCreating(v => !v)} className="flex items-center gap-1 text-sm font-bold text-pro-600 dark:text-pro-400 hover:underline">
            <Plus size={14} /> Nueva nota
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-pro-50 dark:bg-pro-900/10 border border-pro-200 dark:border-pro-800/40 rounded-xl p-3 space-y-2">
          <div className="flex gap-2">
            <input className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pro-500 placeholder-gray-400"
              aria-label="Título de la nota" placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <input type="date" className="shrink-0 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pro-500"
              aria-label="Fecha de la sesión" max={entryDateKey()} value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <textarea className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pro-500 resize-none h-24"
            aria-label="Contenido de la nota" placeholder="Contenido de la sesión..." value={newContent} onChange={e => setNewContent(e.target.value)} autoFocus />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button onClick={create} disabled={saving || !newContent.trim() || !newDate} className="text-sm px-3 py-1.5 rounded-lg bg-pro-600 text-white font-semibold disabled:opacity-50">
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
                  {!readOnly && <>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setEditing(note.id); setEditTitle(note.title); setEditContent(note.content); setEditDate(entryDateKey(note.sessionDate)); setExpanded(note.id) }}
                    aria-label={`Editar nota ${note.title || 'sin título'}`} className="p-1.5 text-gray-400 hover:text-pro-500 rounded"><Pencil size={14} /></button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConfirmDeleteNote(note.id) }}
                    aria-label={`Eliminar nota ${note.title || 'sin título'}`} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                  </>}
                  {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </div>
              {open && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  {ed ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pro-500"
                          aria-label="Título de la nota" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        <input type="date" className="shrink-0 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pro-500"
                          aria-label="Fecha de la sesión" max={entryDateKey()} value={editDate} onChange={e => setEditDate(e.target.value)} />
                      </div>
                      <textarea className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pro-500 resize-none h-32"
                        aria-label="Contenido de la nota" value={editContent} onChange={e => setEditContent(e.target.value)} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500">Cancelar</button>
                        <button onClick={() => update(note.id)} disabled={saving || !editContent.trim() || !editDate} className="text-sm px-3 py-1.5 rounded-lg bg-pro-600 text-white font-semibold disabled:opacity-50">Guardar</button>
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
function TherapyGoals({ patientId, readOnly = false }) {
  const { showError } = useToast()
  const [goals, setGoals] = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [adding, setAdding]   = useState(false)
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState(null)

  useEffect(() => {
    getGoals(patientId)
      .then(({ data }) => setGoals(data.goals ?? []))
      .catch(() => showError('No se pudieron cargar los objetivos.'))
  }, [patientId, showError])

  const add    = async () => {
    if (!newGoal.trim()) return
    try {
      const { data } = await createGoal(patientId, { text: newGoal })
      setGoals(p => [...p, data.goal]); setNewGoal(''); setAdding(false)
    } catch { showError('No se pudo crear el objetivo.') }
  }
  const toggle = async (id) => {
    try {
      const { data } = await toggleGoal(id)
      setGoals(p => p.map(g => g.id === id ? data.goal : g))
    } catch { showError('No se pudo actualizar el objetivo.') }
  }
  const toggleVisibility = async (goal) => {
    try {
      const { data } = await setGoalVisibility(goal.id, !goal.visibleToPatient)
      setGoals(p => p.map(g => g.id === goal.id ? data.goal : g))
    } catch { showError('No se pudo cambiar la visibilidad del objetivo.') }
  }
  const del = async () => {
    const id = confirmDeleteGoal?.id
    setConfirmDeleteGoal(null)
    if (!id) return
    try {
      await deleteGoal(id)
      setGoals(p => p.filter(g => g.id !== id))
    } catch { showError('No se pudo eliminar el objetivo.') }
  }

  const done = goals.filter(g => g.completed).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {goals.length > 0
          ? <span className="text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">{done}/{goals.length}</span>
          : <span />}
        {!readOnly && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => setAdding(v => !v)} className="flex items-center gap-1 text-sm font-bold text-pro-600 dark:text-pro-400 hover:underline">
            <Plus size={14} /> Añadir
          </button>
        )}
      </div>
      {!readOnly && (
        <p className="text-xs text-gray-400">
          Los objetivos son privados. Usá el ojo para compartir uno con el paciente en su app.
        </p>
      )}

      {adding && (
        <div className="flex gap-2">
          <input className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pro-500"
            placeholder="Nuevo objetivo..." value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} autoFocus />
          <button onMouseDown={e => e.stopPropagation()} onClick={add} className="text-sm px-3 py-2 rounded-lg bg-pro-600 text-white font-semibold">Ok</button>
        </div>
      )}

      <ConfirmActionModal
        isOpen={!!confirmDeleteGoal}
        onClose={() => setConfirmDeleteGoal(null)}
        onConfirm={del}
        title="¿Eliminar objetivo?"
        description={confirmDeleteGoal ? `"${confirmDeleteGoal.text}" se quitará de los objetivos del paciente.` : ''}
        confirmLabel="Eliminar"
      />

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
            <button onMouseDown={e => e.stopPropagation()} onClick={() => toggle(g.id)} disabled={readOnly} aria-pressed={g.completed} aria-label={`Marcar "${g.text}" como ${g.completed ? 'pendiente' : 'cumplido'}`} className="shrink-0 mt-0.5 disabled:cursor-default">
              {g.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-gray-300" />}
            </button>
            <span className={`text-sm flex-1 leading-relaxed ${g.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{g.text}</span>
            {!readOnly && <>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => toggleVisibility(g)}
                aria-pressed={g.visibleToPatient}
                aria-label={g.visibleToPatient ? `Dejar de compartir "${g.text}" con el paciente` : `Compartir "${g.text}" con el paciente`}
                title={g.visibleToPatient ? 'Visible para el paciente' : 'Privado'}
                className={`shrink-0 transition-colors mt-0.5 ${g.visibleToPatient ? 'text-pro-500 hover:text-pro-700' : 'text-gray-300 hover:text-pro-500'}`}
              >
                {g.visibleToPatient ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onMouseDown={e => e.stopPropagation()} onClick={() => setConfirmDeleteGoal(g)} aria-label={`Eliminar objetivo "${g.text}"`} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"><Trash2 size={16} /></button>
            </>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PatientEntries ─────────────────────────────────────────
function PatientEntries({ entries, habitsList, selectedEntryId, onClearSelectedEntry }) {
  const [expanded, setExpanded] = useState(null)

  const filtered = useMemo(
    () => selectedEntryId ? entries.filter(e => e.id === selectedEntryId) : entries,
    [entries, selectedEntryId]
  )

  if (entries.length === 0) return (
    <div className="text-center py-10">
      <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-400">Sin entradas registradas</p>
      <p className="text-xs text-gray-400 mt-1">El paciente aún no ha hecho registros.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {selectedEntryId && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-pro-600 dark:text-pro-400">Entrada seleccionada en el gráfico</p>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClearSelectedEntry}
            className="text-xs font-semibold text-gray-500 hover:text-pro-600 dark:text-gray-400 dark:hover:text-pro-400"
          >
            Ver todas las entradas
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-4">No hay entradas para mostrar.</p>}
        {filtered.map(entry => {
          const cfg  = MOOD_ICONS[entry.moodScore]
          const open = selectedEntryId ? true : expanded === entry.id
          return (
            <div key={entry.id} className={`rounded-xl border cursor-pointer transition-all ${open ? 'border-pro-200 dark:border-pro-700' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}>
              <div
                className="flex items-center gap-3 p-3"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : entry.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(open ? null : entry.id) } }}
              >
                <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ backgroundColor: cfg?.bg }}>
                  <MoodIcon score={entry.moodScore} size={16} />
                  <span className="text-[10px] font-bold" style={{ color: cfg?.text }}>{entry.moodScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color: cfg?.text }}>{cfg?.label}</span>
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showError } = useToast()
  const userId = user?.id ?? 'anon'
  const [patient,  setPatient]  = useState(null)
  // Paciente desvinculado con notas u objetivos propios: se muestra en solo lectura.
  const [archived, setArchived] = useState(null)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [entries,  setEntries]  = useState([])
  const [insights, setInsights] = useState(null)
  const [habitsList, setHabitsList] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  usePageTitle(patient?.name ?? archived?.name ?? 'Paciente')

  // Grid state
  const [layout,  setLayout]  = useState(() => readLayout(userId))
  const [visible, setVisible] = useState(() => readVisible(userId))
  const [panelMenu, setPanelMenu] = useState(false)

  const togglePanel = (panelId) => {
    setVisible(prev => {
      const next = prev.includes(panelId) ? prev.filter(p => p !== panelId) : [...prev, panelId]
      writeStored(lsVisible(userId), next)
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
      writeStored(lsLayout(userId), merged)
      return merged
    })
  }

  const resetAll = () => {
    const fresh = DEFAULT_LG.map(l => ({ ...l }))
    const allPanels = PANELS.map(p => p.i)
    setLayout(fresh)
    setVisible(allPanels)
    writeStored(lsLayout(userId),  fresh)
    writeStored(lsVisible(userId), allPanels)
  }

  const activeLayout = useMemo(
    () => layout.filter(item => visible.includes(item.i)),
    [layout, visible]
  )

  const responsiveLg = useMemo(() => activeLayout, [activeLayout])
  const responsiveMd = useMemo(() => activeLayout.map(i => ({ ...i, w: Math.min(i.w, 8),  x: Math.min(i.x, 8  - Math.min(i.w, 8))  })), [activeLayout])
  const responsiveSm = useMemo(() => activeLayout.map(i => ({ ...i, w: 1, x: 0 })), [activeLayout])

  useEffect(() => {
    let active = true
    setSelectedEntryId(null)
    setLoading(true)
    setLoadError('')
    setArchived(null)
    getPatientDetail(id)
      .then(({ data }) => {
        if (!active) return
        setPatient(data.patient)
        setEntries(data.entries)
        setInsights(data.insights)
        setHabitsList(data.habits)
      })
      .catch(async err => {
        if (!active) return
        setPatient(null)
        // 404: sin vínculo aceptado. Puede ser un paciente archivado.
        if (err.response?.status !== 404) {
          setLoadError(err.response?.data?.error || err.message || 'No se pudo cargar el paciente.')
          return
        }
        try {
          const { data } = await getArchivedPatients()
          if (active) setArchived(data.patients.find(p => p.id === id) ?? null)
        } catch { /* sin archivados: queda "Paciente no encontrado" */ }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
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

  const handleUnlink = async () => {
    setConfirmUnlink(false)
    try {
      await unlinkPatient(id)
      navigate('/psych/patients')
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'No se pudo desvincular al paciente.')
    }
  }

  if (!patient && archived) return (
    <div className="animate-fade-in space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Link to="/psych/patients" aria-label="Volver a la lista de pacientes" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
          <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
        </Link>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden font-bold text-base shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500">
          {archived.avatarUrl ? <AvatarDisplay avatar={archived.avatarUrl} size={28} className="text-current" /> : archived.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{archived.name}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Archive size={11} /> Desvinculado, solo lectura</p>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Ya no tenés acceso al diario de este paciente. Conservás tus notas de sesión y objetivos.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <PanelWrapper title="Notas de Sesión" icon={FileText} scrollable>
          <SessionNotes patientId={id} readOnly />
        </PanelWrapper>
        <PanelWrapper title="Objetivos Terapéuticos" icon={Target} scrollable>
          <TherapyGoals patientId={id} readOnly />
        </PanelWrapper>
      </div>
    </div>
  )

  if (!patient) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <User size={28} className="text-gray-400" />
      </div>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{loadError ? 'No se pudo cargar el paciente' : 'Paciente no encontrado'}</p>
      {loadError && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-2">{loadError}</p>}
      <Link to="/psych/patients" className="text-pro-600 dark:text-pro-400 text-sm hover:underline">← Volver a la lista</Link>
    </div>
  )

  const lastEntry = entries[0]?.createdAt
  // Mismo cálculo que la ficha pre-sesión: entradas de los últimos 7 días.
  const avgMood   = insights?.avgThisWeek ?? null

  return (
    <div className="animate-fade-in pb-16">
      {/* ── Patient card (sticky) ─────────────────── */}
      <div className="sticky top-[60px] lg:top-0 z-30 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 shadow-sm">
          <Link to="/psych/patients" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
            <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden font-bold text-base shrink-0 bg-pro-100 dark:bg-pro-900/20 text-pro-700 dark:text-pro-400">
            {patient.avatarUrl ? (
              <AvatarDisplay avatar={patient.avatarUrl} size={28} className="text-current" />
            ) : (
              patient.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{patient.name}</h1>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1"><Activity size={11} /> {patient.totalEntries} entradas</span>
              {lastEntry && <span className="flex items-center gap-1"><Calendar size={11} /> Último: {formatDateShort(lastEntry)}</span>}
              {patient.lastMood && (
                <span className="flex items-center gap-1">
                  Ánimo: <MoodIcon score={patient.lastMood} size={13} />
                  <span style={{ color: MOOD_ICONS[patient.lastMood]?.text }}>{MOOD_ICONS[patient.lastMood]?.label}</span>
                </span>
              )}
              {avgMood && <span className="flex items-center gap-1"><TrendingUp size={11} /> Prom. 7 días: <strong>{avgMood}</strong></span>}
            </div>
          </div>
          <button
            onClick={() => setConfirmUnlink(true)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <UserMinus size={14} /> <span className="hidden sm:inline">Desvincular</span>
            <span className="sr-only sm:hidden">Desvincular paciente</span>
          </button>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={handleUnlink}
        title={`¿Desvincular a ${patient.name}?`}
        description="Dejarás de ver su diario y sus hábitos. Tus notas y objetivos se conservan en Pacientes archivados. Para volver a vincularse, el paciente tendrá que enviarte una nueva solicitud."
        confirmLabel="Desvincular"
      />

      {/* ── Toolbar ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setPanelMenu(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-pro-300 transition-all"
          >
            <LayoutGrid size={14} /> Paneles ({visible.length}/{PANELS.length})
          </button>

          {panelMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPanelMenu(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-2 animate-scale-in">
                <p className="text-xs font-bold text-gray-400 px-4 py-1">Visibilidad</p>
                {PANELS.map(panel => {
                  const on = visible.includes(panel.i)
                  return (
                    <button key={panel.i} onClick={() => togglePanel(panel.i)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors ${on ? 'text-pro-700 dark:text-pro-400 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
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
          Arrastrá por el título y redimensioná desde las esquinas
        </p>
      </div>

      {/* ── Grid ───────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <LayoutGrid size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 dark:text-gray-400 mb-3">Todos los paneles están ocultos</p>
          <button onClick={resetAll} className="text-sm px-5 py-2.5 rounded-xl bg-pro-600 text-white font-semibold">Restablecer</button>
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
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                      Hábitos configurados
                    </h3>
                    {habitsList.length === 0 ? (
                      <p className="text-sm text-gray-400 px-1">El paciente no tiene hábitos configurados actualmente.</p>
                    ) : (
                      <div className="grid gap-2">
                        {habitsList.map(h => {
                          // Mismo criterio que el historial: completado, marcado o con cantidad cargada.
                          const habitEntries = entries.filter(e => e.completedHabits?.includes(h.id) || e.habitData?.[h.id]?.done === true || e.habitData?.[h.id]?.qty !== undefined)
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
                                <p className="text-xs text-gray-400 font-semibold mb-0.5">Registrado</p>
                                <p className="text-sm font-bold text-pro-600 dark:text-pro-400">
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
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                      Análisis de Correlación
                    </h3>
                    <HabitCorrelationCard habits={habitsList} entries={entries} audience="psychologist" />
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
