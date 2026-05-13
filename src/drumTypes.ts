export type InstrumentId = 'hihat' | 'snare' | 'kick'

export const INSTRUMENTS: { id: InstrumentId; label: string }[] = [
  { id: 'hihat', label: 'ハイハット' },
  { id: 'snare', label: 'スネアドラム' },
  { id: 'kick', label: 'バスドラム' },
]

export type Pattern = Record<InstrumentId, boolean[]>

export function emptyPattern(length: number): Pattern {
  const row = () => Array.from({ length }, () => false)
  return {
    hihat: row(),
    snare: row(),
    kick: row(),
  }
}

export function resizePattern(p: Pattern, newLen: number): Pattern {
  const next = emptyPattern(newLen)
  for (const inst of INSTRUMENTS) {
    const id = inst.id
    for (let i = 0; i < newLen; i++) {
      next[id][i] = p[id][i] ?? false
    }
  }
  return next
}

export function clonePattern(p: Pattern): Pattern {
  const out = {} as Pattern
  for (const { id } of INSTRUMENTS) {
    out[id] = [...p[id]]
  }
  return out
}
