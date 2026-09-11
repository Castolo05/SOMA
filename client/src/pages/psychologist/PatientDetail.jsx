import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import { MOOD_ICONS, formatDate } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import MoodChart from '../../components/MoodChart'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Plus,
  Wifi, Target, CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp,
  Save, X, Calendar, Eye, EyeOff, LayoutGrid
} from 'lucide-react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { usePageTitle } from '../../hooks/usePageTitle'

const ResponsiveGridLayout = WidthProvider(Responsive)

// ── Wrapper para paneles modulares ────────────────────────
function PanelWrapper({ title, icon: Icon, onHide, children, className = '' }) {
  return (
    <div className={`card-psych dark:bg-gray-800 h-full flex flex-col p-0 ${className}`}>
      <div className="psych-panel-handle cursor-move flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-indigo-500" />}
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</span>
        </div>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={onHide} className="text-gray-400 hover:text-red-500 transition-colors" title="Ocultar panel">
          <EyeOff size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 relative min-h-0 flex flex-col">
        {children}
      </div>
    </div>
  )
}

// ── Ficha pre-sesión ──────────────────────────────────────
function PreSessionCard({ insights }) {
  if (!insights) return <p className="text-gray-400 text-sm">Cargando datos...</p>
  const { avgThisWeek, trend } = insights

  const trendNum = trend ? parseFloat(trend) : 0
  const TrendIcon = trendNum > 0 ? TrendingUp : trendNum < 0 ? TrendingDown : Minus
  const trendColor = trendNum > 0 ? 'text-emerald-600' : trendNum < 0 ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* Promedio semana actual */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex flex-col items-center justify-center text-center h-full">
        <p className="text-xs text-gray-400 mb-1">Esta semana</p>
        {avgThisWeek ? (
          <>
            <p className="text-2xl font-black text-gray-800 dark:text-white">{avgThisWeek}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <MoodIcon score={Math.round(parseFloat(avgThisWeek))} size={12} />
            </div>
          </>
        ) : <p className="text-gray-400 text-sm">—</p>}
      </div>

      {/* Tendencia vs semana anterior */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex flex-col items-center justify-center text-center h-full">
        <p className="text-xs text-gray-400 mb-1">vs. sem. anterior</p>
        {trend ? (
          <div className={`flex items-center justify-center gap-1 ${trendColor}`}>
            <TrendIcon size={22} />
            <span className="text-2xl font-black">{trendNum > 0 ? '+' : ''}{trend}</span>
          </div>
        ) : <p className="text-gray-400 text-sm">Insuf. datos</p>}
      </div>
    </div>
  )
}

