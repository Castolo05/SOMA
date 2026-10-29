// Código de invitación que llegó por enlace (?codigo=) antes de iniciar sesión.
// Se guarda en sessionStorage para que sobreviva al login, incluido el
// regreso desde Google, y se borra una vez cargado en el perfil del paciente.
const KEY = 'soma_pending_invite_code'

export const normalizeInviteCode = (value) => (value || '').trim().toUpperCase().slice(0, 8)

export function savePendingInvite(code) {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return
  try { sessionStorage.setItem(KEY, normalized) } catch { /* almacenamiento no disponible */ }
}

export function peekPendingInvite() {
  try { return sessionStorage.getItem(KEY) || '' } catch { return '' }
}

export const hasPendingInvite = () => !!peekPendingInvite()

export function clearPendingInvite() {
  try { sessionStorage.removeItem(KEY) } catch { /* almacenamiento no disponible */ }
}
