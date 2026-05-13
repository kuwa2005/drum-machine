import type { InstrumentId } from './drumTypes'
import { readVolumeLevelFromCookie, volumeLevelToLinearGain } from './volumeLevel'

const previewMasterByContext = new WeakMap<BaseAudioContext, GainNode>()

function getPreviewMaster(ctx: BaseAudioContext): GainNode {
  let g = previewMasterByContext.get(ctx)
  if (!g) {
    g = ctx.createGain()
    g.gain.value = volumeLevelToLinearGain(readVolumeLevelFromCookie())
    g.connect(ctx.destination)
    previewMasterByContext.set(ctx, g)
  }
  return g
}

/** プレビュー再生の出力レベル（同一 AudioContext に対して共有の GainNode） */
export function setPreviewMasterLinearGain(ctx: BaseAudioContext, linear: number): void {
  const g = getPreviewMaster(ctx)
  const v = Math.max(0, Math.min(1, linear))
  g.gain.value = v
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function playNoise(
  ctx: BaseAudioContext,
  when: number,
  duration: number,
  gain: number,
  filterType: BiquadFilterType,
  freq: number,
  out: AudioNode,
): void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, duration + 0.02)
  const filt = ctx.createBiquadFilter()
  filt.type = filterType
  filt.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, when)
  g.gain.exponentialRampToValueAtTime(0.001, when + duration)
  src.connect(filt)
  filt.connect(g)
  g.connect(out)
  src.start(when)
  src.stop(when + duration + 0.05)
}

export function playDrumHit(ctx: BaseAudioContext, inst: InstrumentId, when: number): void {
  const t0 = when
  const out = getPreviewMaster(ctx)

  switch (inst) {
    case 'kick': {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, t0)
      osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12)
      g.gain.setValueAtTime(0.9, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.3)
      playNoise(ctx, t0, 0.04, 0.15, 'lowpass', 200, out)
      break
    }
    case 'snare': {
      playNoise(ctx, t0, 0.18, 0.55, 'highpass', 1800, out)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(200, t0)
      g.gain.setValueAtTime(0.35, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.1)
      break
    }
    case 'hihat':
      playNoise(ctx, t0, 0.05, 0.22, 'bandpass', 8000, out)
      break
    default:
      break
  }
}
