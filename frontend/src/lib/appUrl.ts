export const RESET_PATH = '/reset-password'
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
 * Local preview → localhost. Production → public site.
 * Both URLs must be in Supabase Auth Redirect URLs.
 */
export function getAuthEmailOrigin(): string {
  if (isLocalHost(window.location.hostname)) {
    return normalizeOrigin(window.location.origin)
  }
  return envAppUrl() ?? PRODUCTION_URL
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
