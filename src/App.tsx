import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { playDrumHit, setPreviewMasterLinearGain } from './drumAudio'
import type { InstrumentId, Pattern } from './drumTypes'
import { clonePattern, INSTRUMENTS, resizePattern } from './drumTypes'
import { PRESETS } from './presets'
import {
  beatStepWidth,
  buildCustomTimeSignature,
  CUSTOM_NUM_MAX,
  CUSTOM_NUM_MIN,
  CUSTOM_SIG_ID,
  findSignatureById,
  MAX_MEASURES,
  METER_CATEGORY_ORDER,
  METER_GROUP_LABELS,
  MIN_MEASURES,
  sixteenthNoteSeconds,
  stepsPerMeasure,
  TIME_SIGNATURES,
  totalStepsActive,
  totalStepsForFixedGrid,
  type CustomMeterFeel,
} from './timeSignature'
import { downloadBlob, renderPatternToWavBlob, WAV_EXPORT_CC0_URL } from './wavExport'
import { applyThemeToDocument, readThemeFromCookie, writeThemeCookie, type Theme } from './theme'
import {
  readVolumeLevelFromCookie,
  volumeLevelLabelJa,
  volumeLevelToLinearGain,
  writeVolumeLevelCookie,
  VOLUME_LEVEL_ORDER,
  type VolumeLevelId,
} from './volumeLevel'

const DEFAULT_SIG_ID = '4/4'
const EMPTY_PRESET = PRESETS[0]

/** 入力・セレクト共通 */
const field =
  'rounded-xl border border-zinc-200/90 bg-white px-2.5 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-white dark:focus:border-accent'

const selectField = `${field} w-full min-w-0 min-[52rem]:w-auto min-[52rem]:min-w-[7rem]`

/** 本文内リンク（ダークでは高輝度シアン） */
const linkClass =
  'font-semibold text-link underline decoration-link/50 underline-offset-[3px] transition hover:text-link-hover hover:decoration-link-hover/70 dark:text-sky-300 dark:decoration-sky-300/80 dark:hover:text-sky-200 dark:hover:decoration-sky-200'

function LogoWaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="currentColor" aria-hidden>
      <rect x="2" y="14" width="6" height="8" rx="2" />
      <rect x="12" y="6" width="6" height="16" rx="2" />
      <rect x="22" y="10" width="6" height="12" rx="2" />
      <rect x="32" y="4" width="6" height="16" rx="2" />
    </svg>
  )
}

function MiniWaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 14" fill="currentColor" aria-hidden>
      <rect x="1" y="8" width="4" height="6" rx="1" />
      <rect x="7" y="3" width="4" height="11" rx="1" />
      <rect x="13" y="6" width="4" height="8" rx="1" />
      <rect x="19" y="2" width="4" height="12" rx="1" />
    </svg>
  )
}

function ShieldLicenseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 1.75 17.25 4.6v5.65c0 3.65-2.4 7.05-7.25 9.25C5.15 17.3 2.75 13.9 2.75 10.25V4.6L10 1.75Z" />
    </svg>
  )
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      />
    </svg>
  )
}

function RowInstrumentIcon({ id }: { id: InstrumentId }) {
  const common = 'h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400'
  switch (id) {
    case 'hihat':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <ellipse cx="8" cy="5" rx="5" ry="1.8" />
          <path strokeLinecap="round" d="M8 6.8v6M5 10h6" />
        </svg>
      )
    case 'snare':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="8" cy="8" r="5" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'kick':
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <ellipse cx="8" cy="9" rx="5.5" ry="4" />
          <path strokeLinecap="round" d="M5 6.5c1.2-1.8 4.8-1.8 6 0" />
        </svg>
      )
    default:
      return null
  }
}

function PromoVisualizerBadge({ className }: { className?: string }) {
  return (
    <div
      className={`relative flex size-14 shrink-0 items-end justify-center gap-0.5 overflow-hidden rounded-full bg-gradient-to-br from-purple-600 via-violet-500 to-cyan-400 p-1.5 shadow-lg shadow-purple-500/25 ${className ?? ''}`}
      aria-hidden
    >
      <span className="inline-block w-1 rounded-sm bg-white/90" style={{ height: '35%' }} />
      <span className="inline-block w-1 rounded-sm bg-white/90" style={{ height: '65%' }} />
      <span className="inline-block w-1 rounded-sm bg-white/90" style={{ height: '50%' }} />
      <span className="inline-block w-1 rounded-sm bg-white/90" style={{ height: '80%' }} />
    </div>
  )
}

