"""Unit tests for beep_generator.py.  Run: python -m unittest discover -s tests"""

import io
import math
import os
import sys
import unittest
import wave
from array import array

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import beep_generator as bg  # noqa: E402


def read_wav(data: bytes):
    with wave.open(io.BytesIO(data), "rb") as wav:
        params = wav.getparams()
        frames = wav.readframes(wav.getnframes())
    samples = array("h", frames)
    if sys.byteorder == "big":
        samples.byteswap()
    return params, samples


def positive_zero_crossings(samples) -> int:
    return sum(1 for a, b in zip(samples, samples[1:]) if a < 0 <= b)


class WavFormatTests(unittest.TestCase):
    def test_header_is_16_bit_mono_pcm(self):
        data = bg.generate_beeps()
        self.assertEqual(data[:4], b"RIFF")
        self.assertEqual(data[8:12], b"WAVE")
        params, _ = read_wav(data)
        self.assertEqual(params.nchannels, 1)
        self.assertEqual(params.sampwidth, 2)
        self.assertEqual(params.framerate, 44100)
        self.assertEqual(params.comptype, "NONE")

    def test_defaults(self):
        self.assertEqual(bg.generate_beeps(), bg.generate_beeps(880, 3, 150, 100, 0.5, "sine", 44100))


