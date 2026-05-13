/** 16分音符1個を1ステップとしたときの1小節あたりのステップ数（分母は 2 / 4 / 8） */
export function stepsPerMeasure(numerator: number, denominator: 2 | 4 | 8): number {
  return Math.round((numerator * 16) / denominator)
}

export type MeterCategory = 'simple' | 'compound' | 'long'

export type TimeSignatureOption = {
  id: string
  label: string
  category: MeterCategory
  numerator: number
  denominator: 2 | 4 | 8
  /**
   * 16分グリッド上で拍の区切りを示す間隔（16分音符の個数）。
   * 単拍子の /4 は四分＝4、/8 は八分＝2、/2 は二分＝8。
   * 複拍子（6/8, 9/8, 12/8）は点々付き拍＝6。
   * ロングメーター系 /8 は八分拍子として 2。
   */
  beatStepSixteenths: number
}

/** セレクト「カスタム」用の識別子（プリセット拍子の id とは重ならない） */
export const CUSTOM_SIG_ID = '__custom__'

/** カスタム拍子の分子の範囲（分母は 2 / 4 / 8 のみ対応） */
export const CUSTOM_NUM_MIN = 1
export const CUSTOM_NUM_MAX = 32

/** カスタム時の主拍の取り方（複拍子は 8 拍子かつ分子が 3 の倍数のときのみ） */
export type CustomMeterFeel = 'simple' | 'compound'

export function buildCustomTimeSignature(
  numerator: number,
  denominator: 2 | 4 | 8,
  feel: CustomMeterFeel,
): TimeSignatureOption {
  const n = Math.max(CUSTOM_NUM_MIN, Math.min(CUSTOM_NUM_MAX, Math.floor(Number(numerator)) || 1))
  const d = denominator
  const canCompound = d === 8 && n % 3 === 0
  const useCompound = feel === 'compound' && canCompound

  let beatStepSixteenths: number
  let category: MeterCategory
  if (useCompound) {
    beatStepSixteenths = 6
    category = 'compound'
  } else {
    category = 'simple'
    if (d === 2) beatStepSixteenths = 8
    else if (d === 4) beatStepSixteenths = 4
    else beatStepSixteenths = 2
  }

  return {
    id: CUSTOM_SIG_ID,
    label: `${n}/${d}（カスタム）`,
    category,
    numerator: n,
    denominator: d,
    beatStepSixteenths,
  }
}

/** セレクトの optgroup 表示順 */
export const METER_CATEGORY_ORDER: MeterCategory[] = ['simple', 'compound', 'long']

export const METER_GROUP_LABELS: Record<MeterCategory, string> = {
  simple: '単拍子（simple）',
  compound: '複拍子（compound）',
  long: 'ロングメーター（奇数・混合）',
}

/**
 * 単拍子: 2・3・4拍子を中心（2/2 は alla breve）。
 * 複拍子: 6/8・9/8・12/8（点々付き拍）。
 * ロングメーター: 5・7・11・13 の八分系など。
 */
export const TIME_SIGNATURES: TimeSignatureOption[] = [
  // --- 単拍子 ---
  { id: '2/4', label: '2/4', category: 'simple', numerator: 2, denominator: 4, beatStepSixteenths: 4 },
  { id: '3/4', label: '3/4', category: 'simple', numerator: 3, denominator: 4, beatStepSixteenths: 4 },
  { id: '4/4', label: '4/4', category: 'simple', numerator: 4, denominator: 4, beatStepSixteenths: 4 },
  { id: '5/4', label: '5/4', category: 'simple', numerator: 5, denominator: 4, beatStepSixteenths: 4 },
  { id: '7/4', label: '7/4', category: 'simple', numerator: 7, denominator: 4, beatStepSixteenths: 4 },
  { id: '2/2', label: '2/2（alla breve）', category: 'simple', numerator: 2, denominator: 2, beatStepSixteenths: 8 },
  { id: '3/8', label: '3/8', category: 'simple', numerator: 3, denominator: 8, beatStepSixteenths: 2 },
  // --- 複拍子 ---
  { id: '6/8', label: '6/8', category: 'compound', numerator: 6, denominator: 8, beatStepSixteenths: 6 },
  { id: '9/8', label: '9/8', category: 'compound', numerator: 9, denominator: 8, beatStepSixteenths: 6 },
  { id: '12/8', label: '12/8', category: 'compound', numerator: 12, denominator: 8, beatStepSixteenths: 6 },
  // --- ロングメーター ---
  { id: '5/8', label: '5/8', category: 'long', numerator: 5, denominator: 8, beatStepSixteenths: 2 },
  { id: '7/8', label: '7/8', category: 'long', numerator: 7, denominator: 8, beatStepSixteenths: 2 },
  { id: '11/8', label: '11/8', category: 'long', numerator: 11, denominator: 8, beatStepSixteenths: 2 },
  { id: '13/8', label: '13/8', category: 'long', numerator: 13, denominator: 8, beatStepSixteenths: 2 },
]

/** 小節数の下限・上限（グリッドは常にこの上限ぶんの列を表示） */
export const MIN_MEASURES = 1
export const MAX_MEASURES = 4

/** 編集グリッドの列数（常に 4 小節分で固定） */
export function totalStepsForFixedGrid(sig: TimeSignatureOption): number {
  return stepsPerMeasure(sig.numerator, sig.denominator) * MAX_MEASURES
}

/** 再生・書き出しに使う有効ステップ数（先頭から measureCount 小節ぶん） */
export function totalStepsActive(sig: TimeSignatureOption, measureCount: number): number {
  const m = Math.max(MIN_MEASURES, Math.min(MAX_MEASURES, Math.floor(measureCount)))
  return stepsPerMeasure(sig.numerator, sig.denominator) * m
}

/** 1ステップ（16分音符）の長さ（秒）。BPM は四分音符のテンポ。 */
export function sixteenthNoteSeconds(bpm: number, sig: TimeSignatureOption): number {
  const quarter = 60 / bpm
  const measureSeconds = sig.numerator * quarter * (4 / sig.denominator)
  const spm = stepsPerMeasure(sig.numerator, sig.denominator)
  return measureSeconds / spm
}

/** 拍頭の視覚用: 16分音符ベースの間隔 */
export function beatStepWidth(sig: TimeSignatureOption): number {
  return sig.beatStepSixteenths
}

export function findSignatureById(id: string): TimeSignatureOption {
  return TIME_SIGNATURES.find((s) => s.id === id) ?? TIME_SIGNATURES.find((s) => s.id === '4/4')!
}