function cellOnClasses(id: InstrumentId): string {
  const glass = 'dm-step-on relative'
  switch (id) {
    case 'hihat':
      return `${glass} dm-step-on--hihat border-cyan-400/80 bg-gradient-to-br from-cyan-100/85 via-cyan-300/50 to-cyan-600/55 text-cyan-950 hover:brightness-110 dark:border-cyan-300/50 dark:from-cyan-400/40 dark:via-cyan-500/35 dark:to-cyan-900/55 dark:text-cyan-50`
    case 'snare':
      return `${glass} dm-step-on--snare border-purple-500/75 bg-gradient-to-br from-fuchsia-100/80 via-purple-400/45 to-purple-700/55 text-purple-950 hover:brightness-110 dark:border-purple-300/55 dark:from-purple-500/38 dark:via-fuchsia-600/32 dark:to-purple-950/55 dark:text-white`
    case 'kick':
      return `${glass} dm-step-on--kick border-lime-400/85 bg-gradient-to-br from-lime-100/85 via-lime-400/48 to-lime-600/52 text-lime-950 hover:brightness-110 dark:border-lime-300/55 dark:from-lime-400/42 dark:via-lime-500/35 dark:to-lime-900/52 dark:text-lime-50`
    default:
      return ''
  }
}

function cellInactiveOnClasses(id: InstrumentId): string {
  switch (id) {
    case 'hihat':
      return 'border-cyan-800/45 bg-cyan-900/30 dark:border-cyan-600/40 dark:bg-cyan-950/45'
    case 'snare':
      return 'border-purple-900/40 bg-purple-950/35 dark:border-purple-700/35 dark:bg-purple-950/50'
    case 'kick':
      return 'border-lime-800/40 bg-lime-950/30 dark:border-lime-700/35 dark:bg-lime-950/40'
    default:
      return ''
  }
}