class LengthTests(unittest.TestCase):
    def test_length_matches_formula_without_trailing_silence(self):
        for count, duration, gap in [(1, 150, 100), (3, 150, 100), (20, 50, 50), (5, 200, 0), (2, 10, 1000)]:
            with self.subTest(count=count, duration=duration, gap=gap):
                params, samples = read_wav(bg.generate_beeps(count=count, duration_ms=duration, gap_ms=gap))
                expected_ms = bg.total_duration_ms(count, duration, gap)
                self.assertEqual(params.nframes, expected_ms * 44100 // 1000)
                self.assertEqual(len(samples), params.nframes)

    def test_single_beep_has_no_gap(self):
        _, samples = read_wav(bg.generate_beeps(count=1, duration_ms=100, gap_ms=1000))
        self.assertEqual(len(samples), 4410)

    def test_gaps_are_silent_and_beeps_are_not(self):
        _, samples = read_wav(bg.generate_beeps(count=3, duration_ms=100, gap_ms=50))
        beep, gap = 4410, 2205
        for k in range(3):
            start = k * (beep + gap)
            self.assertGreater(max(abs(s) for s in samples[start:start + beep]), 10000)
            if k < 2:
                self.assertTrue(all(s == 0 for s in samples[start + beep:start + beep + gap]))

    def test_longest_sequence_is_allowed(self):
        params, _ = read_wav(bg.generate_beeps(frequency=100, count=20, duration_ms=1000, gap_ms=1000))
        self.assertEqual(params.nframes, 39 * 44100)

    def test_other_sample_rate(self):
        params, _ = read_wav(bg.generate_beeps(count=2, duration_ms=100, gap_ms=100, sample_rate=8000))
        self.assertEqual(params.framerate, 8000)
        self.assertEqual(params.nframes, 2400)


class FrequencyTests(unittest.TestCase):
    def test_measured_frequency_matches(self):
        for frequency in (100, 300, 880, 1000, 1500, 3000):
            for waveform in bg.WAVEFORMS:
                with self.subTest(frequency=frequency, waveform=waveform):
                    _, samples = read_wav(
                        bg.generate_beeps(frequency=frequency, count=1, duration_ms=1000, waveform=waveform)
                    )
                    # One upward zero crossing per cycle over exactly one second
                    self.assertAlmostEqual(positive_zero_crossings(samples), frequency, delta=2)

    def test_pitch_changes_with_frequency(self):
        low = positive_zero_crossings(read_wav(bg.generate_beeps(300, 1, 500))[1])
        high = positive_zero_crossings(read_wav(bg.generate_beeps(1200, 1, 500))[1])
        self.assertAlmostEqual(high / low, 4, delta=0.05)


class WaveformTests(unittest.TestCase):
    def test_unit_waveform_values(self):
        cases = {
            "sine": [(0, 0), (0.25, 1), (0.5, 0), (0.75, -1)],
            "square": [(0, 1), (0.25, 1), (0.5, -1), (0.75, -1)],
            "triangle": [(0, 0), (0.25, 1), (0.5, 0), (0.75, -1), (0.125, 0.5)],
            "sawtooth": [(0, 0), (0.25, 0.5), (0.5, -1), (0.75, -0.5)],
        }
        for waveform, points in cases.items():
            for phase, expected in points:
                with self.subTest(waveform=waveform, phase=phase):
                    self.assertAlmostEqual(bg.wave_value(waveform, phase), expected, places=9)

    def mid_beep(self, waveform, volume=1.0):
        # 100 Hz at 44.1 kHz = 441 samples per cycle; skip the 5 ms fade
        _, samples = read_wav(
            bg.generate_beeps(frequency=100, count=1, duration_ms=100, volume=volume, waveform=waveform)
        )
        return samples[441:441 * 9]

    def test_square_has_two_levels(self):
        self.assertEqual(set(self.mid_beep("square")), {32767, -32767})

    def test_sine_is_smooth_and_full_scale(self):
        samples = self.mid_beep("sine")
        self.assertEqual(max(samples), 32767)
        self.assertEqual(min(samples), -32767)
        self.assertLess(max(abs(a - b) for a, b in zip(samples, samples[1:])), 32767 * 2 * math.pi / 441 + 2)

    def test_triangle_has_constant_slope(self):
        samples = self.mid_beep("triangle")
        slope = 4 * 32767 / 441  # full swing up and down once per 441-sample cycle
        steps = [abs(a - b) for a, b in zip(samples, samples[1:])]
        self.assertLessEqual(max(steps), slope + 2)
        # Every step is the same size except the two either side of each peak,
        # which falls between samples (8 cycles x 2 peaks x 2 steps)
        uneven = [s for s in steps if abs(s - slope) > 2]
        self.assertLessEqual(len(uneven), 8 * 2 * 2)

    def test_sawtooth_rises_then_drops(self):
        samples = self.mid_beep("sawtooth")
        diffs = [b - a for a, b in zip(samples, samples[1:])]
        drops = [d for d in diffs if d < 0]
        self.assertEqual(len(drops), 8)  # one reset per cycle
        self.assertTrue(all(d < -60000 for d in drops))

    def test_waveforms_differ(self):
        renders = {w: bg.generate_beeps(waveform=w) for w in bg.WAVEFORMS}
        self.assertEqual(len(set(renders.values())), 4)

    def test_waveform_name_is_case_insensitive(self):
        self.assertEqual(bg.generate_beeps(waveform="Square"), bg.generate_beeps(waveform="square"))


class FrequencyStepTests(unittest.TestCase):
    def measured(self, **kwargs):
        """Measured frequency of each 1 s beep in the sequence."""
        _, samples = read_wav(bg.generate_beeps(duration_ms=1000, gap_ms=100, **kwargs))
        beep, gap = 44100, 4410
        return [positive_zero_crossings(samples[k * (beep + gap):k * (beep + gap) + beep]) for k in range(kwargs["count"])]

    def test_each_beep_rises_by_the_step(self):
        self.assertEqual(bg.beep_frequencies(880, 4, 50), [880, 930, 980, 1030])
        for got, want in zip(self.measured(frequency=880, count=4, frequency_step=50), [880, 930, 980, 1030]):
            self.assertAlmostEqual(got, want, delta=2)

    def test_negative_step_lowers_each_beep(self):
        self.assertEqual(bg.beep_frequencies(1000, 3, -200), [1000, 800, 600])
        for got, want in zip(self.measured(frequency=1000, count=3, frequency_step=-200), [1000, 800, 600]):
            self.assertAlmostEqual(got, want, delta=2)

    def test_frequencies_are_held_at_the_limits(self):
        self.assertEqual(bg.beep_frequencies(2800, 4, 150), [2800, 2950, 3000, 3000])
        self.assertEqual(bg.beep_frequencies(300, 3, -150), [300, 150, 100])

    def test_zero_step_matches_the_default(self):
        self.assertEqual(bg.generate_beeps(frequency_step=0), bg.generate_beeps())

    def test_step_keeps_the_length(self):
        params, _ = read_wav(bg.generate_beeps(count=4, frequency_step=50))
        self.assertEqual(params.nframes, bg.total_duration_ms(4, 150, 100) * 44100 // 1000)

    def test_out_of_range_step_is_rejected(self):
        for step in (-1001, 1001, float("nan"), "50", True):
            with self.subTest(step=repr(step)):
                with self.assertRaises((TypeError, ValueError)):
                    bg.generate_beeps(frequency_step=step)

    def test_cli_step(self):
        import tempfile

        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, "out.wav")
            bg._main(["--count", "4", "--frequency-step", "-50", "-o", path])
            with open(path, "rb") as handle:
                self.assertEqual(handle.read(), bg.generate_beeps(count=4, frequency_step=-50))


class EnvelopeAndVolumeTests(unittest.TestCase):
    def test_fade_in_and_out(self):
        _, samples = read_wav(bg.generate_beeps(frequency=1000, count=1, duration_ms=100, volume=1.0))
        fade = 44100 * bg.FADE_MS // 1000
        self.assertEqual(samples[0], 0)
        self.assertEqual(samples[-1], 0)
        self.assertLess(max(abs(s) for s in samples[:20]), 32767 * 20 / fade + 1)
        self.assertLess(max(abs(s) for s in samples[-20:]), 32767 * 20 / fade + 1)
        self.assertGreater(max(abs(s) for s in samples[fade:-fade]), 32000)

    def test_shortest_beep_still_fades(self):
        _, samples = read_wav(bg.generate_beeps(count=1, duration_ms=10, volume=1.0, waveform="square"))
        self.assertEqual(samples[0], 0)
        self.assertEqual(samples[-1], 0)

    def test_volume_scales_amplitude(self):
        peak = {}
        for volume in (1.0, 0.5, 0.25):
            _, samples = read_wav(bg.generate_beeps(count=1, waveform="square", volume=volume))
            peak[volume] = max(samples)
        self.assertEqual(peak[1.0], 32767)
        self.assertAlmostEqual(peak[0.5], 16384, delta=1)
        self.assertAlmostEqual(peak[0.25], 8192, delta=1)

    def test_zero_volume_is_silent(self):
        _, samples = read_wav(bg.generate_beeps(volume=0))
        self.assertTrue(len(samples) > 0 and all(s == 0 for s in samples))

    def test_samples_never_clip(self):
        for waveform in bg.WAVEFORMS:
            samples = bg.generate_samples(frequency=2999, count=1, duration_ms=200, volume=1.0, waveform=waveform)
            self.assertLessEqual(max(abs(s) for s in samples), 32767)


class ValidationTests(unittest.TestCase):
    def test_boundaries_are_accepted(self):
        bg.generate_beeps(frequency=100, count=1, duration_ms=10, gap_ms=0, volume=0.0)
        bg.generate_beeps(frequency=3000, count=20, duration_ms=10, gap_ms=1000, volume=1.0)

    def test_out_of_range_values_are_rejected(self):
        bad = [
            {"frequency": 99},
            {"frequency": 3001},
            {"frequency": float("nan")},
            {"frequency": float("inf")},
            {"count": 0},
            {"count": 21},
            {"count": 2.5},
            {"duration_ms": 9},
            {"duration_ms": 1001},
            {"gap_ms": -1},
            {"gap_ms": 1001},
            {"volume": -0.01},
            {"volume": 1.01},
            {"volume": 50},  # percent instead of a fraction
            {"waveform": "noise"},
            {"waveform": ""},
            {"sample_rate": 4000},
            {"sample_rate": 192000},
        ]
        for kwargs in bad:
            with self.subTest(**{k: repr(v) for k, v in kwargs.items()}):
                with self.assertRaises(ValueError):
                    bg.generate_beeps(**kwargs)

    def test_wrong_types_are_rejected(self):
        for kwargs in ({"frequency": "880"}, {"count": True}, {"volume": None}, {"waveform": 1}, {"gap_ms": [100]}):
            with self.subTest(kwargs=repr(kwargs)):
                with self.assertRaises((TypeError, ValueError)):
                    bg.generate_beeps(**kwargs)

    def test_whole_number_floats_are_accepted(self):
        self.assertEqual(bg.generate_beeps(count=3.0, duration_ms=150.0), bg.generate_beeps(count=3, duration_ms=150))


class CliTests(unittest.TestCase):
    def test_cli_writes_file(self):
        import tempfile

        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, "out.wav")
            self.assertEqual(bg._main(["--count", "2", "--volume", "25", "-o", path]), 0)
            with open(path, "rb") as handle:
                self.assertEqual(handle.read(), bg.generate_beeps(count=2, volume=0.25))


if __name__ == "__main__":
    unittest.main()
