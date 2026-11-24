import { useState } from 'react'
import { Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'

// Enlace que abre el perfil del paciente con el código ya cargado.
export const inviteLink = (code) => `${window.location.origin}/patient/profile?codigo=${encodeURIComponent(code)}`

const formatExpiry = (iso) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// expiresAt: cuándo vence el código (se renueva solo). onRegenerate: revoca el
// actual y genera otro de inmediato (por ejemplo si se compartió por error).
export default function InviteCodeCard({ code, expiresAt, onRegenerate, compact = false }) {
  const { showError } = useToast()
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  if (!code) return null

  const regenerate = async () => {
    setRegenerating(true)
    try {
      await onRegenerate()
    } catch {
      showError('No se pudo renovar el código. Intentá de nuevo.')
    } finally {
      setRegenerating(false)
    }
  }

  const message = `Vinculate conmigo en SOMA: en Mi Perfil ingresá el código ${code} o abrí ${inviteLink(code)}`

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showError('No se pudo copiar. Seleccioná el código y copialo a mano.')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SOMA', text: message })
      } catch (err) {
        // Cancelar el diálogo de compartir no es un error.
        if (err?.name !== 'AbortError') showError('No se pudo compartir el código.')
      }
      return
    }
    copy(message)
  }

  const buttonCls = 'p-1.5 rounded-lg text-pro-500 hover:text-pro-700 hover:bg-pro-100 dark:hover:bg-pro-900/40 transition-colors'

  return (
    <div className={`bg-pro-50 dark:bg-pro-900/20 border border-pro-100 dark:border-pro-800 rounded-xl ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
      <div className="text-xs font-bold text-pro-400 mb-0.5">Código de invitación</div>
      <div className="flex items-center gap-2">
        <span className={`flex-1 font-mono font-bold text-pro-700 dark:text-pro-300 tracking-widest select-all ${compact ? 'text-sm' : 'text-lg'}`}>{code}</span>
        <button type="button" onClick={() => copy(code)} aria-label="Copiar código de invitación" title="Copiar código" className={buttonCls}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
        <button type="button" onClick={share} aria-label="Compartir invitación" title="Compartir invitación" className={buttonCls}>
          <Share2 size={15} />
        </button>
        {onRegenerate && (
          <button type="button" onClick={regenerate} disabled={regenerating} aria-label="Generar un código nuevo" title="Generar un código nuevo" className={buttonCls}>
            <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      <span role="status" className="sr-only">{copied ? 'Copiado' : ''}</span>
      {!compact && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Compartilo con tus pacientes: lo ingresan en Mi Perfil y te llega la solicitud.
          {expiresAt && ` Se renueva solo el ${formatExpiry(expiresAt)}; quienes ya se vincularon no necesitan ingresarlo de nuevo.`}
        </p>
      )}
    </div>
  )
}
