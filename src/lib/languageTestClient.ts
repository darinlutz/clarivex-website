// Client-side helpers for the Language test tabs: synthesized chime/error
// sounds (so no audio files are needed), text-to-speech playback and the
// Difficulty scale labels. Browser-only.

function playTones(
  tones: { frequency: number; start: number; duration: number }[],
  type: OscillatorType
) {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  let end = 0;
  for (const { frequency, start, duration } of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const t0 = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
    end = Math.max(end, start + duration);
  }
  setTimeout(() => ctx.close(), (end + 0.1) * 1000);
}

export const playChime = () =>
  playTones(
    [
      { frequency: 880, start: 0, duration: 0.35 },
      { frequency: 1318.5, start: 0.12, duration: 0.5 },
    ],
    'sine'
  );

export const playError = () =>
  playTones(
    [
      { frequency: 196, start: 0, duration: 0.18 },
      { frequency: 156, start: 0.16, duration: 0.3 },
    ],
    'square'
  );

export const MALE_VOICE = 'alloy';
export const FEMALE_VOICE = 'nova';

// Speaks text through /api/speak and resolves once playback starts
export async function speakText(text: string, voice: string): Promise<void> {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to generate speech');
  }

  const audioUrl = URL.createObjectURL(await response.blob());
  const audio = new Audio(audioUrl);
  audio.onended = () => URL.revokeObjectURL(audioUrl);
  await audio.play();
}

// The 1-10 sentence Difficulty scale shared by the test tabs
export const DIFFICULTY_LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  3: 'Easy',
  5: 'Medium',
  10: 'Very Hard',
};

export const difficultyOptionLabel = (level: number) =>
  DIFFICULTY_LABELS[level] ? `${level} - ${DIFFICULTY_LABELS[level]}` : String(level);
