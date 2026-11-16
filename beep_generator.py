"""Beep sequence generator: 16-bit mono PCM WAV built entirely in memory.

Standard library only. The Sandbox page's Beep Generator tab runs the same
algorithm in the browser (src/lib/beepGenerator.ts) so playback needs no
server round trip; keep the two in step. For identical settings they produce
the same samples (up to the last bit of Math.sin vs math.sin).

The algorithm, per beep k = 0, 1, 2, ... (the phase restarts at every beep):
    f_k      = frequency + k * frequency_step, clamped to 100-3000 Hz
    phase    = (f_k * i / sample_rate) mod 1
    wave     = sine | square | triangle | sawtooth of that phase, in [-1, 1]
    envelope = linear 5 ms fade in and fade out (shorter for short beeps)
    sample   = floor(volume * envelope * wave * 32767 + 0.5)
Beeps are separated by `gap_ms` of silence, with none after the last beep.

Usage as a script:
    python beep_generator.py --frequency 1200 --count 5 -o alert.wav
"""

from __future__ import annotations

import io
import math
import sys
import wave
from array import array

WAVEFORMS = ("sine", "square", "triangle", "sawtooth")

FREQUENCY_RANGE = (100, 3000)  # Hz
FREQUENCY_STEP_RANGE = (-1000, 1000)  # Hz added per beep
COUNT_RANGE = (1, 20)
DURATION_RANGE = (10, 1000)  # ms
GAP_RANGE = (0, 1000)  # ms
VOLUME_RANGE = (0.0, 1.0)
SAMPLE_RATE_RANGE = (8000, 48000)  # Hz

FADE_MS = 5
MAX_AMPLITUDE = 32767

# With the limits above the longest sequence is 20 x 1 s beeps + 19 x 1 s gaps
# = 39 s, about 1.7 M samples (3.4 MB) at 44.1 kHz. This cap is a backstop.
MAX_SAMPLES = 39 * SAMPLE_RATE_RANGE[1]


def _check_number(name, value, low, high, integer=False):
    # bool is a subclass of int, but True is not a valid frequency
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"{name} must be a number, got {type(value).__name__}")
    if integer and not (isinstance(value, int) or float(value).is_integer()):
        raise ValueError(f"{name} must be a whole number, got {value!r}")
    if math.isnan(value) or not low <= value <= high:
        raise ValueError(f"{name} must be between {low} and {high}, got {value!r}")
    return int(value) if integer else float(value)


def beep_samples_count(duration_ms: int, sample_rate: int) -> int:
    """Number of samples in `duration_ms` (integer floor, same as the TS engine)."""
    return duration_ms * sample_rate // 1000


def wave_value(waveform: str, phase: float) -> float:
    """One sample of a unit waveform at `phase` in [0, 1); all start at 0 and rise."""
    if waveform == "sine":
        return math.sin(2 * math.pi * phase)
    if waveform == "square":
        return 1.0 if phase < 0.5 else -1.0
    if waveform == "triangle":
        return 1.0 - 4.0 * abs((phase + 0.25) % 1.0 - 0.5)
    if waveform == "sawtooth":
        return 2.0 * ((phase + 0.5) % 1.0) - 1.0
    raise ValueError(f"unknown waveform {waveform!r}")


def beep_frequencies(frequency, count, frequency_step=0):
    """Frequency of each beep: each one `frequency_step` Hz above (or, if negative,
    below) the one before, clamped to the allowed 100-3000 Hz."""
    low, high = FREQUENCY_RANGE
    return [min(high, max(low, frequency + k * frequency_step)) for k in range(int(count))]


def _render_beep(frequency, beep_n, fade_n, volume, waveform, sample_rate) -> array:
    beep = array("h")
    for i in range(beep_n):
        phase = (frequency * i / sample_rate) % 1.0
        envelope = 1.0
        if fade_n > 0:
            envelope = min(1.0, i / fade_n, (beep_n - 1 - i) / fade_n)
        value = volume * envelope * wave_value(waveform, phase) * MAX_AMPLITUDE
        beep.append(max(-MAX_AMPLITUDE, min(MAX_AMPLITUDE, math.floor(value + 0.5))))
    return beep


