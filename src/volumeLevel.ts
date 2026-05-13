export type VolumeLevelId = 'low' | 'mid' | 'high'

const COOKIE_NAME = 'dm-volume'
const COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

/** プレビュー／WAV 共通の線形ゲイン（同時発音の頭打ちを避け、高でも割れにくい値） */
export function volumeLevelToLinearGain(level: VolumeLevelId): number {
  switch (level) {
    case 'low':
      return 0.38
    case 'mid':
      return 0.62
    case 'high':
      return 0.86
    default:
      return 0.62
  }
}

function parseVolumeCookie(): VolumeLevelId | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=(low|mid|high)(?:;|$)`))
  if (!m) return null
  const v = m[1]
  if (v === 'low' || v === 'mid' || v === 'high') return v
  return null
}

export function readVolumeLevelFromCookie(): VolumeLevelId {
  return parseVolumeCookie() ?? 'mid'
}

export function writeVolumeLevelCookie(level: VolumeLevelId): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${level};path=/;max-age=${COOKIE_MAX_AGE_SEC};SameSite=Lax`
}

export const VOLUME_LEVEL_ORDER: VolumeLevelId[] = ['low', 'mid', 'high']

export function volumeLevelLabelJa(level: VolumeLevelId): string {
  switch (level) {
    case 'low':
      return '低'
    case 'mid':
      return '中'
    case 'high':
      return '高'
    default:
      return '中'
  }
}
