import type { InstrumentId, Pattern } from './drumTypes'
import { emptyPattern } from './drumTypes'
import type { TimeSignatureOption } from './timeSignature'
import { MAX_MEASURES, MIN_MEASURES, stepsPerMeasure } from './timeSignature'

export type Preset = {
  id: string
  label: string
  build: (sig: TimeSignatureOption, measures: number) => Pattern
}

function clampMeasures(measures: number): number {
  return Math.max(MIN_MEASURES, Math.min(MAX_MEASURES, Math.floor(measures)))
}

function on(p: Pattern, inst: InstrumentId, step: number) {
  const row = p[inst]
  if (step >= 0 && step < row.length) row[step] = true
}

/** 1小節の16分ステップ数・主拍数・主拍あたりの16分長 */
function beatGrid(sig: TimeSignatureOption): { spm: number; mainBeats: number; bl: number } {
  const spm = stepsPerMeasure(sig.numerator, sig.denominator)
  if (sig.category === 'compound') {
    const mainBeats = sig.numerator / 3
    return { spm, mainBeats, bl: spm / mainBeats }
  }
  return { spm, mainBeats: sig.numerator, bl: spm / sig.numerator }
}

/** 8分音符相当の刻み（16分の連打密度。最小1） */
function hatStride(bl: number): number {
  return Math.max(1, Math.round(bl / 2))
}

/** 2・4拍子系のバックビート（スネア） */
function addBackbeatSnare(p: Pattern, o: number, bl: number, mainBeats: number): void {
  if (mainBeats >= 4) {
    on(p, 'snare', o + bl)
    on(p, 'snare', o + 3 * bl)
  } else if (mainBeats === 3) {
    on(p, 'snare', o + bl)
  } else if (mainBeats === 2) {
    on(p, 'snare', o + bl)
  } else {
    on(p, 'snare', o + bl)
    if (mainBeats >= 6) on(p, 'snare', o + (mainBeats - 2) * bl)
  }
}

/** ファンク: キック1拍＆3拍寄り、スネアは2と4、8分ハイハット */
function presetFunk(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)
  const hat = hatStride(bl)

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    on(p, 'kick', o)
    if (mainBeats >= 3) on(p, 'kick', o + 2 * bl)
    if (sig.category === 'compound') {
      on(p, 'snare', o + bl)
      if (mainBeats >= 3) on(p, 'snare', o + 2 * bl)
    } else {
      addBackbeatSnare(p, o, bl, mainBeats)
    }
    for (let i = 0; i < spm; i += hat) on(p, 'hihat', o + i)
  }
  return p
}

/** ロック: キック1・3（主拍が2なら1のみ）、定番バックビート、8分ハイハット */
function presetRock(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)
  const hat = hatStride(bl)

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    on(p, 'kick', o)
    if (mainBeats >= 4) on(p, 'kick', o + 2 * bl)
    if (sig.category === 'compound') {
      on(p, 'snare', o + bl)
    } else {
      addBackbeatSnare(p, o, bl, mainBeats)
    }
    for (let i = 0; i < spm; i += hat) on(p, 'hihat', o + i)
  }
  return p
}

/** ディスコ: 4 on the floor（主拍すべてキック）、バックビートにスネア、8分ハイハット */
function presetDisco(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)
  const hat = hatStride(bl)

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    for (let b = 0; b < mainBeats; b++) on(p, 'kick', o + b * bl)
    if (sig.category === 'compound') {
      on(p, 'snare', o + bl)
      if (mainBeats >= 4) on(p, 'snare', o + 3 * bl)
    } else {
      addBackbeatSnare(p, o, bl, mainBeats)
    }
    for (let i = 0; i < spm; i += hat) on(p, 'hihat', o + i)
  }
  return p
}

/** ハウス: 4 on the floor＋オフビート8分ハイハット（奇数16分） */
function presetHouse(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    for (let b = 0; b < mainBeats; b++) on(p, 'kick', o + b * bl)
    if (sig.category !== 'compound') addBackbeatSnare(p, o, bl, mainBeats)
    else {
      on(p, 'snare', o + bl)
      if (mainBeats >= 4) on(p, 'snare', o + 3 * bl)
    }
    for (let i = 1; i < spm; i += 2) on(p, 'hihat', o + i)
  }
  return p
}

/** テクノ: 四分のキック＋控えめなスネア＋16分に近いハット */
function presetTechno(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)
  const hat = Math.max(1, Math.round(bl / 4))

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    for (let b = 0; b < mainBeats; b += 1) {
      if (b % 2 === 0) on(p, 'kick', o + b * bl)
    }
    if (sig.category === 'compound') {
      if (mi % 2 === 1) on(p, 'snare', o + bl)
    } else if (mi % 2 === 1) {
      on(p, 'snare', o + Math.min(bl * 2, spm - 1))
    }
    for (let i = 0; i < spm; i += hat) on(p, 'hihat', o + i)
  }
  return p
}

/** バラード: キック1と3拍目、スネアは中拍、ハットは主拍のみ */
function presetBallad(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    on(p, 'kick', o)
    if (mainBeats >= 3) on(p, 'kick', o + 2 * bl)
    on(p, 'snare', o + Math.floor(((mainBeats - 1) * bl) / 2))
    for (let b = 0; b < mainBeats; b++) on(p, 'hihat', o + b * bl)
  }
  return p
}

/** ラテン系: 複拍子はシンプルクラーベ風、それ以外は前寄りキック＋オフビート8分ハット */
function presetLatin(sig: TimeSignatureOption, measures: number): Pattern {
  const m = clampMeasures(measures)
  const { spm, mainBeats, bl } = beatGrid(sig)
  const p = emptyPattern(spm * MAX_MEASURES)
  const hat = hatStride(bl)

  for (let mi = 0; mi < m; mi++) {
    const o = mi * spm
    if (sig.category === 'compound') {
      on(p, 'kick', o)
      on(p, 'kick', o + Math.floor(bl / 2))
      on(p, 'kick', o + bl)
      on(p, 'snare', o + Math.floor(1.5 * bl))
      for (let i = 0; i < spm; i += hat) on(p, 'hihat', o + i)
    } else {
      on(p, 'kick', o)
      if (mainBeats >= 3) on(p, 'kick', o + 2 * bl)
      on(p, 'snare', o + Math.floor(mainBeats * bl * 0.45))
      for (let i = 1; i < spm; i += hat) on(p, 'hihat', o + i)
    }
  }
  return p
}

export const PRESETS: Preset[] = [
  {
    id: 'empty',
    label: '空',
    build: (sig) => emptyPattern(stepsPerMeasure(sig.numerator, sig.denominator) * MAX_MEASURES),
  },
  {
    id: 'funk1',
    label: 'ファンク 1',
    build: (sig, measures) => presetFunk(sig, measures),
  },
  {
    id: 'rock',
    label: 'ロック',
    build: (sig, measures) => presetRock(sig, measures),
  },
  {
    id: 'disco',
    label: 'ディスコ',
    build: (sig, measures) => presetDisco(sig, measures),
  },
  {
    id: 'house',
    label: 'ハウス',
    build: (sig, measures) => presetHouse(sig, measures),
  },
  {
    id: 'techno',
    label: 'テクノ（ミニマル）',
    build: (sig, measures) => presetTechno(sig, measures),
  },
  {
    id: 'ballad',
    label: 'バラード',
    build: (sig, measures) => presetBallad(sig, measures),
  },
  {
    id: 'latin',
    label: 'ラテン POP',
    build: (sig, measures) => presetLatin(sig, measures),
  },
]
