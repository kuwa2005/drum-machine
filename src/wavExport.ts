import { playDrumHit, setPreviewMasterLinearGain } from './drumAudio'
import type { Pattern } from './drumTypes'
import { INSTRUMENTS } from './drumTypes'
import type { TimeSignatureOption } from './timeSignature'
import { sixteenthNoteSeconds, totalStepsActive } from './timeSignature'

/**
 * 本アプリで書き出す WAV は CC0（パブリックドメイン寄与）とします。画面表示でもこの URL を明記してください。
 * @see https://creativecommons.org/publicdomain/zero/1.0/deed.ja
 */
export const WAV_EXPORT_CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/deed.ja'

const TAIL_SECONDS = 0.45
const EXPORT_SAMPLE_RATE = 44100
/** メモリ保護: 本体の長さ（テール除く）の上限（秒） */
const MAX_EXPORT_BODY_SECONDS = 600

function encodeWavMono16(buffer: AudioBuffer): ArrayBuffer {
  const ch0 = buffer.numberOfChannels > 0 ? buffer.getChannelData(0) : new Float32Array(0)
  const n = ch0.length
  const bytesPerSample = 2
  const blockAlign = 2
  const byteRate = Math.floor(buffer.sampleRate * blockAlign)
  const dataSize = n * bytesPerSample
  const out = new ArrayBuffer(44 + dataSize)
  const v = new DataView(out)
  let o = 0
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o++, s.charCodeAt(i))
  }
  const u32 = (x: number) => {
    v.setUint32(o, x, true)
    o += 4
  }
  const u16 = (x: number) => {
    v.setUint16(o, x, true)
    o += 2
  }
  writeStr('RIFF')
  u32(36 + dataSize)
  writeStr('WAVE')
  writeStr('fmt ')
  u32(16)
  u16(1)
  u16(1)
  u32(buffer.sampleRate)
  u32(byteRate)
  u16(blockAlign)
  u16(16)
  writeStr('data')
  u32(dataSize)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, ch0[i]))
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    o += 2
  }
  return out
}

export type RenderWavParams = {
  pattern: Pattern
  bpm: number
  sig: TimeSignatureOption
  repeatCount: number
  /** 先頭から何小節分をループ対象にするか（グリッドは常に 4 小節分でも、ここで長さを切る） */
  measureCount: number
  /** オフライン合成のマスター線形ゲイン（プレビューと同じ音圧段階に合わせる） */
  outputLinearGain: number
}

/** 現在のパターンを指定回数繰り返した単一トラック WAV（16bit PCM mono）を生成 */
export async function renderPatternToWavBlob(params: RenderWavParams): Promise<Blob> {
  const { pattern, bpm, sig, repeatCount, measureCount, outputLinearGain } = params
  const totalSteps = totalStepsActive(sig, measureCount)
  const loops = Math.max(1, Math.floor(repeatCount))
  const stepDur = sixteenthNoteSeconds(bpm, sig)
  const bodySec = loops * totalSteps * stepDur
  if (bodySec > MAX_EXPORT_BODY_SECONDS) {
    throw new Error(
      `WAV の長さが ${MAX_EXPORT_BODY_SECONDS} 秒を超えます。繰り返し回数を減らすか、テンポを上げてください。`,
    )
  }
  const durationSec = bodySec + TAIL_SECONDS
  const length = Math.max(1, Math.ceil(EXPORT_SAMPLE_RATE * durationSec))

  const ctx = new OfflineAudioContext(1, length, EXPORT_SAMPLE_RATE)
  setPreviewMasterLinearGain(ctx, outputLinearGain)
  const totalHits = loops * totalSteps

  for (let g = 0; g < totalHits; g++) {
    const t = g * stepDur
    const step = g % totalSteps
    for (const { id } of INSTRUMENTS) {
      if (pattern[id][step]) playDrumHit(ctx, id, t)
    }
  }

  const rendered = await ctx.startRendering()
  const wav = encodeWavMono16(rendered)
  return new Blob([wav], { type: 'audio/wav' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
