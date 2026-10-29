import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getArchivedPatients, getPatients } from '../../lib/api'
import { entryDateKey, entryDateToDate, formatDateShort } from '../../lib/constants'
import MoodIcon from '../../components/MoodIcon'
import AvatarDisplay from '../../components/AvatarDisplay'
import { Archive, ChevronRight, Search, SlidersHorizontal, TrendingDown, CloudRain, Clock } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuth } from '../../context/AuthContext'

// Umbrales de alerta para preparar sesiones (escala de ánimo 1-10).
const INACTIVE_DAYS = 7
const LOW_MOOD_MAX = 3
const FALLING_TREND = -1.5

const DAY_MS = 86400000
const daysSince = (dayKey) =>
  dayKey ? Math.round((entryDateToDate(entryDateKey()) - entryDateToDate(dayKey)) / DAY_MS) : null

function alertsFor(p) {
  const alerts = []
  const idle = daysSince(p.lastEntryDate)
  if (idle === null) alerts.push({ key: 'idle', icon: Clock, label: 'Sin registros' })
  else if (idle >= INACTIVE_DAYS) alerts.push({ key: 'idle', icon: Clock, label: `${idle} días sin registrar` })
  if (p.lastMood != null && p.lastMood <= LOW_MOOD_MAX) alerts.push({ key: 'low', icon: CloudRain, label: 'Ánimo bajo' })
  if (p.trend != null && parseFloat(p.trend) <= FALLING_TREND) alerts.push({ key: 'trend', icon: TrendingDown, label: `Tendencia ${p.trend}` })
  return alerts
}

const SORTS = {
  priority: { label: 'Prioridad', compare: (a, b) => b.alerts.length - a.alerts.length || (a.lastEntryDate ?? '').localeCompare(b.lastEntryDate ?? '') },
  recent:   { label: 'Última entrada', compare: (a, b) => (b.lastEntryDate ?? '').localeCompare(a.lastEntryDate ?? '') },
  name:     { label: 'Nombre', compare: (a, b) => a.name.localeCompare(b.name, 'es') },
}

function PatientAvatar({ patient, muted = false }) {
  return (
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden font-bold text-base shrink-0 ${muted ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-pro-100 dark:bg-pro-900/20 text-pro-700 dark:text-pro-400'}`}>
      {patient.avatarUrl
        ? <AvatarDisplay avatar={patient.avatarUrl} size={28} className="text-current" />
        : patient.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function PatientsList() {
  usePageTitle('Pacientes')
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('priority')
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPatients()
      .then(({ data }) => setPatients((data.patients ?? []).map(p => ({ ...p, alerts: alertsFor(p) }))))
      .catch(err => setError(err.response?.data?.error || err.message || 'No se pudieron cargar los pacientes.'))
      .finally(() => setLoading(false))
    // Los archivados son secundarios: si fallan, la lista principal sigue igual.
    getArchivedPatients()
      .then(({ data }) => setArchived(data.patients))
      .catch(err => console.error('Error cargando pacientes archivados:', err))
  }, [])

  const withAlerts = useMemo(() => patients.filter(p => p.alerts.length > 0).length, [patients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patients
      .filter(p => p.name.toLowerCase().includes(q) && (!onlyAlerts || p.alerts.length > 0))
      .sort(SORTS[sort].compare)
  }, [patients, search, sort, onlyAlerts])

  const filteredArchived = useMemo(() => {
    const q = search.trim().toLowerCase()
    return archived.filter(p => p.name.toLowerCase().includes(q))
  }, [archived, search])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Hola, {user?.name}</h1>
        {!error && !loading && (
          <p className="text-gray-400 mt-1">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} vinculado{patients.length !== 1 ? 's' : ''}
            {withAlerts > 0 && <>, <span className="text-amber-600 dark:text-amber-400 font-medium">{withAlerts} para revisar</span></>}
          </p>
        )}
      </div>

      {/* Search + orden */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pro-500 focus:border-transparent transition-all"
            placeholder="Buscar paciente..."
            aria-label="Buscar paciente por nombre"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Ordenar pacientes"
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="py-2.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pro-500"
        >
          {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>Ordenar: {label}</option>)}
        </select>
        <button
          type="button"
          aria-pressed={onlyAlerts}
          onClick={() => setOnlyAlerts(v => !v)}
          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${onlyAlerts
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-300'}`}
        >
          Solo para revisar
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-[72px] px-6 py-4"><div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg w-48" /></div>)}
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-center py-16 px-6">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No se pudieron cargar los pacientes</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SlidersHorizontal size={28} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">Sin resultados</p>
          <p className="text-gray-400 text-sm">
            {search || onlyAlerts ? 'Ningún paciente coincide con el filtro.' : 'No hay pacientes vinculados aún.'}
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
                <PatientAvatar patient={p} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                  <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3">
                    <span>{p.totalEntries} entradas</span>
                    {p.lastEntryDate && <span>Último: {formatDateShort(entryDateToDate(p.lastEntryDate))}</span>}
                    {p.avgThisWeek && <span>Prom. 7 días: {p.avgThisWeek}</span>}
                  </div>
                  {p.alerts.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.alerts.map(({ key, icon: Icon, label }) => (
                        <span key={key} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40">
                          <Icon size={11} aria-hidden="true" /> {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {p.lastMood && <MoodIcon score={p.lastMood} size={22} />}
                <ChevronRight size={16} className="text-gray-300 group-hover:text-pro-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Archivados */}
      {!loading && filteredArchived.length > 0 && (
        <section aria-labelledby="archived-patients-title" className="space-y-3">
          <div>
            <h2 id="archived-patients-title" className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Archive size={14} /> Pacientes archivados
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Desvinculados. Conservás tus notas y objetivos en solo lectura.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50">
            {filteredArchived.map(p => (
              <Link
                key={p.id}
                to={`/psych/patients/${p.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <PatientAvatar patient={p} muted />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{p.name}</span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {p.notesCount} nota{p.notesCount !== 1 ? 's' : ''}, {p.goalsCount} objetivo{p.goalsCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-pro-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
