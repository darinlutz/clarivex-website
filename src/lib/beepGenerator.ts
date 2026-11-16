// Beep sequence engine for the Sandbox page's Beep Generator tab. Runs in the
// browser: Play feeds these samples to the Web Audio API and Download WAV
// encodes the same samples, so nothing is sent to the server.
//
// This is a port of beep_generator.py at the repo root; keep the two in step.
// For identical settings they produce the same 16-bit samples (up to the last
// bit of Math.sin vs Python's math.sin). See that file for the algorithm.

export type Waveform = 'sine' | 'square' | 'triangle' | 'sawtooth';

export type BeepSettings = {
  frequency: number; // Hz, of the first beep
  frequencyStep: number; // Hz added to each beep after the first (negative = lower)
  count: number;
  durationMs: number;
  gapMs: number;
  volume: number; // percent, 0-100
  waveform: Waveform;
};

export const WAVEFORMS: { value: Waveform; label: string; description: string }[] = [
  { value: 'sine', label: 'Sine', description: 'Smooth, clean tone' },
  { value: 'square', label: 'Square', description: 'Sharp electronic alert' },
  { value: 'triangle', label: 'Triangle', description: 'Softer, slightly buzzy tone' },
  { value: 'sawtooth', label: 'Sawtooth', description: 'Bright, buzzy tone' },
];

export const LIMITS = {
  frequency: { min: 100, max: 3000 },
  frequencyStep: { min: -1000, max: 1000 },
  count: { min: 1, max: 20 },
  durationMs: { min: 10, max: 1000 },
  gapMs: { min: 0, max: 1000 },
  volume: { min: 0, max: 100 },
} as const;

export const SAMPLE_RATE = 44100;
const FADE_MS = 5;
const MAX_AMPLITUDE = 32767;

export const DEFAULT_SETTINGS: BeepSettings = {
  frequency: 880,
  frequencyStep: 0,
  count: 3,
  durationMs: 150,
  gapMs: 100,
  volume: 50,
  waveform: 'sine',
};

export const PRESETS: { id: string; label: string; settings: BeepSettings }[] = [
  { id: 'standard', label: 'Standard Beep', settings: DEFAULT_SETTINGS },
  {
    id: 'notification',
    label: 'Short Notification',
    settings: { ...DEFAULT_SETTINGS, frequency: 1000, count: 2, durationMs: 80, gapMs: 80 },
  },
  {
    id: 'warning',
    label: 'Warning Alert',
    settings: { ...DEFAULT_SETTINGS, frequency: 1200, count: 5, durationMs: 200, gapMs: 100 },
  },
  {
    id: 'low',
    label: 'Low Tone',
    settings: { ...DEFAULT_SETTINGS, frequency: 300, count: 3, durationMs: 250, gapMs: 150 },
  },
  {
    id: 'rapid',
    label: 'Rapid Beeps',
    settings: { ...DEFAULT_SETTINGS, frequency: 1500, count: 10, durationMs: 50, gapMs: 50 },
  },
];

type NumericKey = Exclude<keyof BeepSettings, 'waveform'>;

function isWaveform(value: unknown): value is Waveform {
  return WAVEFORMS.some((w) => w.value === value);
}

// Rounds to a whole number and clamps into the allowed range; NaN and other
// non-numbers fall back to the default
export function clampSetting(key: NumericKey, value: unknown): number {
  const number = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(number)) return DEFAULT_SETTINGS[key];
  const { min, max } = LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(number)));
}

// Turns anything (e.g. JSON from localStorage) into valid settings, or null if
// it isn't a settings object at all
export function parseSettings(value: unknown): BeepSettings | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  return {
    frequency: clampSetting('frequency', raw.frequency),
    // Missing from settings saved before this existed: defaults to 0
    frequencyStep: clampSetting('frequencyStep', raw.frequencyStep),
    count: clampSetting('count', raw.count),
    durationMs: clampSetting('durationMs', raw.durationMs),
    gapMs: clampSetting('gapMs', raw.gapMs),
    volume: clampSetting('volume', raw.volume),
    waveform: isWaveform(raw.waveform) ? raw.waveform : DEFAULT_SETTINGS.waveform,
  };
}

