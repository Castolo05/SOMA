import { useState, useEffect } from 'react'
import { UserPlus, Check, X } from 'lucide-react'
import { acceptPatientRequest, getPatientRequests, rejectPatientRequest } from '../../lib/api'
import AvatarDisplay from '../../components/AvatarDisplay'
import ConfirmActionModal from '../../components/ConfirmActionModal'
import { useToast } from '../../context/ToastContext'

export default function PatientRequests() {
  const { showError } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Solicitud con una acción en curso: evita aceptar o rechazar dos veces.
  const [busyId, setBusyId] = useState(null)
  const [confirmReject, setConfirmReject] = useState(null)

  useEffect(() => {
    fetchRequests()
    // PsychLayout consulta el contador y avisa cuando cambia.
    window.addEventListener('soma:patient-request-count-changed', fetchRequests)
    return () => window.removeEventListener('soma:patient-request-count-changed', fetchRequests)
  }, [])

  const fetchRequests = async () => {
    try {
      const { data } = await getPatientRequests()
      setRequests(data.requests)
      setError('')
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError(err.response?.data?.error || err.message || 'No se pudieron cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (id) => {
    if (busyId) return
    setBusyId(id)
    try {
      await acceptPatientRequest(id)
      setRequests(prev => prev.filter(req => req.id !== id))
      window.dispatchEvent(new Event('soma:patient-requests-updated'))
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Error al aceptar solicitud.')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    const id = confirmReject?.id
    setConfirmReject(null)
    if (!id || busyId) return
    setBusyId(id)
    try {
      await rejectPatientRequest(id)
      setRequests(prev => prev.filter(req => req.id !== id))
      window.dispatchEvent(new Event('soma:patient-requests-updated'))
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Error al rechazar solicitud.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando solicitudes...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitudes Pendientes</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Usuarios que ingresaron tu código y esperan tu aprobación para ser monitoreados.
        </p>
      </div>

      <ConfirmActionModal
        isOpen={!!confirmReject}
        onClose={() => setConfirmReject(null)}
        onConfirm={handleReject}
        title="¿Rechazar solicitud?"
        description={`${confirmReject?.name ?? 'Esta persona'} no quedará vinculada. Podrá volver a enviarte una solicitud con tu código.`}
        confirmLabel="Rechazar"
      />

      <div className="bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--theme-border)] overflow-hidden">
        {error ? (
          <div role="alert" className="p-8 text-center text-red-600 dark:text-red-400">{error}</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No tienes solicitudes pendientes en este momento.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-[var(--theme-border)]">
            {requests.map(req => {
              const dateObj = req.date ? new Date(req.date) : new Date()
              const formattedDate = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              return (
                <li key={req.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-pro-50 dark:bg-pro-900/20 flex items-center justify-center text-pro-600 dark:text-pro-400 border border-pro-100 dark:border-pro-800">
                      {req.avatarUrl
                        ? <AvatarDisplay avatar={req.avatarUrl} size={24} />
                        : <UserPlus size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{req.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Solicitado el {formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleAccept(req.id)} disabled={!!busyId} aria-label={`Aceptar solicitud de ${req.name}`} className="disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-800" title="Aceptar">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setConfirmReject(req)} disabled={!!busyId} aria-label={`Rechazar solicitud de ${req.name}`} className="disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-800" title="Rechazar">
                      <X size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
