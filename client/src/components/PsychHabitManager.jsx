import { useCallback, useEffect, useState } from 'react'
import { Archive, Check, History, Lock, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import {
  getHabitChangeLog,
  getHabitEditPermission,
  psychCreateHabit,
  psychSetHabitArchived,
  psychUpdateHabit,
} from '../lib/api'
import { HABIT_ICONS } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const TRACKING_LABELS = { toggle: 'Sí/No', qty: 'Cantidad', 'toggle+qty': 'Sí/No + Cantidad' }
const EMPTY_FORM = { id: null, text: '', icon: 'CheckCircle', trackingType: 'toggle', unit: '', hasNote: false }
const LOG_VERBS = { created: 'añadiste', updated: 'modificaste', archived: 'archivaste', restored: 'restauraste' }

/**
 * Gestión de los hábitos de un paciente desde la ficha del psicólogo.
 * Solo se puede crear, editar y archivar mientras el paciente mantenga activo
 * el permiso; la base lo exige por RLS aunque la pantalla se manipule.
 */
export default function PsychHabitManager({ patientId, habits, entries, onHabitsChange }) {
  const { user } = useAuth()
  const { showError } = useToast()
  const [allowed, setAllowed] = useState(null) // null = cargando
  const [log, setLog] = useState([])
  const [form, setForm] = useState(null) // null = sin formulario abierto
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const loadPermission = useCallback(() => (
    getHabitEditPermission(patientId)
      .then(({ data }) => setAllowed(data.allowed))
      .catch(() => setAllowed(false))
  ), [patientId])

  const loadLog = useCallback(() => (
    getHabitChangeLog(patientId)
      .then(({ data }) => setLog(data.log))
      .catch(() => {})
  ), [patientId])

  useEffect(() => {
    setAllowed(null)
    setForm(null)
    loadPermission()
    loadLog()
  }, [loadPermission, loadLog])

  // Si el paciente retiró el permiso con la ficha abierta, se vuelve a comprobar.
  const handleError = (err, fallback) => {
    showError(err.response?.data?.error || fallback)
    loadPermission()
  }

  const save = async () => {
    if (!form?.text.trim()) return
    setSaving(true)
    const fields = {
      text: form.text.trim(),
      icon: form.icon,
      trackingType: form.trackingType,
      unit: form.trackingType !== 'toggle' ? form.unit.trim() : '',
      hasNote: form.hasNote,
    }
    try {
      if (form.id) {
        const { data } = await psychUpdateHabit(form.id, fields)
        onHabitsChange(habits.map(h => (h.id === form.id ? data.habit : h)))
      } else {
        const { data } = await psychCreateHabit(patientId, fields)
        onHabitsChange([...habits, data.habit])
      }
      setForm(null)
      loadLog()
    } catch (err) {
      handleError(err, 'No se pudo guardar el hábito.')
    } finally {
      setSaving(false)
    }
  }

  const setArchived = async (habit, archived) => {
    setBusyId(habit.id)
    try {
      const { data } = await psychSetHabitArchived(habit.id, archived)
      onHabitsChange(habits.map(h => (h.id === habit.id ? data.habit : h)))
      loadLog()
    } catch (err) {
      handleError(err, 'No se pudo actualizar el hábito.')
    } finally {
      setBusyId(null)
    }
  }

  const assignedLabel = (habit) => {
    if (!habit.assignedBy) return null
    return habit.assignedBy === user?.id ? 'Asignado por vos' : 'Asignado por otro profesional'
  }

  const renderRow = (habit) => {
    const IconComp = HABIT_ICONS[habit.icon] || HABIT_ICONS.CheckCircle
    // Mismo criterio que el historial: completado, marcado o con cantidad cargada.
    const habitEntries = entries.filter(e => e.completedHabits?.includes(habit.id) || e.habitData?.[habit.id]?.done === true || e.habitData?.[habit.id]?.qty !== undefined)
    const label = assignedLabel(habit)
    return (
      <div
        key={habit.id}
        className={`bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100 dark:border-gray-700 ${habit.archived ? 'opacity-70' : ''}`}
      >
        <span className="text-pro-500 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-600 shrink-0">
          <IconComp size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{habit.text}</p>
          <p className="text-xs text-gray-500 font-medium">
            {TRACKING_LABELS[habit.trackingType] || 'Sí/No'}
            {habit.unit ? ` · ${habit.unit}` : ''}
            {` · ${habitEntries.length} ${habitEntries.length === 1 ? 'día' : 'días'}`}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {habit.archived && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 rounded-full px-2 py-0.5">Archivado</span>
            )}
            {label && (
              <span className="text-[10px] font-bold text-pro-600 bg-pro-50 dark:bg-pro-900/30 dark:text-pro-300 rounded-full px-2 py-0.5">{label}</span>
            )}
          </div>
        </div>
        {allowed && (
          <div className="flex items-center gap-1 shrink-0">
            {!habit.archived && (
              <button
                type="button"
                onClick={() => setForm({
                  id: habit.id,
                  text: habit.text,
                  icon: habit.icon || 'CheckCircle',
                  trackingType: habit.trackingType || 'toggle',
                  unit: habit.unit || '',
                  hasNote: !!habit.hasNote,
                })}
                className="p-1.5 text-gray-400 hover:text-pro-500 hover:bg-pro-50 dark:hover:bg-pro-900/20 rounded-lg transition-colors"
                aria-label={`Editar el hábito ${habit.text}`}
                title="Editar"
              >
                <Pencil size={15} />
              </button>
            )}
            <button
              type="button"
              disabled={busyId === habit.id}
              onClick={() => setArchived(habit, !habit.archived)}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
              aria-label={habit.archived ? `Restaurar el hábito ${habit.text}` : `Archivar el hábito ${habit.text}`}
              title={habit.archived ? 'Restaurar' : 'Archivar (se conserva el historial)'}
            >
              {habit.archived ? <RotateCcw size={15} /> : <Archive size={15} />}
            </button>
          </div>
        )}
      </div>
    )
  }

  const active = habits.filter(h => !h.archived)
  const archived = habits.filter(h => h.archived)

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2 mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Hábitos configurados</h3>
        {allowed && !form && (
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="flex items-center gap-1 text-xs font-semibold text-pro-600 dark:text-pro-400 hover:underline"
          >
            <Plus size={14} /> Añadir hábito
          </button>
        )}
      </div>

      {allowed === false && (
        <div className="flex items-start gap-2 mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">
          <Lock size={14} className="shrink-0 mt-0.5" />
          <span>
            Solo lectura: el paciente no te dio permiso para editar sus hábitos. Puede activarlo desde su perfil, en «Profesionales vinculados».
          </span>
        </div>
      )}

      {form && (
        <div className="mb-3 rounded-xl border border-pro-200 dark:border-pro-800 bg-pro-50/40 dark:bg-pro-900/10 p-3 space-y-2.5">
          <p className="text-xs font-bold text-pro-700 dark:text-pro-300">
            {form.id ? 'Editar hábito' : 'Nuevo hábito para el paciente'}
          </p>
          <input
            className="input-psych"
            placeholder="Ej: Caminar 20 minutos"
            aria-label="Nombre del hábito"
            maxLength={80}
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input-psych"
              aria-label="Icono"
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            >
              {Object.keys(HABIT_ICONS).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              className="input-psych"
              aria-label="Tipo de registro"
              value={form.trackingType}
              onChange={e => setForm(f => ({ ...f, trackingType: e.target.value }))}
            >
              {Object.entries(TRACKING_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </div>
          {form.trackingType !== 'toggle' && (
            <input
              className="input-psych"
              placeholder="Unidad (ej: km, horas, vasos)"
              aria-label="Unidad"
              maxLength={20}
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            />
          )}
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasNote}
              onChange={e => setForm(f => ({ ...f, hasNote: e.target.checked }))}
            />
            Permitir aclaración de texto
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving || !form.text.trim()} className="btn-psych text-sm flex-1 flex items-center justify-center gap-1.5">
              <Check size={15} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-ghost text-sm rounded-full" aria-label="Cancelar">
              <X size={16} />
            </button>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            El paciente verá este hábito marcado como asignado por vos y no podrá cambiarlo mientras mantenga tu permiso. Cada cambio queda registrado en su perfil.
          </p>
        </div>
      )}

      {active.length === 0 && archived.length === 0 ? (
        <p className="text-sm text-gray-400 px-1">El paciente no tiene hábitos configurados actualmente.</p>
      ) : (
        <div className="grid gap-2">
          {active.map(renderRow)}
          {archived.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 px-1 pt-2">Archivados</p>
              {archived.map(renderRow)}
            </>
          )}
        </div>
      )}

      {log.length > 0 && (
        <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <summary className="cursor-pointer font-semibold flex items-center gap-1.5 w-fit"><History size={13} /> Tus cambios recientes</summary>
          <ul className="mt-2 space-y-1 pl-1">
            {log.slice(0, 8).map(entry => (
              <li key={entry.id}>
                {LOG_VERBS[entry.action] || 'cambiaste'} «{entry.habitText}» ·{' '}
                {new Date(entry.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