export function sameSettings(a: BeepSettings, b: BeepSettings): boolean {
  return (
    a.frequency === b.frequency &&
    a.frequencyStep === b.frequencyStep &&
    a.count === b.count &&
    a.durationMs === b.durationMs &&
    a.gapMs === b.gapMs &&
    a.volume === b.volume &&
    a.waveform === b.waveform
  );
}

// The preset these settings match exactly, or null for "Custom"
export function matchPreset(settings: BeepSettings): string | null {
  return PRESETS.find((p) => sameSettings(p.settings, settings))?.id ?? null;
}

// (count x duration) + ((count - 1) x gap)
export function totalDurationMs({ count, durationMs, gapMs }: BeepSettings): number {
  return count * durationMs + (count - 1) * gapMs;
}

export function samplesIn(ms: number, sampleRate: number): number {
  return Math.floor((ms * sampleRate) / 1000);
}

// One sample of a unit waveform at `phase` in [0, 1); all start at 0 and rise
export function waveValue(waveform: Waveform, phase: number): number {
  switch (waveform) {
    case 'sine':
      return Math.sin(2 * Math.PI * phase);
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'triangle':
      return 1 - 4 * Math.abs(((phase + 0.25) % 1) - 0.5);
    case 'sawtooth':
      return 2 * ((phase + 0.5) % 1) - 1;
  }
}

// Frequency of each beep: each one `frequencyStep` Hz above (or, if negative,
// below) the one before, clamped to 100-3000 Hz. Same as
// beep_generator.beep_frequencies().
export function beepFrequencies({ frequency, count, frequencyStep }: BeepSettings): number[] {
  const { min, max } = LIMITS.frequency;
  return Array.from({ length: count }, (_, k) => Math.min(max, Math.max(min, frequency + k * frequencyStep)));
}

function renderBeep(
  frequency: number,
  beepN: number,
  fadeN: number,
  volume: number,
  waveform: Waveform,
  sampleRate: number,
): Int16Array {
  const beep = new Int16Array(beepN);
  for (let i = 0; i < beepN; i++) {
    const phase = ((frequency * i) / sampleRate) % 1;
    const envelope = fadeN > 0 ? Math.min(1, i / fadeN, (beepN - 1 - i) / fadeN) : 1;
    const value = Math.floor(volume * envelope * waveValue(waveform, phase) * MAX_AMPLITUDE + 0.5);
    beep[i] = Math.max(-MAX_AMPLITUDE, Math.min(MAX_AMPLITUDE, value));
  }
  return beep;
}

// The whole sequence as 16-bit samples, sample for sample what
// beep_generator.generate_samples() returns. Settings are clamped first.
export function generateSamples(input: BeepSettings, sampleRate = SAMPLE_RATE): Int16Array {
  const settings = parseSettings(input) ?? DEFAULT_SETTINGS;
  const { count, waveform } = settings;
  const volume = settings.volume / 100;
  const beepN = samplesIn(settings.durationMs, sampleRate);
  const gapN = samplesIn(settings.gapMs, sampleRate);
  const fadeN = Math.min(Math.floor((sampleRate * FADE_MS) / 1000), Math.floor(beepN / 2));

  // Gaps are the zeros the array starts with; none after the last beep.
  // Beeps at the same frequency are computed once and copied.
  const samples = new Int16Array(count * beepN + (count - 1) * gapN);
  const rendered = new Map<number, Int16Array>();
  beepFrequencies(settings).forEach((frequency, k) => {
    let beep = rendered.get(frequency);
    if (!beep) {
      beep = renderBeep(frequency, beepN, fadeN, volume, waveform, sampleRate);
      rendered.set(frequency, beep);
    }
    samples.set(beep, k * (beepN + gapN));
  });
  return samples;
}

// Mono 16-bit PCM WAV file around the samples
export function encodeWav(samples: Int16Array, sampleRate = SAMPLE_RATE): ArrayBuffer {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true);
  return buffer;
}

// e.g. beeps_880hz_3x_sine.wav, or beeps_880hz_step+50hz_4x_sine.wav when the
// pitch changes from beep to beep
export function wavFileName({ frequency, frequencyStep, count, waveform }: BeepSettings): string {
  const step = frequencyStep === 0 ? '' : `_step${frequencyStep > 0 ? '+' : ''}${frequencyStep}hz`;
  return `beeps_${frequency}hz${step}_${count}x_${waveform}.wav`;
}
