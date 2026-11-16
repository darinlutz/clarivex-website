'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Play, RotateCcw, Square } from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  PRESETS,
  SAMPLE_RATE,
  WAVEFORMS,
  type BeepSettings,
  beepFrequencies,
  clampSetting,
  encodeWav,
  generateSamples,
  matchPreset,
  parseSettings,
  samplesIn,
  totalDurationMs,
  waveValue,
  wavFileName,
} from '@/lib/beepGenerator';

const STORAGE_KEY = 'clarivex:beep-generator:settings';

// Last-used settings from this browser, validated; defaults when there are
// none, they're malformed, or storage is blocked. The tab only mounts after a
// click, never during server rendering, so reading storage here is safe.
function loadSettings(): BeepSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return parseSettings(JSON.parse(raw)) ?? DEFAULT_SETTINGS;
  } catch {
    // Unavailable storage or bad JSON: start from the defaults
  }
  return DEFAULT_SETTINGS;
}

// e.g. "Beeps: 880 → 930 → 980 → 1030 Hz", or how to use the control
function stepHint(settings: BeepSettings): string {
  if (settings.frequencyStep === 0) {
    return 'Every beep has the same pitch. A positive value raises each beep after the first; negative lowers it.';
  }
  if (settings.count === 1) return 'Takes effect from the second beep.';
  const { min, max } = LIMITS.frequency;
  const last = settings.frequency + (settings.count - 1) * settings.frequencyStep;
  const note = last > max || last < min ? ` (held at the ${last > max ? max : min} Hz limit)` : '';
  return `Beeps: ${beepFrequencies(settings).join(' → ')} Hz${note}`;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

const WAVE_COLOR = '#0ea5e9'; // powder-500
const BEEP_SHADE = '#f0f9ff'; // powder-50
const AXIS_COLOR = '#cbd5e1'; // slate-300
const CANVAS_HEIGHT = 128;

// Sizes a canvas to its box at the screen's pixel density and returns a 2D
// context drawing in CSS pixels
function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, width, height);
  return g;
}

// Whole sequence: beeps (shaded) and silences, drawn from the actual samples
// as a min/max envelope per pixel column, like an audio editor
function drawTimeline(canvas: HTMLCanvasElement, width: number, samples: Int16Array, settings: BeepSettings) {
  const g = prepareCanvas(canvas, width, CANVAS_HEIGHT);
  if (!g || samples.length === 0) return;
  const mid = CANVAS_HEIGHT / 2;
  const scale = (CANVAS_HEIGHT / 2 - 4) / 32767;
  const n = samples.length;
  const beepN = samplesIn(settings.durationMs, SAMPLE_RATE);
  const gapN = samplesIn(settings.gapMs, SAMPLE_RATE);

  g.fillStyle = BEEP_SHADE;
  for (let k = 0; k < settings.count; k++) {
    g.fillRect((k * (beepN + gapN) * width) / n, 0, Math.max(1, (beepN * width) / n), CANVAS_HEIGHT);
  }
  g.fillStyle = AXIS_COLOR;
  g.fillRect(0, mid - 0.5, width, 1);

  g.fillStyle = WAVE_COLOR;
  const perColumn = n / width;
  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * perColumn);
    const end = Math.min(n, Math.max(start + 1, Math.floor((x + 1) * perColumn)));
    let lo = 0;
    let hi = 0;
    for (let i = start; i < end; i++) {
      const s = samples[i];
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    if (lo === 0 && hi === 0) continue;
    g.fillRect(x, mid - hi * scale, 1, Math.max(1, (hi - lo) * scale));
  }
}

const SHAPE_CYCLES = 3;