def generate_samples(
    frequency=880,
    count=3,
    duration_ms=150,
    gap_ms=100,
    volume=0.5,
    waveform="sine",
    sample_rate=44100,
    frequency_step=0,
) -> array:
    """Validate the settings and return the sequence as 16-bit samples (array 'h')."""
    frequency = _check_number("frequency", frequency, *FREQUENCY_RANGE)
    count = _check_number("count", count, *COUNT_RANGE, integer=True)
    duration_ms = _check_number("duration_ms", duration_ms, *DURATION_RANGE, integer=True)
    gap_ms = _check_number("gap_ms", gap_ms, *GAP_RANGE, integer=True)
    volume = _check_number("volume", volume, *VOLUME_RANGE)
    sample_rate = _check_number("sample_rate", sample_rate, *SAMPLE_RATE_RANGE, integer=True)
    frequency_step = _check_number("frequency_step", frequency_step, *FREQUENCY_STEP_RANGE)
    if not isinstance(waveform, str) or waveform.lower() not in WAVEFORMS:
        raise ValueError(f"waveform must be one of {', '.join(WAVEFORMS)}, got {waveform!r}")
    waveform = waveform.lower()

    beep_n = beep_samples_count(duration_ms, sample_rate)
    gap_n = beep_samples_count(gap_ms, sample_rate)
    total = count * beep_n + (count - 1) * gap_n
    if total > MAX_SAMPLES:
        raise ValueError(f"sequence too long ({total} samples, limit {MAX_SAMPLES})")

    fade_n = min(sample_rate * FADE_MS // 1000, beep_n // 2)
    gap = array("h", bytes(2 * gap_n))
    samples = array("h")
    beeps = {}  # frequency -> rendered beep, so equal beeps are computed once
    for index, beep_frequency in enumerate(beep_frequencies(frequency, count, frequency_step)):
        if index:
            samples.extend(gap)
        if beep_frequency not in beeps:
            beeps[beep_frequency] = _render_beep(beep_frequency, beep_n, fade_n, volume, waveform, sample_rate)
        samples.extend(beeps[beep_frequency])
    return samples


def generate_beeps(
    frequency=880,
    count=3,
    duration_ms=150,
    gap_ms=100,
    volume=0.5,
    waveform="sine",
    sample_rate=44100,
    frequency_step=0,
) -> bytes:
    """Return a complete mono 16-bit PCM WAV file of the beep sequence.

    frequency 100-3000 Hz, count 1-20, duration_ms 10-1000, gap_ms 0-1000,
    volume 0.0-1.0, waveform sine/square/triangle/sawtooth, sample_rate
    8000-48000 Hz, frequency_step -1000-1000 Hz (each beep is that much higher
    than the one before, or lower if negative; beeps that would leave 100-3000 Hz
    stay at the limit). Invalid values raise ValueError (or TypeError).
    """
    samples = generate_samples(frequency, count, duration_ms, gap_ms, volume, waveform, sample_rate, frequency_step)
    if sys.byteorder == "big":  # WAV data is little-endian
        samples.byteswap()

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(int(sample_rate))
        wav.writeframes(samples.tobytes())
    return buffer.getvalue()


def total_duration_ms(count: int, duration_ms: int, gap_ms: int) -> int:
    """(count x duration) + ((count - 1) x gap)."""
    return count * duration_ms + (count - 1) * gap_ms


def _main(argv=None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Write a beep sequence to a WAV file.")
    parser.add_argument("--frequency", type=float, default=880, help="Hz, 100-3000 (default 880)")
    parser.add_argument("--count", type=int, default=3, help="number of beeps, 1-20 (default 3)")
    parser.add_argument("--duration", type=int, default=150, help="beep length in ms, 10-1000 (default 150)")
    parser.add_argument("--gap", type=int, default=100, help="gap in ms, 0-1000 (default 100)")
    parser.add_argument("--volume", type=float, default=50, help="percent, 0-100 (default 50)")
    parser.add_argument(
        "--frequency-step", type=float, default=0, help="Hz added to each beep after the first, -1000-1000 (default 0)"
    )
    parser.add_argument("--waveform", choices=WAVEFORMS, default="sine")
    parser.add_argument("--sample-rate", type=int, default=44100)
    parser.add_argument("-o", "--output", default=None, help="output file (default beeps_<freq>hz_<count>x.wav)")
    args = parser.parse_args(argv)

    try:
        data = generate_beeps(
            args.frequency, args.count, args.duration, args.gap, args.volume / 100, args.waveform, args.sample_rate,
            args.frequency_step,
        )
    except (TypeError, ValueError) as error:
        parser.error(str(error))

    output = args.output or f"beeps_{args.frequency:g}hz_{args.count}x.wav"
    with open(output, "wb") as handle:
        handle.write(data)
    print(f"Wrote {output} ({total_duration_ms(args.count, args.duration, args.gap)} ms, {len(data)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
