import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, User } from 'lucide-react'
import { MONTH_NAMES, DAY_NAMES, isSameDay, formatTime } from '../lib/constants'
import api from '../lib/api'

/**
 * AppointmentCalendar — Calendario de citas del psicólogo
 * Funciona de forma independiente: carga y guarda sus propios datos.
 */
export default function AppointmentCalendar({ patients = [] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', time: '09:00', patientId: '', duration: 50, notes: '' })
  const [saving, setSaving] = useState(false)

  // Cargar citas del mes visible
  useEffect(() => {
    setLoading(true)
    api.get(`/appointments?year=${viewYear}&month=${viewMonth + 1}`)
      .then(({ data }) => setAppointments(data.appointments))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [viewYear, viewMonth])

  // Mapa de día → citas
  const apptMap = useMemo(() => {
    const map = {}
    appointments.forEach((a) => {
      const d = new Date(a.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return map
  }, [appointments])

  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    return { days: daysInMonth, startOffset: firstDay }
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = (day) => {
    const date = new Date(viewYear, viewMonth, day)
    setSelectedDate(date)
    // Prellenar la fecha en el formulario
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    setForm(f => ({ ...f, date: `${yyyy}-${mm}-${dd}` }))
    setShowForm(false)
  }

  const selectedDayAppts = useMemo(() => {
    if (!selectedDate) return []
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    return apptMap[key] || []
  }, [selectedDate, apptMap])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title || !form.date) return
    setSaving(true)
    try {
      const dateTime = new Date(`${form.date}T${form.time}:00`)
      const { data } = await api.post('/appointments', {
        title: form.title,
        date: dateTime.toISOString(),
        patientId: form.patientId || undefined,
        duration: parseInt(form.duration),
        notes: form.notes,
      })
      setAppointments(prev => [...prev, data.appointment].sort((a, b) => new Date(a.date) - new Date(b.date)))
      setShowForm(false)
      setForm(f => ({ ...f, title: '', notes: '', patientId: '' }))
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear cita.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cita?')) return
    try {
      await api.delete(`/appointments/${id}`)
      setAppointments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      alert('Error al eliminar.')
    }
  }

  const getDayAppts = (day) => apptMap[`${viewYear}-${viewMonth}-${day}`] || []

  return (
    <div className="space-y-4">
      {/* Calendario */}
      <div className="card-psych dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-sage-50 dark:hover:bg-gray-700 transition-colors" aria-label="Mes anterior">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h3 className="font-bold text-gray-900 dark:text-white">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-sage-50 dark:hover:bg-gray-700 transition-colors" aria-label="Mes siguiente">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Nombres de días */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1
            const dayAppts = getDayAppts(day)
            const date = new Date(viewYear, viewMonth, day)
            const isToday_ = isSameDay(date, today)
            const isSelected = selectedDate && isSameDay(date, selectedDate)

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-xl min-h-11
                  transition-all duration-150 text-sm
                  ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}
                  ${isToday_ && !isSelected ? 'ring-2 ring-indigo-400' : ''}
                `}
              >
                <span className={`font-semibold ${isSelected ? 'text-white' : isToday_ ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  {day}
                </span>
                {dayAppts.length > 0 && (
                  <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-white/80' : 'text-indigo-500'}`}>
                    {dayAppts.length} cita{dayAppts.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Panel de citas del día seleccionado */}
      {selectedDate && (
        <div className="card-psych dark:bg-gray-800 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 dark:text-white">
              {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]}
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1 btn-psych text-xs py-1.5 px-3"
              >
                <Plus size={14} />
                Nueva cita
              </button>
              <button onClick={() => setSelectedDate(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Formulario de nueva cita */}
          {showForm && (
            <form onSubmit={handleCreate} className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 mb-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">Título *</label>
                  <input
                    className="input-psych text-sm"
                    placeholder="Sesión con paciente / Supervisión..."
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">Hora</label>
                  <input
                    type="time"
                    className="input-psych text-sm"
                    value={form.time}
                    onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">Duración (min)</label>
                  <input
                    type="number"
                    className="input-psych text-sm"
                    value={form.duration}
                    onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}
                    min={15} max={240} step={5}
                  />
                </div>
                {patients.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">Paciente (opcional)</label>
                    <select
                      className="input-psych text-sm"
                      value={form.patientId}
                      onChange={(e) => setForm(f => ({ ...f, patientId: e.target.value }))}
                    >
                      <option value="">Sin paciente asignado</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">Notas (opcional)</label>
                  <textarea
                    className="input-psych text-sm resize-none h-16"
                    placeholder="Notas de la cita..."
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-psych text-sm flex-1">
                  {saving ? 'Guardando...' : 'Guardar cita'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de citas del día */}
          {selectedDayAppts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin citas agendadas para este día.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayAppts.map((appt) => (
                <div key={appt.id} className="flex items-start gap-3 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3">
                  <div className="w-1.5 h-full min-h-[40px] rounded-full bg-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-white text-sm">{appt.title}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {formatTime(appt.date)} · {appt.duration}min
                      </span>
                      {appt.patient && (
                        <span className="text-xs text-indigo-500 flex items-center gap-1">
                          <User size={10} /> {appt.patient.name}
                        </span>
                      )}
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{appt.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(appt.id)}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