// ── Notas de sesión ───────────────────────────────────────
function SessionNotes({ patientId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/session-notes/${patientId}`)
      .then(({ data }) => setNotes(data.notes))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [patientId])

  const handleCreate = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post(`/session-notes/${patientId}`, {
        title: newTitle || `Sesión ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
        content: newContent,
        sessionDate: new Date().toISOString(),
      })
      setNotes((prev) => [data.note, ...prev])
      setNewTitle(''); setNewContent(''); setCreating(false)
    } catch { alert('Error al crear nota.') }
    finally { setSaving(false) }
  }

  const handleUpdate = async (noteId) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/session-notes/note/${noteId}`, { title: editTitle, content: editContent })
      setNotes((prev) => prev.map((n) => n.id === noteId ? data.note : n))
      setEditing(null)
    } catch { alert('Error al actualizar.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (noteId) => {
    if (!confirm('¿Eliminar esta nota de sesión?')) return
    try {
      await api.delete(`/session-notes/note/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch { alert('Error al eliminar.') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full font-bold">{notes.length} notas</span>
        <button onClick={() => setCreating(!creating)} className="btn-psych py-1 px-2.5 text-[11px] flex items-center gap-1">
          <Plus size={12} /> Nueva
        </button>
      </div>

      {creating && (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl mb-3 border border-indigo-100 dark:border-indigo-800/30">
          <input
            className="input-psych dark:bg-gray-800 dark:border-gray-600 dark:text-white mb-2 text-xs"
            placeholder={`Título (ej: Sesión ${new Date().toLocaleDateString('es-AR')})`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="input-psych dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none h-24 text-xs"
            placeholder="Temas trabajados, tareas..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setCreating(false)} className="btn-ghost text-[11px] py-1 px-2">Cancelar</button>
            <button onClick={handleCreate} disabled={saving || !newContent.trim()} className="btn-psych text-[11px] py-1 px-2">
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="animate-pulse space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />)}</div>}

      <div className="space-y-2">
        {notes.map((note) => {
          const isOpen = expanded === note.id
          const isEditing = editing === note.id
          return (
            <div key={note.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => !isEditing && setExpanded(isOpen ? null : note.id)}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white text-xs truncate">
                    {note.title || 'Sin título'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(note.sessionDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setEditing(note.id); setEditTitle(note.title); setEditContent(note.content); setExpanded(note.id) }} className="p-1 text-gray-400 hover:text-indigo-500 rounded-lg">
                    <Save size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }} className="p-1 text-gray-400 hover:text-red-500 rounded-lg">
                    <Trash2 size={12} />
                  </button>
                  {isOpen ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-50 dark:border-gray-700/50 pt-2 animate-fade-in">
                  {isEditing ? (
                    <>
                      <input className="input-psych dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2 text-xs" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <textarea className="input-psych dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none h-24 text-xs" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setEditing(null)} className="btn-ghost text-[11px] py-1 px-2">Cancel</button>
                        <button onClick={() => handleUpdate(note.id)} disabled={saving} className="btn-psych text-[11px] py-1 px-2">Guardar</button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
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

// ── Objetivos terapéuticos ────────────────────────────────
function TherapyGoals({ patientId }) {
  const [goals, setGoals] = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api.get(`/goals/${patientId}`)
      .then(({ data }) => setGoals(data.goals))
      .catch(console.error)
  }, [patientId])

  const handleAdd = async () => {
    if (!newGoal.trim()) return
    try {
      const { data } = await api.post(`/goals/${patientId}`, { text: newGoal })
      setGoals((prev) => [...prev, data.goal])
      setNewGoal(''); setAdding(false)
    } catch { alert('Error al crear objetivo.') }
  }

  const handleToggle = async (goalId) => {
    try {
      const { data } = await api.patch(`/goals/${goalId}/toggle`)
      setGoals((prev) => prev.map((g) => g.id === goalId ? data.goal : g))
    } catch {}
  }

  const handleDelete = async (goalId) => {
    try {
      await api.delete(`/goals/${goalId}`)
      setGoals((prev) => prev.filter((g) => g.id !== goalId))
    } catch {}
  }

  const done = goals.filter((g) => g.completed).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {goals.length > 0 ? (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full font-bold">{done}/{goals.length} listos</span>
        ) : <span />}
        <button onClick={() => setAdding(!adding)} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
          <Plus size={12} /> Añadir
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            className="input-psych dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1 text-xs py-1.5 px-2"
            placeholder="Ej: Caminar..."
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button onClick={handleAdd} className="btn-psych py-1.5 px-2 text-[11px]">Ok</button>
        </div>
      )}

      {goals.length === 0 && !adding && <p className="text-gray-400 text-xs text-center py-2">Sin objetivos.</p>}

      <div className="space-y-2">
        {goals.map((g) => (
          <div key={g.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            g.completed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
          }`}>
            <button onClick={() => handleToggle(g.id)} className="shrink-0">
              {g.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-gray-300" />}
            </button>
            <span className={`text-xs flex-1 ${g.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{g.text}</span>
            <button onClick={() => handleDelete(g.id)} className="shrink-0 text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Configuraciones de paneles ────────────────────────────
const PANELS = [
  { i: 'pre-session', label: 'Ficha Pre-Sesión', icon: TrendingUp },
  { i: 'mood-chart', label: 'Evolución del Ánimo', icon: TrendingUp },
  { i: 'entries', label: 'Entradas de Paciente', icon: Calendar },
  { i: 'goals', label: 'Objetivos Terapéuticos', icon: Target },
  { i: 'notes', label: 'Notas de Sesión', icon: Save },
]

const DEFAULT_PATIENT_LAYOUT = [
  { i: 'pre-session', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'mood-chart', x: 4, y: 0, w: 8, h: 7, minW: 5, minH: 5 },
  { i: 'entries', x: 0, y: 7, w: 8, h: 9, minW: 5, minH: 6 },
  { i: 'goals', x: 8, y: 7, w: 4, h: 7, minW: 3, minH: 5 },
  { i: 'notes', x: 8, y: 14, w: 4, h: 8, minW: 3, minH: 5 },
]

const getPatientLayoutKey = (patientId) => `psych_patient_layout_${patientId}`

const loadPatientLayout = (patientId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(getPatientLayoutKey(patientId)))
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_PATIENT_LAYOUT
  } catch {
    return DEFAULT_PATIENT_LAYOUT
  }
}

// ── Vista principal PatientDetail ─────────────────────────
export default function PatientDetail() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [entries, setEntries] = useState([])
  const [insights, setInsights] = useState(null)
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  usePageTitle(patient ? patient.name : 'Detalle de Paciente')

  const [visiblePanels, setVisiblePanels] = useState(() => {
    const saved = localStorage.getItem(`psych_dashboard_visible_${id}`)
    return saved ? JSON.parse(saved) : PANELS.map(p => p.i)
  })
  const [panelLayout, setPanelLayout] = useState(() => loadPatientLayout(id))

  const [showMenu, setShowMenu] = useState(false)

  const togglePanel = (panelId) => {
    setVisiblePanels(prev => {
      const next = prev.includes(panelId) ? prev.filter(p => p !== panelId) : [...prev, panelId]
      localStorage.setItem(`psych_dashboard_visible_${id}`, JSON.stringify(next))
      return next
    })
  }

  const handlePanelLayoutChange = (nextLayout) => {
    setPanelLayout(nextLayout)
    localStorage.setItem(getPatientLayoutKey(id), JSON.stringify(nextLayout))
  }

  const resetPanelLayout = () => {
    const nextLayout = DEFAULT_PATIENT_LAYOUT.map((item) => ({ ...item }))
    setPanelLayout(nextLayout)
    localStorage.setItem(getPatientLayoutKey(id), JSON.stringify(nextLayout))
  }

  const activePanelLayout = panelLayout.filter((item) => visiblePanels.includes(item.i))

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, jRes, iRes] = await Promise.allSettled([
          api.get('/patients'),
          api.get(`/journal?patientId=${id}`),
          api.get(`/patients/${id}/insights`),
        ])
        if (pRes.status === 'fulfilled') {
          const p = pRes.value.data.patients.find((p) => p.id === id)
          setPatient(p || null)
        }
        if (jRes.status === 'fulfilled') setEntries(jRes.value.data.entries || [])
        if (iRes.status === 'fulfilled') setInsights(iRes.value.data)
      } catch (err) {
        // silenciar errores de carga
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card-psych h-24 bg-gray-100 dark:bg-gray-800" />)}</div>
  if (!patient) return <div className="text-center py-20 text-gray-400">Paciente no encontrado.</div>

  return (
    <div className="space-y-5 animate-fade-in relative pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/psych/patients" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{patient.name}</h1>
            {patient.hasAlert && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">⚠ Ánimo bajo</span>}
            {patient.hasInactivityAlert && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Wifi size={10} /> {patient.daysSinceLastEntry}d sin registro</span>}
          </div>
          <p className="text-gray-400 text-xs">{patient.totalEntries} entradas totales</p>
        </div>

        {/* Dropdown de Paneles */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="btn-ghost flex items-center gap-2 text-sm py-2 px-3">
            <LayoutGrid size={16} /> Paneles
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 p-2 animate-scale-in">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Visibilidad</p>
              {PANELS.map(panel => {
                const isVisible = visiblePanels.includes(panel.i)
                return (
                  <button key={panel.i} onClick={() => togglePanel(panel.i)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${isVisible ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <div className="flex items-center gap-2">
                      <panel.icon size={14} /> {panel.label}
                    </div>
                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} className="text-gray-400" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mb-3">
        <button onClick={resetPanelLayout} className="btn-ghost flex items-center gap-2 text-xs py-2 px-3" title="Restablecer distribución">
          <LayoutGrid size={14} /> Restablecer distribución
        </button>
      </div>

      <ResponsiveGridLayout
        className="psych-dashboard-grid"
        layouts={{ lg: activePanelLayout, md: activePanelLayout, sm: activePanelLayout }}
        rowHeight={38}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable
        isResizable
        draggableHandle=".psych-panel-handle"
        onLayoutChange={handlePanelLayoutChange}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 8, sm: 1 }}
        compactType="vertical"
        useCSSTransforms
      >
        {visiblePanels.includes('pre-session') && <div key="pre-session"><PanelWrapper title="Ficha Pre-Sesión" icon={TrendingUp} onHide={() => togglePanel('pre-session')}><PreSessionCard insights={insights} /></PanelWrapper></div>}
        {visiblePanels.includes('mood-chart') && <div key="mood-chart"><PanelWrapper title="Evolución del Ánimo" icon={TrendingUp} onHide={() => togglePanel('mood-chart')}><MoodChart entries={entries} mode="psych" height={240} defaultDays={14} /></PanelWrapper></div>}
        {visiblePanels.includes('entries') && <div key="entries"><PanelWrapper title="Entradas de Paciente" icon={Calendar} onHide={() => togglePanel('entries')}><div className="space-y-2">{entries.map((entry) => { const config = MOOD_ICONS[entry.moodScore]; const open = expandedEntry === entry.id; return <div key={entry.id} className={`rounded-xl border transition-all cursor-pointer ${open ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 hover:border-gray-200 dark:border-gray-700'}`}><div className="flex items-center gap-2 p-2" onClick={() => setExpandedEntry(open ? null : entry.id)}><div className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ backgroundColor: config?.bg }}><MoodIcon score={entry.moodScore} size={12} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="text-[11px] font-bold" style={{ color: config?.color }}>{config?.label}</span></div><p className="text-[10px] text-gray-400 truncate capitalize">{formatDate(entry.createdAt)}</p></div>{open ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}</div>{open && <div className="px-2 pb-2 border-t border-gray-100 pt-2 animate-fade-in text-[11px] text-gray-700 whitespace-pre-wrap">{entry.content}</div>}</div> })}</div></PanelWrapper></div>}
        {visiblePanels.includes('goals') && <div key="goals"><PanelWrapper title="Objetivos Terapéuticos" icon={Target} onHide={() => togglePanel('goals')}><TherapyGoals patientId={id} /></PanelWrapper></div>}
        {visiblePanels.includes('notes') && <div key="notes"><PanelWrapper title="Notas de Sesión" icon={Save} onHide={() => togglePanel('notes')}><SessionNotes patientId={id} /></PanelWrapper></div>}
      </ResponsiveGridLayout>
    </div>
  )
}
