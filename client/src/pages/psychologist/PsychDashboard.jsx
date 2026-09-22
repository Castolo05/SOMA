import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { MOOD_ICONS, formatDateShort } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { AlertTriangle, Users, ChevronRight, Copy, Check, GripVertical } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

const ResponsiveGridLayout = WidthProvider(Responsive)

const DEFAULT_LAYOUT = [
  { i: 'alerts', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
  { i: 'content', x: 0, y: 2, w: 12, h: 12, minW: 6, minH: 7 },
]

const getLayoutKey = (userId) => `psych_dashboard_layout_${userId || 'local'}`

const loadLayout = (userId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(getLayoutKey(userId)))
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_LAYOUT
  } catch {
    return DEFAULT_LAYOUT
  }
}

const layoutForColumns = (items, columns) => items.map((item) => {
  const width = columns === 1 ? 1 : Math.min(item.w, columns)
  const x = columns === 1 ? 0 : Math.min(item.x, columns - width)
  return {
    ...item,
    x,
    w: width,
    minW: Math.min(item.minW || 1, columns),
  }
})

export default function PsychDashboard() {
  usePageTitle('Panel')
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [layout, setLayout] = useState(() => loadLayout(user?.id))

  useEffect(() => {
    api.get('/patients')
      .then(({ data }) => setPatients(data.patients))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLayout(loadLayout(user?.id))
  }, [user?.id])

  const handleLayoutChange = (nextLayout) => {
    setLayout(nextLayout)
    localStorage.setItem(getLayoutKey(user?.id), JSON.stringify(nextLayout))
  }

  const copyCode = () => {
    navigator.clipboard.writeText(user?.inviteCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const alerts = patients.filter((p) => p.hasAlert)
  const activeLayout = layout.filter((item) => item.i === 'content' || alerts.length > 0)
  const responsiveLayouts = {
    lg: layoutForColumns(activeLayout, 12),
    md: layoutForColumns(activeLayout, 8),
    sm: layoutForColumns(activeLayout, 1),
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Buen día, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} activo{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user?.inviteCode && (
          <button
            onClick={copyCode}
            className="flex items-center gap-2 self-start bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-2.5 transition-all focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <div>
              <div className="text-xs text-indigo-400 font-medium text-left">Tu código</div>
              <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-widest text-sm">{user.inviteCode}</div>
            </div>
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-indigo-400" />}
          </button>
        )}
      </div>

      <ResponsiveGridLayout
        className="psych-dashboard-grid"
        layouts={responsiveLayouts}
        rowHeight={38}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable
        isResizable
        draggableHandle=".psych-panel-handle"
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 8, sm: 1 }}
        compactType="vertical"
        useCSSTransforms
      >
        {alerts.length > 0 && (
          <section key="alerts" className="psych-panel bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="psych-panel-handle flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-3 cursor-move">
              <GripVertical size={16} className="text-red-300" />
              <AlertTriangle size={18} />
              {alerts.length} paciente{alerts.length > 1 ? 's' : ''} con ánimo bajo consecutivo
            </div>
            <div className="space-y-2 overflow-auto max-h-[calc(100%-2rem)]">
              {alerts.map((p) => (
                <Link key={p.id} to={`/psych/patients/${p.id}`} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3"><MoodIcon score={p.lastMood} size={18} /><span className="font-medium text-gray-800 dark:text-white">{p.name}</span></div>
                  <ChevronRight size={16} className="text-red-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section key="content" className="psych-panel card-psych dark:bg-gray-800 dark:border-gray-700">
          <div className="psych-panel-handle flex items-center gap-2 mb-3 cursor-move">
            <GripVertical size={16} className="text-gray-300" />
            <h2 className="flex-1 font-semibold text-gray-700 dark:text-gray-200">Mis Pacientes</h2>
          </div>

          <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Users size={16} /> Pacientes activos
            </h2>
            <Link to="/psych/patients" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card-psych h-16 bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="card-psych dark:bg-gray-800 text-center py-10">
              <Users size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Sin pacientes vinculados</p>
              <p className="text-gray-400 text-sm mt-1">Comparte tu código de invitación para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  to={`/psych/patients/${p.id}`}
                  className="card-psych dark:bg-gray-800 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      {p.name}
                      {p.hasAlert && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                          ⚠ Alerta
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <span>{p.totalEntries} entradas</span>
                      {p.lastEntryDate && <span>· Último: {formatDateShort(p.lastEntryDate)}</span>}
                    </div>
                  </div>
                  {p.lastMood && <MoodIcon score={p.lastMood} size={20} />}
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
          </div>
        </section>
      </ResponsiveGridLayout>
    </div>
  )
}
