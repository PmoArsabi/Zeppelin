const RESET_PATH = '/reset-password'
const PRODUCTION_URL = 'https://viajes-zeppelin.vercel.app'

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function envAppUrl(): string | undefined {
  const raw = import.meta.env.VITE_APP_URL
  if (typeof raw !== 'string') return undefined
  const trimmed = normalizeOrigin(raw)
  return trimmed || undefined
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/**
 * Origin used in auth emails (recovery / invite).
 * Never send localhost: recovery links must open the public site.
 */
export function getAuthEmailOrigin(): string {
  const configured = envAppUrl()
  if (configured) return configured
  if (isLocalHost(window.location.hostname)) return PRODUCTION_URL
  return normalizeOrigin(window.location.origin)
}

export function isPasswordRecoveryReturn(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.pathname === RESET_PATH) return true
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  return hash.get('type') === 'recovery' || query.get('type') === 'recovery'
}

export function leaveResetPasswordPath() {
  if (window.location.pathname === RESET_PATH || window.location.hash || window.location.search) {
    window.history.replaceState({}, '', '/')
  }
}
