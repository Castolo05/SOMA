import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { getReminderPreference, setDailyReminders } from '../lib/reminders'

export default function ReminderSettings({ entries = [] }) {
  const [enabled, setEnabled] = useState(getReminderPreference)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setEnabled(getReminderPreference())
  }, [])

  const handleChange = async () => {
    const nextEnabled = !enabled
    setSaving(true)
    setMessage('')

    try {
      const result = await setDailyReminders(nextEnabled, entries)
      if (nextEnabled && result.permission === 'denied') {
        setEnabled(false)
        setMessage('Android no autorizó las notificaciones. Podés habilitarlas desde los ajustes del sistema.')
        return
      }

      setEnabled(nextEnabled)
      setMessage(nextEnabled
        ? 'Listo: te recordaremos a las 23:00 y, si faltó ayer, al mediodía.'
        : 'Los recordatorios quedaron desactivados.')
    } catch {
      setEnabled(getReminderPreference())
      setMessage('No pudimos actualizar los recordatorios. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className={`p-2.5 rounded-2xl ${enabled ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
          {enabled ? <Bell size={20} /> : <BellOff size={20} />}
        </span>
        <div className="flex-1">
          <h2 className="font-bold text-gray-700 dark:text-gray-200">Recordatorios diarios</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Un aviso amable a las 23:00 y, si faltó una nota, otro al mediodía siguiente.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? 'Desactivar recordatorios diarios' : 'Activar recordatorios diarios'}
          onClick={handleChange}
          disabled={saving}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-sage-400' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {message && <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>}
      <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
        Podés desactivarlos cuando quieras. Los horarios se calculan en la zona horaria del teléfono.
      </p>
    </div>
  )
}
