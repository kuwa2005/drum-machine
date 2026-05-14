import type { InstrumentId } from './drumTypes'

const COOKIE_NAME = 'dm-kit-sound'
const COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

/** バスドラム系の音色プリセット */
export type KickVariant = 'standard' | 'deep' | 'punch'
/** スネア系 */
export type SnareVariant = 'standard' | 'tight' | 'ring' | 'metronome_click'
/** ハイハット系 */
export type HihatVariant = 'standard' | 'dark' | 'bright' | 'metronome_chime'

export const KICK_VARIANTS: KickVariant[] = ['standard', 'deep', 'punch']
export const SNARE_VARIANTS: SnareVariant[] = ['standard', 'tight', 'ring', 'metronome_click']
export const HIHAT_VARIANTS: HihatVariant[] = ['standard', 'dark', 'bright', 'metronome_chime']

export function kickVariantLabel(v: KickVariant): string {
  switch (v) {
    case 'standard':
      return 'スタンダード'
    case 'deep':
      return '低め・重め'
    case 'punch':
      return 'パンチ'
    default:
      return v
  }
}

export function snareVariantLabel(v: SnareVariant): string {
  switch (v) {
    case 'standard':
      return 'スタンダード'
    case 'tight':
      return 'タイト'
    case 'ring':
      return 'リング'
    case 'metronome_click':
      return 'カッ！（メトロ）'
    default:
      return v
  }
}

export function hihatVariantLabel(v: HihatVariant): string {
  switch (v) {
    case 'standard':
      return 'スタンダード'
    case 'dark':
      return 'ダーク'
    case 'bright':
      return 'ブライト'
    case 'metronome_chime':
      return 'チーン（メトロ）'
    default:
      return v
  }
}

export type KitSoundState = {
  kick: { variant: KickVariant; volume: number }
  snare: { variant: SnareVariant; volume: number }
  hihat: { variant: HihatVariant; volume: number }
}

export const DEFAULT_KIT_SOUND: KitSoundState = {
  kick: { variant: 'standard', volume: 1 },
  snare: { variant: 'standard', volume: 1 },
  hihat: { variant: 'standard', volume: 1 },
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n))
}

function isKickVariant(x: unknown): x is KickVariant {
  return x === 'standard' || x === 'deep' || x === 'punch'
}

function isSnareVariant(x: unknown): x is SnareVariant {
  return x === 'standard' || x === 'tight' || x === 'ring' || x === 'metronome_click'
}

function isHihatVariant(x: unknown): x is HihatVariant {
  return x === 'standard' || x === 'dark' || x === 'bright' || x === 'metronome_chime'
}

/** Cookie または不正値を既定値で正規化 */
export function normalizeKitSound(raw: unknown): KitSoundState {
  const base = { ...DEFAULT_KIT_SOUND }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>

  const kick = o.kick
  if (kick && typeof kick === 'object') {
    const k = kick as Record<string, unknown>
    if (isKickVariant(k.variant)) base.kick.variant = k.variant
    if (typeof k.volume === 'number') base.kick.volume = clamp01(k.volume)
  }

  const snare = o.snare
  if (snare && typeof snare === 'object') {
    const s = snare as Record<string, unknown>
    if (isSnareVariant(s.variant)) base.snare.variant = s.variant
    if (typeof s.volume === 'number') base.snare.volume = clamp01(s.volume)
  }

  const hihat = o.hihat
  if (hihat && typeof hihat === 'object') {
    const h = hihat as Record<string, unknown>
    if (isHihatVariant(h.variant)) base.hihat.variant = h.variant
    if (typeof h.volume === 'number') base.hihat.volume = clamp01(h.volume)
  }

  return base
}

function parseKitSoundCookie(): unknown {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|; )dm-kit-sound=([^;]*)(?:;|$)/)
  if (!m) return null
  try {
    return JSON.parse(decodeURIComponent(m[1]))
  } catch {
    return null
  }
}

export function readKitSoundFromCookie(): KitSoundState {
  return normalizeKitSound(parseKitSoundCookie())
}

export function writeKitSoundCookie(state: KitSoundState): void {
  if (typeof document === 'undefined') return
  const payload = encodeURIComponent(JSON.stringify(state))
  document.cookie = `${COOKIE_NAME}=${payload};path=/;max-age=${COOKIE_MAX_AGE_SEC};SameSite=Lax`
}

export function instrumentVariantOptions(id: InstrumentId): { id: string; label: string }[] {
  switch (id) {
    case 'kick':
      return KICK_VARIANTS.map((v) => ({ id: v, label: kickVariantLabel(v) }))
    case 'snare':
      return SNARE_VARIANTS.map((v) => ({ id: v, label: snareVariantLabel(v) }))
    case 'hihat':
      return HIHAT_VARIANTS.map((v) => ({ id: v, label: hihatVariantLabel(v) }))
    default:
      return []
  }
}

export function coerceKickVariant(s: string): KickVariant {
  return KICK_VARIANTS.includes(s as KickVariant) ? (s as KickVariant) : 'standard'
}

export function coerceSnareVariant(s: string): SnareVariant {
  return SNARE_VARIANTS.includes(s as SnareVariant) ? (s as SnareVariant) : 'standard'
}

export function coerceHihatVariant(s: string): HihatVariant {
  return HIHAT_VARIANTS.includes(s as HihatVariant) ? (s as HihatVariant) : 'standard'
}
