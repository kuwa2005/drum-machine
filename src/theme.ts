export type Theme = 'light' | 'dark'

const COOKIE_NAME = 'dm-theme'
const COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

function parseThemeCookie(): Theme | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=(light|dark)(?:;|$)`))
  if (!m) return null
  return m[1] === 'dark' ? 'dark' : 'light'
}

/** Cookie が無いときは OS のダーク設定に合わせる */
export function readThemeFromCookie(): Theme {
  const fromCookie = parseThemeCookie()
  if (fromCookie) return fromCookie
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function writeThemeCookie(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${theme};path=/;max-age=${COOKIE_MAX_AGE_SEC};SameSite=Lax`
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
