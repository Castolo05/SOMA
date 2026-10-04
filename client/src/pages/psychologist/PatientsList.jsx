import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { formatDateShort } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import AvatarDisplay from '../../components/AvatarDisplay'
import { ChevronRight, AlertTriangle, Search, Users, Wifi, SlidersHorizontal } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function PatientsList() {
  usePageTitle('Pacientes')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/patients')
      .then(({ data }) => setPatients(data.patients ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => patients.filter(p => {
    const q = search.toLowerCase()
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
    if (!matchesSearch) return false
    if (filter === 'alerts')   return p.hasAlert
    if (filter === 'inactive') return p.hasInactivityAlert
    return true
  }), [patients, search, filter])

  const alertCount    = patients.filter(p => p.hasAlert).length
  const inactiveCount = patients.filter(p => p.hasInactivityAlert).length

  const filters = [
    { id: 'all',      label: `Todos (${patients.length})`,        icon: Users,         activeClass: 'bg-indigo-600 text-white border-indigo-600' },
    { id: 'alerts',   label: `⚠ Alerta (${alertCount})`,          icon: AlertTriangle, activeClass: 'bg-red-600 text-white border-red-600'     },
    { id: 'inactive', label: `Sin actividad (${inactiveCount})`,  icon: Wifi,          activeClass: 'bg-amber-600 text-white border-amber-600'  },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Pacientes</h1>
        <p className="text-gray-400 mt-1">{patients.length} paciente{patients.length !== 1 ? 's' : ''} vinculado{patients.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold border transition-all ${
                filter === f.id ? f.activeClass : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-[72px] px-6 py-4"><div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg w-48" /></div>)}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SlidersHorizontal size={28} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">Sin resultados</p>
          <p className="text-gray-400 text-sm">
            {search || filter !== 'all' ? 'Ningún paciente coincide con los filtros.' : 'No hay pacientes vinculados aún.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {filtered.map(p => (
              <Link
                key={p.id}
                to={`/psych/patients/${p.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden font-bold text-base shrink-0 ${
                  p.hasAlert
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                }`}>
                  {p.avatarUrl ? (
                    <AvatarDisplay avatar={p.avatarUrl} size={28} className="text-current" />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                    {p.hasAlert && (
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <AlertTriangle size={9} /> Alerta
                      </span>
                    )}
                    {p.hasInactivityAlert && !p.hasAlert && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Wifi size={9} /> {p.daysSinceLastEntry}d sin registrar
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                    <span>{p.totalEntries} entradas</span>
                    {p.lastEntryDate ? <span>Último: {formatDateShort(p.lastEntryDate)}</span> : <span className="text-amber-500">Sin registros</span>}
                  </div>
                </div>

                {p.lastMood && <MoodIcon score={p.lastMood} size={22} />}
                <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