// A close-up of three cycles of the selected waveform at the selected volume
function drawShape(canvas: HTMLCanvasElement, width: number, settings: BeepSettings) {
  const g = prepareCanvas(canvas, width, CANVAS_HEIGHT);
  if (!g) return;
  const mid = CANVAS_HEIGHT / 2;
  const full = CANVAS_HEIGHT / 2 - 6;

  g.fillStyle = AXIS_COLOR;
  g.fillRect(0, mid - 0.5, width, 1);
  g.setLineDash([3, 4]);
  g.strokeStyle = AXIS_COLOR;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, mid - full);
  g.lineTo(width, mid - full);
  g.moveTo(0, mid + full);
  g.lineTo(width, mid + full);
  g.stroke();
  g.setLineDash([]);

  const amplitude = (settings.volume / 100) * full;
  g.strokeStyle = WAVE_COLOR;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.beginPath();
  for (let x = 0; x <= width; x++) {
    const phase = ((x / width) * SHAPE_CYCLES) % 1;
    const y = mid - waveValue(settings.waveform, phase) * amplitude;
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

// Width of an element, kept up to date as it resizes
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type SliderFieldProps = {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
};

// Slider plus a number box showing the exact value. Typing a value in range
// moves the slider straight away; anything else is clamped when the box loses
// focus.
function SliderField({ id, label, unit, value, min, max, onChange, hint }: SliderFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    if (draft !== null && draft.trim() !== '') {
      const number = Number(draft);
      if (Number.isFinite(number)) onChange(Math.min(max, Math.max(min, Math.round(number))));
    }
    setDraft(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label htmlFor={id} className="text-sm font-medium text-dark-blue">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            aria-label={`${label} (${unit})`}
            min={min}
            max={max}
            step={1}
            value={draft ?? String(value)}
            onFocus={() => setDraft(String(value))}
            onChange={(e) => {
              setDraft(e.target.value);
              const number = Number(e.target.value);
              if (e.target.value.trim() !== '' && Number.isInteger(number) && number >= min && number <= max) {
                onChange(number);
              }
            }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-md text-right text-dark-blue text-sm tabular-nums focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500"
          />
          <span className="w-6 text-sm text-slate-500">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-powder-600 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

// Sandbox tab: configure a beep sequence, hear it instantly (Web Audio, no
// server request), see it, and download it as a WAV. Settings are remembered
// in this browser.
export default function BeepGenerator() {
  const [settings, setSettings] = useState<BeepSettings>(loadSettings);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const playIdRef = useRef(0);
  const playheadRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);

  const [timelineBox, timelineWidth] = useWidth<HTMLDivElement>();
  const [shapeBox, shapeWidth] = useWidth<HTMLDivElement>();
  const timelineCanvas = useRef<HTMLCanvasElement>(null);
  const shapeCanvas = useRef<HTMLCanvasElement>(null);

  // Drawing lags behind fast slider drags rather than holding them up
  const shown = useDeferredValue(settings);
  const samples = useMemo(() => generateSamples(shown), [shown]);
  const totalMs = totalDurationMs(settings);
  const presetId = matchPreset(settings) ?? 'custom';

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable (private mode, quota, blocked): settings just aren't remembered
    }
  }, [settings]);

  useEffect(() => {
    if (timelineCanvas.current && timelineWidth > 0) {
      drawTimeline(timelineCanvas.current, timelineWidth, samples, shown);
    }
  }, [samples, shown, timelineWidth]);

  useEffect(() => {
    if (shapeCanvas.current && shapeWidth > 0) drawShape(shapeCanvas.current, shapeWidth, shown);
  }, [shown, shapeWidth]);

  // Stops whatever is playing; settings are left alone
  const stop = useCallback(() => {
    playIdRef.current++; // cancels a Play still waiting for the audio context
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const source = sourceRef.current;
    sourceRef.current = null;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped
      }
      source.disconnect();
    }
    setPlaying(false);
  }, []);

  // Leaving the tab or the page stops the sound and releases the audio device
  useEffect(
    () => () => {
      stop();
      contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    },
    [stop],
  );

  const play = async () => {
    stop();
    setError('');
    const playId = playIdRef.current;

    const AudioContextClass = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextClass) {
      setError("This browser doesn't support the Web Audio API, so it can't play the beeps. Try Download WAV.");
      return;
    }

    let context = contextRef.current;
    try {
      if (!context || context.state === 'closed') {
        context = new AudioContextClass();
        contextRef.current = context;
      }
      // Browsers start audio suspended until a click; this is that click
      if (context.state !== 'running') await context.resume();
    } catch {
      setError("The browser wouldn't start audio. Check that this site isn't muted, then press Play again.");
      return;
    }
    if (playId !== playIdRef.current) return; // Stop or another Play happened meanwhile
    if (context.state !== 'running') {
      setError('The browser blocked audio playback. Press Play again to allow it.');
      return;
    }

    const pcm = generateSamples(settings);
    if (pcm.length === 0) return;
    // Same samples as the WAV download; the browser resamples to the device rate
    const buffer = context.createBuffer(1, pcm.length, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (sourceRef.current === source) stop();
    };
    const startAt = context.currentTime + 0.02;
    const durationSec = pcm.length / SAMPLE_RATE;
    source.start(startAt);
    sourceRef.current = source;
    setPlaying(true);

    // Move the playhead without re-rendering the component every frame
    const tick = () => {
      const elapsed = Math.min(durationSec, Math.max(0, context.currentTime - startAt));
      if (playheadRef.current) playheadRef.current.style.left = `${(elapsed / durationSec) * 100}%`;
      if (elapsedRef.current) elapsedRef.current.textContent = formatDuration(elapsed * 1000);
      frameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const download = () => {
    const blob = new Blob([encodeWav(generateSamples(settings))], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = wavFileName(settings);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Changing anything stops playback, since the sound playing no longer matches
  const update = (next: BeepSettings) => {
    if (sourceRef.current) stop();
    setSettings(next);
  };
  const setNumber = (key: Exclude<keyof BeepSettings, 'waveform'>, value: number) =>
    update({ ...settings, [key]: clampSetting(key, value) });

  return (
    <div className="space-y-8">
      {/* Presets */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label htmlFor="beep-preset" className="block text-sm font-medium text-dark-blue mb-2">
            Preset
          </label>
          <select
            id="beep-preset"
            value={presetId}
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.id === e.target.value);
              if (preset) update(preset.settings);
            }}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500"
          >
            <option value="custom" disabled>
              Custom
            </option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} ({preset.settings.frequency} Hz, {preset.settings.count}×{preset.settings.durationMs} ms)
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => update(DEFAULT_SETTINGS)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-dark-blue font-semibold rounded-lg hover:border-powder-500 hover:text-powder-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" aria-hidden />
          Reset to Defaults
        </button>
      </div>

      {/* Sliders */}
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        <SliderField
          id="beep-frequency"
          label="Frequency / Pitch"
          unit="Hz"
          value={settings.frequency}
          {...LIMITS.frequency}
          onChange={(v) => setNumber('frequency', v)}
        />
        <SliderField
          id="beep-frequency-step"
          label="Change subsequent beep frequency"
          unit="Hz"
          value={settings.frequencyStep}
          {...LIMITS.frequencyStep}
          onChange={(v) => setNumber('frequencyStep', v)}
          hint={stepHint(settings)}
        />
        <SliderField
          id="beep-count"
          label="Number of Beeps"
          unit="×"
          value={settings.count}
          {...LIMITS.count}
          onChange={(v) => setNumber('count', v)}
        />
        <SliderField
          id="beep-duration"
          label="Beep Duration"
          unit="ms"
          value={settings.durationMs}
          {...LIMITS.durationMs}
          onChange={(v) => setNumber('durationMs', v)}
        />
        <SliderField
          id="beep-gap"
          label="Gap Between Beeps"
          unit="ms"
          value={settings.gapMs}
          {...LIMITS.gapMs}
          onChange={(v) => setNumber('gapMs', v)}
        />
        <SliderField
          id="beep-volume"
          label="Volume"
          unit="%"
          value={settings.volume}
          {...LIMITS.volume}
          onChange={(v) => setNumber('volume', v)}
        />
      </div>

      {/* Waveform */}
      <fieldset>
        <legend className="block text-sm font-medium text-dark-blue mb-2">Waveform</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WAVEFORMS.map((w) => {
            const selected = settings.waveform === w.value;
            return (
              <button
                key={w.value}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ ...settings, waveform: w.value })}
                className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  selected
                    ? 'bg-powder-50 border-powder-600 ring-1 ring-powder-500'
                    : 'bg-white border-slate-300 hover:border-powder-500'
                }`}
              >
                <span className={`block font-semibold ${selected ? 'text-powder-700' : 'text-dark-blue'}`}>
                  {w.label}
                </span>
                <span className="block text-xs text-slate-500">{w.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Visualization */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium text-dark-blue">Sequence</span>
            <span className="text-sm text-slate-600">
              Total duration: <strong className="text-dark-blue tabular-nums">{totalMs.toLocaleString()} ms</strong>
            </span>
          </div>
          <div
            ref={timelineBox}
            className="relative bg-white border border-slate-200 rounded-lg overflow-hidden"
            style={{ height: CANVAS_HEIGHT }}
          >
            <canvas
              ref={timelineCanvas}
              role="img"
              aria-label={`${settings.count} beeps of ${settings.durationMs} ms with ${settings.gapMs} ms gaps, ${totalMs} ms in total`}
              className="block w-full"
              style={{ height: CANVAS_HEIGHT }}
            />
            <div
              ref={playheadRef}
              aria-hidden
              className={`absolute top-0 bottom-0 w-0.5 -ml-px bg-red-500 ${playing ? '' : 'hidden'}`}
              style={{ left: 0 }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1 tabular-nums">
            <span>0 ms</span>
            <span>{formatDuration(totalMs / 2)}</span>
            <span>{formatDuration(totalMs)}</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium text-dark-blue">Waveform</span>
            <span className="text-xs text-slate-500 tabular-nums">
              {settings.frequencyStep !== 0 && settings.count > 1 ? 'First beep: ' : ''}
              {SHAPE_CYCLES} cycles = {((SHAPE_CYCLES * 1000) / settings.frequency).toFixed(2)} ms
            </span>
          </div>
          <div ref={shapeBox} className="bg-white border border-slate-200 rounded-lg" style={{ height: CANVAS_HEIGHT }}>
            <canvas
              ref={shapeCanvas}
              role="img"
              aria-label={`${settings.waveform} wave at ${settings.volume}% volume`}
              className="block w-full"
              style={{ height: CANVAS_HEIGHT }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Dashed lines: full scale (100% volume)</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={play}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all"
        >
          <Play className="w-4 h-4" aria-hidden />
          Play
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={!playing}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-dark-blue font-bold rounded-lg hover:border-powder-500 hover:text-powder-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:text-dark-blue"
        >
          <Square className="w-4 h-4" aria-hidden />
          Stop
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-dark-blue font-bold rounded-lg hover:border-powder-500 hover:text-powder-600 transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden />
          Download WAV
        </button>
        <div role="status" className="sm:ml-auto text-sm text-slate-600 min-h-5">
          {playing && (
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-powder-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-powder-600" />
              </span>
              Playing <span ref={elapsedRef} className="tabular-nums">0 ms</span> / {formatDuration(totalMs)}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Sound is generated in your browser (16-bit, {SAMPLE_RATE.toLocaleString()} Hz, 5 ms fade on each beep). The
        download is the exact audio Play produces, and the same file <code>beep_generator.py</code> writes for these
        settings. Your settings are remembered in this browser.
      </p>
    </div>
  );
}
