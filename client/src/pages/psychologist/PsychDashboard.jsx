import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { formatDateShort, formatTime } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import AppointmentCalendar from '../../components/AppointmentCalendar'
import {
  AlertTriangle, Users, ChevronRight, Copy, Check,
  Calendar, Activity, Clock, Wifi, TrendingUp,
} from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function PsychDashboard() {
  usePageTitle('Dashboard')
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('pacientes')

  useEffect(() => {
    Promise.allSettled([
      api.get('/patients'),
      api.get('/appointments'),
    ]).then(([pRes, aRes]) => {
      if (pRes.status === 'fulfilled') setPatients(pRes.value.data.patients ?? [])
      if (aRes.status === 'fulfilled') setAppointments(aRes.value.data.appointments ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const copyCode = () => {
    navigator.clipboard.writeText(user?.inviteCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const alerts        = patients.filter(p => p.hasAlert)
  const inactive      = patients.filter(p => p.hasInactivityAlert && !p.hasAlert)
  const now           = new Date()
  const upcoming      = appointments
    .filter(a => new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  const stats = [
    { label: 'Pacientes',     value: patients.length,   icon: Users,          color: 'indigo' },
    { label: 'Con alerta',    value: alerts.length,     icon: AlertTriangle,   color: 'red'    },
    { label: 'Sin actividad', value: inactive.length,   icon: Wifi,           color: 'amber'  },
    { label: 'Próximas citas',value: upcoming.length,   icon: Calendar,       color: 'emerald'},
  ]

  const colorMap = {
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',   icon: 'text-indigo-600 dark:text-indigo-400',   num: 'text-indigo-700 dark:text-indigo-300'  },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',         icon: 'text-red-600 dark:text-red-400',         num: 'text-red-700 dark:text-red-300'        },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     icon: 'text-amber-600 dark:text-amber-400',     num: 'text-amber-700 dark:text-amber-300'    },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', num: 'text-emerald-700 dark:text-emerald-300' },
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 mt-1 capitalize">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {user?.inviteCode && (
          <button
            onClick={copyCode}
            className="group flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-200 self-start"
          >
            <div className="text-left">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Código de invitación</div>
              <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-[0.25em] text-base">{user.inviteCode}</div>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'}`}>
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} className="text-gray-500 group-hover:text-indigo-600" />}
            </div>
          </button>
        )}
      </div>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const c = colorMap[s.color]
          return (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.bg}`}>
                <s.icon size={18} className={c.icon} />
              </div>
              <p className={`text-3xl font-black leading-none mb-1 ${c.num}`}>{s.value}</p>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Alertas críticas ───────────────────────── */}
      {(alerts.length > 0 || inactive.length > 0) && (
        <div className="space-y-3">
          {alerts.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-3 text-sm">
                <AlertTriangle size={16} />
                {alerts.length} paciente{alerts.length > 1 ? 's' : ''} con ánimo bajo persistente
              </div>
              <div className="space-y-2">
                {alerts.map(p => (
                  <Link key={p.id} to={`/psych/patients/${p.id}`} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 hover:shadow-sm transition-all group">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center font-bold text-red-700 dark:text-red-400 text-sm shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">Últimas 3 entradas con ánimo ≤ 3</p>
                    </div>
                    {p.lastMood && <MoodIcon score={p.lastMood} size={18} />}
                    <ChevronRight size={15} className="text-red-300 group-hover:text-red-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-3 text-sm">
                <Wifi size={16} />
                {inactive.length} paciente{inactive.length > 1 ? 's' : ''} sin registros recientes
              </div>
              <div className="space-y-2">
                {inactive.map(p => (
                  <Link key={p.id} to={`/psych/patients/${p.id}`} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 hover:shadow-sm transition-all group">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-sm shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.daysSinceLastEntry} días sin registrar</p>
                    </div>
                    <ChevronRight size={15} className="text-amber-300 group-hover:text-amber-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────── */}
      <div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-5">
          {[
            { id: 'pacientes', label: 'Pacientes', icon: Users    },
            { id: 'agenda',    label: 'Agenda',    icon: Calendar  },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Patients tab */}
        {activeTab === 'pacientes' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" /> Pacientes activos
              </h2>
              <Link to="/psych/patients" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                Ver todos →
              </Link>
            </div>

            {loading ? (
              <div className="p-6 space-y-3 animate-pulse">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Sin pacientes vinculados</p>
                <p className="text-gray-400 text-sm">Compartí tu código de invitación para comenzar.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {patients.slice(0, 8).map(p => (
                  <Link
                    key={p.id}
                    to={`/psych/patients/${p.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      p.hasAlert ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                    }`}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</span>
                        {p.hasAlert && (
                          <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">⚠ Alerta</span>
                        )}
                        {p.hasInactivityAlert && !p.hasAlert && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Wifi size={9} /> {p.daysSinceLastEntry}d
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{p.totalEntries} entradas</span>
                        {p.lastEntryDate && <span>· Último: {formatDateShort(p.lastEntryDate)}</span>}
                      </div>
                    </div>
                    {p.lastMood && <MoodIcon score={p.lastMood} size={20} />}
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </Link>
                ))}
                {patients.length > 8 && (
                  <div className="px-6 py-4">
                    <Link to="/psych/patients" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                      Ver {patients.length - 8} pacientes más →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Agenda tab */}
        {activeTab === 'agenda' && (
          <div className="animate-fade-in space-y-4">
            {upcoming.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 text-sm">
                  <TrendingUp size={15} className="text-indigo-500" /> Próximas citas
                </h3>
                <div className="space-y-2">
                  {upcoming.map(a => {
                    const d = new Date(a.date)
                    return (
                      <div key={a.id} className="flex items-center gap-4 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                        <div className="text-center min-w-[2.5rem]">
                          <p className="text-[10px] text-indigo-400 font-bold uppercase">{d.toLocaleDateString('es-AR', { month: 'short' })}</p>
                          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 leading-tight">{d.getDate()}</p>
                        </div>
                        <div className="w-px h-10 bg-indigo-200 dark:bg-indigo-700 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{a.title}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {formatTime(a.date)} · {a.duration}min
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <AppointmentCalendar patients={patients} />
          </div>
        )}
      </div>
    </div>
  )
}
