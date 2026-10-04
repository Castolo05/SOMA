import { useState, useEffect } from 'react'
import { UserPlus, Check, X } from 'lucide-react'
import api from '../../lib/api'
import AvatarDisplay from '../../components/AvatarDisplay'

export default function PatientRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRequests()
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchRequests()
    }, 15000)
    return () => window.clearInterval(intervalId)
  }, [])

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/patients/requests')
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
    try {
      await api.post(`/patients/requests/${id}/accept`)
      setRequests(prev => prev.filter(req => req.id !== id))
      window.dispatchEvent(new Event('soma:patient-requests-updated'))
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error al aceptar solicitud.')
    }
  }

  const handleReject = async (id) => {
    try {
      await api.post(`/patients/requests/${id}/reject`)
      setRequests(prev => prev.filter(req => req.id !== id))
      window.dispatchEvent(new Event('soma:patient-requests-updated'))
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error al rechazar solicitud.')
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
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
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
                    <button onClick={() => handleAccept(req.id)} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-800" title="Aceptar">
                      <Check size={18} />
                    </button>
                    <button onClick={() => handleReject(req.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-800" title="Rechazar">
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