export default function App() {
  const [sigId, setSigId] = useState(DEFAULT_SIG_ID)
  const [customNum, setCustomNum] = useState(4)
  const [customDen, setCustomDen] = useState<2 | 4 | 8>(4)
  const [customFeel, setCustomFeel] = useState<CustomMeterFeel>('simple')

  const sig = useMemo(() => {
    if (sigId === CUSTOM_SIG_ID) {
      return buildCustomTimeSignature(customNum, customDen, customFeel)
    }
    return findSignatureById(sigId)
  }, [sigId, customNum, customDen, customFeel])

  const [measureCount, setMeasureCount] = useState(MIN_MEASURES)
  const gridSteps = useMemo(() => totalStepsForFixedGrid(sig), [sig])
  const activeSteps = useMemo(() => totalStepsActive(sig, measureCount), [sig, measureCount])

  const [bpm, setBpm] = useState(110)
  const [pattern, setPattern] = useState<Pattern>(() =>
    EMPTY_PRESET.build(findSignatureById(DEFAULT_SIG_ID), MIN_MEASURES),
  )
  const [presetId, setPresetId] = useState('empty')
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState<number | null>(null)
  const [playheadLineX, setPlayheadLineX] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => readThemeFromCookie())
  const [volumeLevel, setVolumeLevel] = useState<VolumeLevelId>(() => readVolumeLevelFromCookie())
  const [lookaheadMs, setLookaheadMs] = useState(25)
  const [repeatCount, setRepeatCount] = useState(4)
  const [exportingWav, setExportingWav] = useState(false)

  const patternRef = useRef(pattern)
  const measureCountRef = useRef(measureCount)
  const patternGridRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const transportRafRef = useRef<number | null>(null)
  /** ループ先頭 0 を同一フレームで飛ばさないための 1 フレーム後追従 */
  const playheadSyncRafRef = useRef<number | null>(null)

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    measureCountRef.current = measureCount
  }, [measureCount])

  useLayoutEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  useEffect(() => {
    const ctx = audioRef.current
    if (!ctx) return
    setPreviewMasterLinearGain(ctx, volumeLevelToLinearGain(volumeLevel))
  }, [volumeLevel])

  useEffect(() => {
    if (sigId !== CUSTOM_SIG_ID) return
    if (customDen !== 8 || customNum % 3 !== 0) {
      // 複拍子が無効なときだけ単純拍に戻す（外部同期ではなく UI 整合）
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 拍子入力の即時補正
      setCustomFeel((f) => (f === 'compound' ? 'simple' : f))
    }
  }, [sigId, customDen, customNum])

  const getCtx = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new AudioContext()
    }
    return audioRef.current
  }, [])

  const stopPlayback = useCallback(() => {
    if (transportRafRef.current !== null) {
      cancelAnimationFrame(transportRafRef.current)
      transportRafRef.current = null
    }
    if (playheadSyncRafRef.current !== null) {
      cancelAnimationFrame(playheadSyncRafRef.current)
      playheadSyncRafRef.current = null
    }
    setPlaying(false)
    setPlayhead(null)
  }, [])

  useEffect(() => {
    return () => stopPlayback()
  }, [stopPlayback])

  useEffect(() => {
    // グリッド列数が変わったらパターン長を合わせる
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gridSteps への追従のみ
    setPattern((p) => resizePattern(p, gridSteps))
  }, [gridSteps])

  const addMeasure = () => {
    stopPlayback()
    setMeasureCount((n) => Math.min(MAX_MEASURES, n + 1))
  }

  const removeMeasure = () => {
    stopPlayback()
    setMeasureCount((n) => Math.max(MIN_MEASURES, n - 1))
  }

  const toggleStep = (inst: InstrumentId, step: number) => {
    if (step >= activeSteps) return
    setPattern((prev) => {
      const next = { ...prev, [inst]: [...prev[inst]] }
      next[inst][step] = !next[inst][step]
      setPresetId('empty')
      return next
    })
  }

  const clearPattern = () => {
    const empty = PRESETS[0].build(sig, measureCount)
    setPattern(empty)
    setPresetId('empty')
  }

  const applyPreset = (id: string) => {
    const pr = PRESETS.find((p) => p.id === id)
    if (!pr) return
    setPresetId(id)
    setPattern(pr.build(sig, measureCount))
  }

  useEffect(() => {
    if (!playing) return

    const ctx = getCtx()
    void ctx.resume()

    const stepDur = sixteenthNoteSeconds(bpm, sig)
    if (!(stepDur > 0)) return

    /* 再生開始の基準時刻（AudioContext）。壁時計の setInterval より UI・発音のズレが少ない */
    const anchorT = ctx.currentTime + 0.02
    const globalStepRef = { current: -1 }

    const runFrame = () => {
      const now = ctx.currentTime
      const loopLen = totalStepsActive(sig, measureCountRef.current)
      if (loopLen <= 0) return

      const n = Math.floor((now - anchorT) / stepDur)
      const pat = patternRef.current
      let advanced = false
      let hitStepZero = false

      while (globalStepRef.current < n) {
        globalStepRef.current += 1
        const s = globalStepRef.current % loopLen
        if (s === 0) hitStepZero = true
        const idealT = anchorT + globalStepRef.current * stepDur
        const when = Math.max(now, idealT) + lookaheadMs / 1000
        for (const { id } of INSTRUMENTS) {
          if (pat[id][s]) playDrumHit(ctx, id, when)
        }
        advanced = true
      }

      if (advanced) {
        const mod = globalStepRef.current % loopLen
        if (hitStepZero && mod !== 0) {
          if (playheadSyncRafRef.current !== null) {
            cancelAnimationFrame(playheadSyncRafRef.current)
          }
          setPlayhead(0)
          playheadSyncRafRef.current = requestAnimationFrame(() => {
            playheadSyncRafRef.current = null
            setPlayhead(globalStepRef.current % loopLen)
          })
        } else {
          if (playheadSyncRafRef.current !== null) {
            cancelAnimationFrame(playheadSyncRafRef.current)
            playheadSyncRafRef.current = null
          }
          setPlayhead(mod)
        }
      }
    }

    const pump = () => {
      runFrame()
      transportRafRef.current = requestAnimationFrame(pump)
    }

    runFrame()
    transportRafRef.current = requestAnimationFrame(pump)

    return () => {
      if (transportRafRef.current !== null) {
        cancelAnimationFrame(transportRafRef.current)
        transportRafRef.current = null
      }
      if (playheadSyncRafRef.current !== null) {
        cancelAnimationFrame(playheadSyncRafRef.current)
        playheadSyncRafRef.current = null
      }
    }
  }, [playing, bpm, sig, getCtx, lookaheadMs, stopPlayback])

  const togglePlay = async () => {
    if (playing) {
      stopPlayback()
      return
    }
    const ctx = getCtx()
    await ctx.resume()
    setPlayhead(0)
    setPlaying(true)
  }

  const handleExportWav = async () => {
    const loops = Math.max(1, Math.floor(repeatCount))
    setExportingWav(true)
    try {
      const blob = await renderPatternToWavBlob({
        pattern: clonePattern(patternRef.current),
        bpm,
        sig,
        repeatCount: loops,
        measureCount: measureCountRef.current,
        outputLinearGain: volumeLevelToLinearGain(volumeLevel),
      })
      const safeSig =
        sig.id === CUSTOM_SIG_ID ? `${sig.numerator}-${sig.denominator}` : sig.id.replace(/\//g, '-')
      downloadBlob(blob, `drum_${safeSig}_${bpm}bpm_x${loops}.wav`)
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'WAV の書き出しに失敗しました。'
      window.alert(msg)
    } finally {
      setExportingWav(false)
    }
  }

  const spm = stepsPerMeasure(sig.numerator, sig.denominator)
  const beatW = beatStepWidth(sig)

  const gridStyle = { '--dm-steps': String(gridSteps) } as CSSProperties

  const syncPlayheadLine = useCallback(() => {
    const grid = patternGridRef.current
    if (playhead === null || !grid) {
      setPlayheadLineX(null)
      return
    }
    const cell = grid.querySelector(`[data-dm-col="${playhead}"]`) as HTMLElement | null
    if (!cell) {
      setPlayheadLineX(null)
      return
    }
    const gridRect = grid.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const cs = getComputedStyle(grid)
    const gapPx = parseFloat(cs.columnGap || cs.gap) || 4
    /* 現在ステップ列の左端（1拍目先頭＝ステップ0の左）に合わせる */
    setPlayheadLineX(cellRect.left - gridRect.left - gapPx * 0.5 + 1.5)
  }, [playhead])

  useLayoutEffect(() => {
    syncPlayheadLine()
  }, [syncPlayheadLine, gridSteps, measureCount, playing, sig])

  useEffect(() => {
    const grid = patternGridRef.current
    if (!grid || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncPlayheadLine())
    ro.observe(grid)
    return () => ro.disconnect()
  }, [syncPlayheadLine])

  const pickTheme = (t: Theme) => {
    setTheme(t)
    writeThemeCookie(t)
  }

  const pickVolumeLevel = (level: VolumeLevelId) => {
    setVolumeLevel(level)
    writeVolumeLevelCookie(level)
    const ctx = audioRef.current
    if (ctx) setPreviewMasterLinearGain(ctx, volumeLevelToLinearGain(level))
  }

  return (
    <div
      className="box-border w-full max-w-full px-[max(0.75rem,env(safe-area-inset-left))] py-[max(0.75rem,env(safe-area-inset-top))] pe-[max(0.75rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] ps-[max(0.75rem,env(safe-area-inset-left))]"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-cyan-500 dark:text-cyan-400" aria-hidden>
            <LogoWaveIcon className="h-8 w-8" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">ドラムマシン</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="dm-ui-btn dm-ui-btn--icon flex size-9 touch-manipulation items-center justify-center rounded-full border border-zinc-200/90 bg-white text-sm font-bold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            title="使い方ガイド（準備中）"
            aria-label="使い方ガイド"
            onClick={() => window.alert('使い方ガイドは準備中です。')}
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => pickTheme('light')}
            aria-pressed={theme === 'light'}
            aria-label="ライトモード"
            className={`dm-ui-btn dm-ui-btn--icon flex size-9 touch-manipulation items-center justify-center rounded-full border shadow-sm transition ${
              theme === 'light'
                ? 'border-cyan-400 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-400/35 dark:bg-cyan-950/50 dark:text-cyan-200'
                : 'border-zinc-200/90 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            <IconSun className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => pickTheme('dark')}
            aria-pressed={theme === 'dark'}
            aria-label="ダークモード"
            className={`dm-ui-btn dm-ui-btn--icon flex size-9 touch-manipulation items-center justify-center rounded-full border shadow-sm transition ${
              theme === 'dark'
                ? 'border-purple-500/70 bg-purple-950/60 text-purple-200 ring-2 ring-purple-500/40'
                : 'border-zinc-200/90 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            <IconMoon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-3 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {sig.label}・編集は {measureCount}／{MAX_MEASURES} 小節・グリッドは常に {MAX_MEASURES} 小節分（{gridSteps}{' '}
        ステップ）・プレビュー再生は無限ループ（停止するまで）。WAV 書き出しは先頭 {activeSteps} ステップを{' '}
        {Math.max(1, Math.floor(repeatCount))} 回連結。再生中の編集は次のステップから反映されます。
      </p>

      <div className="rounded-3xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl shadow-zinc-900/[0.06] backdrop-blur-sm dark:border-zinc-700/55 dark:bg-zinc-900/50 dark:shadow-black/40 sm:p-5">
      <header
        className="mb-4 flex flex-col gap-2 min-[52rem]:flex-row min-[52rem]:flex-wrap min-[52rem]:items-center min-[52rem]:gap-x-2.5 min-[52rem]:gap-y-2"
        aria-label="操作"
      >
        <div className="flex min-w-0 flex-nowrap items-center gap-2 min-[52rem]:contents">
          <button
            type="button"
            className={`dm-ui-btn dm-ui-btn--play box-border flex size-14 min-h-14 min-w-14 shrink-0 touch-manipulation items-center justify-center rounded-full border-2 text-base font-semibold shadow-md transition ${
              playing ? 'dm-ui-btn--playing ' : ''
            } ${
              playing
                ? 'border-cyan-400/80 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/35 ring-2 ring-inset ring-cyan-300/40 dark:shadow-[0_0_24px_rgba(34,211,238,0.35)]'
                : 'border-sky-200/90 bg-gradient-to-br from-sky-100 to-cyan-200 text-sky-900 shadow-lg shadow-sky-300/25 hover:brightness-[1.02] dark:border-cyan-500/40 dark:from-cyan-950 dark:to-zinc-900 dark:text-cyan-100 dark:shadow-[0_0_20px_rgba(34,211,238,0.2)] dark:hover:brightness-110'
            }`}
            onClick={() => void togglePlay()}
            aria-label={playing ? '停止' : '再生'}
            title={playing ? '停止' : '再生'}
          >
            {playing ? '■' : '▶'}
          </button>
          <label className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-white">
            <span>BPM</span>
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || 90)}
              className={`${field} w-[4.5rem] tabular-nums`}
            />
          </label>
          <label className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-white">
            <span className="whitespace-nowrap">繰り返し</span>
            <input
              type="number"
              min={1}
              max={999}
              value={repeatCount}
              onChange={(e) => setRepeatCount(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
              title="WAV 書き出しのみ: 有効なパターンをこの回数だけ繰り返して 1 ファイルに連結します（プレビュー再生は無限ループ）"
              className={`${field} w-14 tabular-nums`}
            />
          </label>
        </div>

        <div className="grid w-full min-w-0 grid-cols-2 gap-2 min-[52rem]:contents min-[52rem]:w-auto">
          <label className="min-w-0">
            <span className="sr-only">プリセット</span>
            <select value={presetId} onChange={(e) => applyPreset(e.target.value)} className={selectField}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">拍子</span>
            <select
              value={sigId}
              onChange={(e) => {
                stopPlayback()
                setSigId(e.target.value)
              }}
              className={selectField}
            >
              {METER_CATEGORY_ORDER.map((cat) => (
                <optgroup key={cat} label={METER_GROUP_LABELS[cat]}>
                  {TIME_SIGNATURES.filter((t) => t.category === cat).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="カスタム">
                <option value={CUSTOM_SIG_ID}>分子・分母を指定…</option>
              </optgroup>
            </select>
          </label>
          {sigId === CUSTOM_SIG_ID ? (
            <div
              className="col-span-2 flex w-full min-w-0 flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-200/80 bg-accent-muted/40 px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800/50 min-[52rem]:col-span-1 min-[52rem]:w-auto min-[52rem]:flex-initial"
              role="group"
              aria-label="カスタム拍子"
            >
              <input
                className={`${field} w-12 shrink-0 tabular-nums`}
                type="number"
                min={CUSTOM_NUM_MIN}
                max={CUSTOM_NUM_MAX}
                value={customNum}
                onChange={(e) =>
                  setCustomNum(Math.max(CUSTOM_NUM_MIN, Math.min(CUSTOM_NUM_MAX, Number(e.target.value) || 1)))
                }
                title="分子（1〜32）"
                aria-label="分子"
              />
              <span className="text-sm font-medium text-zinc-500 dark:text-white" aria-hidden="true">
                /
              </span>
              <select
                className={`${field} min-w-0 shrink-0 text-xs`}
                value={customDen}
                onChange={(e) => setCustomDen(Number(e.target.value) as 2 | 4 | 8)}
                aria-label="分母"
                title="分母（2・4・8 のみ。グリッドは 16 分音符）"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
              </select>
              <select
                className={`${field} min-w-0 max-w-full flex-1 text-xs min-[52rem]:max-w-[14rem]`}
                value={customFeel}
                onChange={(e) => setCustomFeel(e.target.value as CustomMeterFeel)}
                disabled={customDen !== 8 || customNum % 3 !== 0}
                title={
                  customDen === 8 && customNum % 3 === 0
                    ? '主拍の刻み（複拍子は点々付き四分＝6 個の16分）'
                    : '複拍子にするには分母 8 かつ分子を 3 の倍数にしてください'
                }
                aria-label="主拍の取り方"
              >
                <option value="simple">通常の主拍</option>
                <option value="compound">複拍子（/8・分子が3の倍数）</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 min-[52rem]:contents">
          <button
            type="button"
            className={`dm-ui-btn dm-ui-btn--pill ${field} touch-manipulation px-3 py-2 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800`}
            onClick={() => setSettingsOpen(true)}
          >
            設定
          </button>
          <button
            type="button"
            className={`dm-ui-btn dm-ui-btn--pill ${field} touch-manipulation px-3 py-2 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800`}
            onClick={clearPattern}
          >
            消去
          </button>
          <button
            type="button"
            className="dm-ui-btn dm-ui-btn--wav flex min-w-0 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_0_20px_rgba(168,85,247,0.25)] dark:focus-visible:ring-offset-zinc-900 min-[52rem]:flex-none"
            disabled={exportingWav}
            title={`書き出した WAV は CC0（パブリックドメイン寄与）。${WAV_EXPORT_CC0_URL}`}
            onClick={() => void handleExportWav()}
          >
            <span className="dm-wav-bounce inline-flex shrink-0" aria-hidden>
              <MiniWaveIcon className="h-3.5 w-3.5 opacity-95" />
            </span>
            {exportingWav ? 'WAV 書き出し中…' : 'WAV を書き出し'}
          </button>
        </div>
      </header>

      <div className="flex flex-row items-stretch gap-2 max-[32rem]:flex-col max-[32rem]:gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-2 shadow-inner shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-950/40">
          <div ref={patternGridRef} className="dm-pattern-grid" style={gridStyle}>
            <div
              className="min-h-7 min-w-0 border-r border-zinc-200/90 pe-1 dark:border-zinc-600"
              aria-hidden
            />
            {Array.from({ length: gridSteps }, (_, s) => {
              const pos = s % spm
              const isMeasureStart = pos === 0
              const beatInMeasure = Math.floor(pos / beatW) + 1
              const showBeat = pos % beatW === 0
              const inactive = s >= activeSteps
              return (
                <div
                  key={s}
                  data-dm-col={s}
                  className={`relative box-border aspect-square min-h-0 min-w-0 rounded-lg border border-zinc-200/95 bg-zinc-200/90 dark:border-zinc-600 dark:bg-zinc-800/90 ${
                    isMeasureStart ? 'shadow-[inset_3px_0_0] shadow-zinc-400/80 dark:shadow-zinc-500/50' : ''
                  } ${inactive ? 'opacity-[0.16] saturate-[0.55] dark:opacity-[0.11]' : ''}`}
                >
                  {showBeat ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums tracking-tight text-zinc-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] dark:text-white dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                      {beatInMeasure}
                    </span>
                  ) : null}
                </div>
              )
            })}

            {INSTRUMENTS.map((row) => (
              <Fragment key={row.id}>
                <div
                  className="flex min-h-0 min-w-0 items-center gap-1 truncate border-r border-zinc-200/90 py-0.5 pe-1 ps-0 text-[0.62rem] font-semibold leading-tight text-zinc-800 dark:border-zinc-600 dark:text-white"
                  title={row.label}
                >
                  <RowInstrumentIcon id={row.id} />
                  <span className="min-w-0 truncate">{row.label}</span>
                </div>
                {Array.from({ length: gridSteps }, (_, s) => {
                  const pos = s % spm
                  const isMeasureStart = pos === 0
                  const on = pattern[row.id][s]
                  const inactive = s >= activeSteps
                  const offCell =
                    'dm-ui-step-off border-zinc-200/95 bg-white hover:brightness-[0.98] dark:border-zinc-600 dark:bg-zinc-800/90 dark:hover:brightness-110'
                  let tone = on ? cellOnClasses(row.id) : offCell
                  if (inactive && on) {
                    tone = `${cellInactiveOnClasses(row.id)} opacity-[0.3] grayscale contrast-75`
                  }
                  if (inactive && !on) {
                    tone = `${offCell} opacity-[0.12] saturate-50 dark:opacity-[0.09]`
                  }
                  return (
                    <button
                      key={`${row.id}-${s}`}
                      type="button"
                      className={`aspect-square min-h-0 min-w-0 touch-manipulation rounded-lg border p-0 transition focus:outline-none ${tone} ${
                        isMeasureStart ? 'shadow-[inset_3px_0_0] shadow-zinc-300 dark:shadow-zinc-600' : ''
                      } ${inactive ? 'pointer-events-none cursor-not-allowed' : ''}`}
                      aria-pressed={on}
                      disabled={inactive}
                      tabIndex={inactive ? -1 : 0}
                      onClick={() => toggleStep(row.id, s)}
                    />
                  )
                })}
              </Fragment>
            ))}
            {playhead !== null && playheadLineX !== null ? (
              <div aria-hidden className="dm-playhead-line" style={{ left: playheadLineX }} />
            ) : null}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col justify-center gap-1.5 max-[32rem]:flex-row max-[32rem]:justify-end"
          role="group"
          aria-label="小節の追加と削除"
        >
          <button
            type="button"
            className="dm-ui-btn dm-ui-btn--square flex size-10 touch-manipulation items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-xl leading-none text-accent shadow-sm transition hover:border-accent hover:bg-accent-muted dark:border-zinc-600 dark:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 [@media(pointer:coarse)]:size-11"
            onClick={addMeasure}
            disabled={measureCount >= MAX_MEASURES}
            aria-label="小節を追加"
            title="有効な小節を 1 つ追加（最大 4）"
          >
            ＋
          </button>
          <button
            type="button"
            className="dm-ui-btn dm-ui-btn--square flex size-10 touch-manipulation items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-xl leading-none text-rose-600 shadow-sm transition hover:border-rose-400 hover:bg-rose-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-rose-400 dark:hover:border-rose-500 dark:hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40 [@media(pointer:coarse)]:size-11"
            onClick={removeMeasure}
            disabled={measureCount <= MIN_MEASURES}
            aria-label="小節を削除"
            title="有効な小節を 1 つ減らす（最低 1）"
          >
            −
          </button>
        </div>
      </div>
      </div>

      <div className="mt-4 w-full space-y-2.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
        <p className="flex w-full items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-cyan-500 dark:text-cyan-400" aria-hidden>
            <LogoWaveIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">再生・パターン編集・WAV の書き出しまで、処理はすべてこのブラウザ内（クライアント側）で行われます。</span>
        </p>
        <p className="flex w-full items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-purple-500 dark:text-purple-400" aria-hidden>
            <ShieldLicenseIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">ドラムパターンや生成した音声データはサーバーに送信されません。</span>
        </p>
        <p className="flex w-full items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden>
            <ShieldLicenseIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            書き出した WAV ファイルのライセンス:{' '}
            <a
              href={WAV_EXPORT_CC0_URL}
              target="_blank"
              rel="noopener noreferrer"
              hrefLang="ja"
              lang="ja"
              className={linkClass}
            >
              CC0 1.0 Universal（パブリックドメイン寄与）
            </a>
          </span>
        </p>
      </div>

      <aside
        className="mt-8 flex w-full flex-col gap-4 rounded-2xl border border-transparent bg-gradient-to-r from-sky-50/90 via-white to-purple-50/90 p-4 shadow-md ring-1 ring-purple-200/40 dark:from-purple-950/25 dark:via-zinc-900/80 dark:to-cyan-950/20 dark:ring-purple-500/25 sm:flex-row sm:items-center sm:gap-5"
        aria-label="紹介"
      >
        <PromoVisualizerBadge />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
            MP3と静止画像からスペアナ付きMP4動画に変換できる Music Waves Visualizer(改)
          </p>
          <a
            href="https://lil.la/visualizer"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`mt-1 inline-block text-sm ${linkClass}`}
          >
            https://lil.la/visualizer
          </a>
        </div>
        <a
          href="https://lil.la/visualizer"
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="dm-ui-btn dm-ui-btn--pill inline-flex shrink-0 touch-manipulation items-center justify-center gap-1.5 self-stretch rounded-xl border-2 border-sky-500 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 dark:border-cyan-400/80 dark:bg-zinc-800 dark:text-cyan-100 dark:hover:bg-zinc-700 sm:self-center"
        >
          詳細を見る
          <span aria-hidden>→</span>
        </a>
      </aside>

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dm-set-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm dark:bg-black/55"
            aria-label="閉じる"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative z-10 max-h-[min(90dvh,calc(100svh-2rem))] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-6 shadow-2xl shadow-zinc-900/15 dark:border-zinc-700 dark:bg-zinc-900/95 dark:shadow-black/40">
            <h2 id="dm-set-title" className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              設定
            </h2>
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-white">表示モード</p>
              <div className="flex gap-2" role="group" aria-label="表示モード">
                <button
                  type="button"
                  onClick={() => pickTheme('light')}
                  aria-pressed={theme === 'light'}
                  className={`dm-ui-btn dm-ui-btn--pill min-h-11 flex-1 touch-manipulation rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    theme === 'light'
                      ? 'border-accent bg-accent-muted text-zinc-900 shadow-sm ring-2 ring-accent ring-offset-2 ring-offset-white dark:text-white dark:ring-offset-zinc-900'
                      : `border-zinc-200/90 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-white dark:hover:bg-zinc-800`
                  }`}
                >
                  ライト
                </button>
                <button
                  type="button"
                  onClick={() => pickTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className={`dm-ui-btn dm-ui-btn--pill min-h-11 flex-1 touch-manipulation rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    theme === 'dark'
                      ? 'border-accent bg-accent-muted text-zinc-900 shadow-sm ring-2 ring-accent ring-offset-2 ring-offset-white dark:text-white dark:ring-offset-zinc-900'
                      : `border-zinc-200/90 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-white dark:hover:bg-zinc-800`
                  }`}
                >
                  ダーク
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-white">
                選択したモードは Cookie に保存され、次回アクセス時も同じ表示になります（未設定のときは OS の外観設定に従います）。
              </p>
            </div>
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-white">音圧（プレビュー・WAV）</p>
              <div className="flex gap-2" role="group" aria-label="音圧">
                {VOLUME_LEVEL_ORDER.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => pickVolumeLevel(lvl)}
                    aria-pressed={volumeLevel === lvl}
                    className={`dm-ui-btn dm-ui-btn--pill min-h-11 flex-1 touch-manipulation rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                      volumeLevel === lvl
                        ? 'border-accent bg-accent-muted text-zinc-900 shadow-sm ring-2 ring-accent ring-offset-2 ring-offset-white dark:text-white dark:ring-offset-zinc-900'
                        : `border-zinc-200/90 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-white dark:hover:bg-zinc-800`
                    }`}
                  >
                    {volumeLevelLabelJa(lvl)}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-white">
                「高」でも同時に鳴る音の合算で割れにくいよう控えめにしています。選択は Cookie（
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.7rem] dark:bg-zinc-800">dm-volume</code>
                ）に保存されます。
              </p>
            </div>
            <label className="mb-2 flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-white">
              発音の先読み（ms）
              <input
                type="number"
                min={5}
                max={120}
                value={lookaheadMs}
                onChange={(e) => setLookaheadMs(Number(e.target.value) || 25)}
                className={`${field} max-w-[8rem] tabular-nums`}
              />
            </label>
            <p className="mb-3 text-xs leading-relaxed text-zinc-600 dark:text-white">
              タイミングのズレを感じたら値を少し変えてください。初期は 25ms です。
            </p>
            <p className="mb-3 text-xs leading-relaxed text-zinc-600 dark:text-white">
              WAV は 44.1kHz・16bit・モノラルで、書き出し開始時点のパターンをオフライン合成します。
            </p>
            <p className="mb-4 text-xs leading-relaxed text-zinc-600 dark:text-white">
              書き出した WAV のライセンスは CC0 1.0 Universal（著作権の行使を可能な限り放棄・パブリックドメイン寄与）です。詳細は{' '}
              <a
                href={WAV_EXPORT_CC0_URL}
                target="_blank"
                rel="noopener noreferrer"
                hrefLang="ja"
                lang="ja"
                className={linkClass}
              >
                {WAV_EXPORT_CC0_URL}
              </a>{' '}
              を参照してください。
            </p>
            <button
              type="button"
              className={`dm-ui-btn dm-ui-btn--pill ${field} w-full touch-manipulation py-2.5 text-center font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800`}
              onClick={() => setSettingsOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
