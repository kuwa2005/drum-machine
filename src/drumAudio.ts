import type { InstrumentId } from './drumTypes'
import type { HihatVariant, KickVariant, KitSoundState, SnareVariant } from './kitSound'
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

function playKick(ctx: BaseAudioContext, t0: number, out: AudioNode, variant: KickVariant, vol: number): void {
  const v = Math.max(0, Math.min(1, vol))
  switch (variant) {
    case 'deep': {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(95, t0)
      osc.frequency.exponentialRampToValueAtTime(32, t0 + 0.2)
      g.gain.setValueAtTime(1.0 * v, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.38)
      playNoise(ctx, t0, 0.055, 0.12 * v, 'lowpass', 160, out)
      break
    }
    case 'punch': {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(180, t0)
      osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.07)
      g.gain.setValueAtTime(0.78 * v, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.22)
      playNoise(ctx, t0, 0.028, 0.22 * v, 'lowpass', 250, out)
      break
    }
    case 'standard':
    default: {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, t0)
      osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12)
      g.gain.setValueAtTime(0.9 * v, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.3)
      playNoise(ctx, t0, 0.04, 0.15 * v, 'lowpass', 200, out)
      break
    }
  }
}

function playSnare(ctx: BaseAudioContext, t0: number, out: AudioNode, variant: SnareVariant, vol: number): void {
  const v = Math.max(0, Math.min(1, vol))
  switch (variant) {
    case 'metronome_chime': {
      /* 「チーン（メトロ）」— スネア行で鳴らす高めの余韻 */
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      osc1.type = 'sine'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(3520, t0)
      osc2.frequency.setValueAtTime(5280, t0)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.28 * v, t0 + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26)
      osc1.connect(g)
      osc2.connect(g)
      g.connect(out)
      osc1.start(t0)
      osc2.start(t0)
      osc1.stop(t0 + 0.29)
      osc2.stop(t0 + 0.29)
      playNoise(ctx, t0, 0.03, 0.1 * v, 'bandpass', 7200, out)
      break
    }
    case 'tight': {
      playNoise(ctx, t0, 0.12, 0.48 * v, 'highpass', 2500, out)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(220, t0)
      g.gain.setValueAtTime(0.3 * v, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.055)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.08)
      break
    }
    case 'ring': {
      playNoise(ctx, t0, 0.25, 0.52 * v, 'highpass', 1400, out)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(180, t0)
      g.gain.setValueAtTime(0.28 * v, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.16)
      break
    }
    case 'standard':
    default: {
      playNoise(ctx, t0, 0.18, 0.55 * v, 'highpass', 1800, out)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(200, t0)
      g.gain.setValueAtTime(0.35 * v, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.1)
      break
    }
  }
}

function playHihat(ctx: BaseAudioContext, t0: number, out: AudioNode, variant: HihatVariant, vol: number): void {
  const v = Math.max(0, Math.min(1, vol))
  /** ハイハットは帯域の関係で体感が小さくなりやすいため、他パーツよりゲインを上げる */
  const hv = v * 1.85
  switch (variant) {
    case 'metronome_click': {
      /* 「カッ！（メトロ）」— ハイハット行で鳴らす極短いクリック */
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1650, t0)
      osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.012)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.52 * hv, t0 + 0.0015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.035)
      playNoise(ctx, t0, 0.012, 0.42 * hv, 'bandpass', 2800, out)
      break
    }
    case 'dark':
      playNoise(ctx, t0, 0.065, 0.18 * hv, 'bandpass', 5500, out)
      break
    case 'bright':
      playNoise(ctx, t0, 0.04, 0.26 * hv, 'bandpass', 12000, out)
      break
    case 'standard':
    default:
      playNoise(ctx, t0, 0.05, 0.22 * hv, 'bandpass', 8000, out)
      break
  }
}

export function playDrumHit(ctx: BaseAudioContext, inst: InstrumentId, when: number, kit: KitSoundState): void {
  const t0 = when
  const out = getPreviewMaster(ctx)

  switch (inst) {
    case 'kick':
      playKick(ctx, t0, out, kit.kick.variant, kit.kick.volume)
      break
    case 'snare':
      playSnare(ctx, t0, out, kit.snare.variant, kit.snare.volume)
      break
    case 'hihat':
      playHihat(ctx, t0, out, kit.hihat.variant, kit.hihat.volume)
      break
    default:
      break
  }
}
