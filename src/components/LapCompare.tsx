'use client';

import { useEffect, useRef, useState } from 'react';
import {
  areaStats,
  brakeFeet,
  formatLapTime,
  formatSize,
  lapTimeToSeconds,
  parseLapFile,
  readLapSamples,
  type AreaStats,
  type LapFile,
  type Track,
} from '@/lib/lapData';

const inputClass =
  'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';

// 1234.5 -> "1,235"
function formatFeet(feet: number) {
  return Math.round(feet).toLocaleString('en-US');
}

const MPH_PER_METER_PER_SECOND = 2.23694;

// 0.12 -> "+0.120", -0.05 -> "-0.050"
function formatSecondsDiff(diff: number) {
  return `${diff >= 0 ? '+' : '-'}${Math.abs(diff).toFixed(3)}`;
}

// Compare brakepoint minus Base brakepoint, in feet. Positive = Compare brakes later.
// Uses the rounded feet shown on the line so the numbers add up, wrapped to
// +/- half a lap so an area crossing the start/finish line compares correctly.
function brakeDiffFeet(basePct: number, comparePct: number, lengthFeet: number) {
  const diff = brakeFeet(comparePct, lengthFeet) - brakeFeet(basePct, lengthFeet);
  return diff - Math.round(diff / lengthFeet) * lengthFeet;
}

// "T 7: Base 8.345 s, Compare 8.465 s (+0.120).  Base brake 4,345 ft at 65%, Compare brake
// 4,495 ft (150 ft later) at 68% (3% heavier).  Base exit 98 mph, Compare exit 101 mph (+3 mph)."
function formatAreaLine(areaName: string, base: AreaStats, compare: AreaStats, lengthFeet: number | null) {
  const times = `Base ${base.seconds.toFixed(3)} s, Compare ${compare.seconds.toFixed(3)} s (${formatSecondsDiff(
    compare.seconds - base.seconds
  )}).`;

  const brakeAt = (brakePct: number | null) => {
    if (brakePct === null) return 'no braking';
    if (!lengthFeet) return 'n/a ft (no TrackLengthInFeet)';
    return `${formatFeet(brakeFeet(brakePct, lengthFeet))} ft`;
  };

  let brakepointDiff = '';
  if (base.brakePct !== null && compare.brakePct !== null && lengthFeet) {
    const diff = Math.round(brakeDiffFeet(base.brakePct, compare.brakePct, lengthFeet));
    brakepointDiff =
      diff === 0 ? ' (same)' : ` (${formatFeet(Math.abs(diff))} ft ${diff > 0 ? 'later' : 'earlier'})`;
  }

  const basePressure = Math.round(base.maxBrake * 100);
  const comparePressure = Math.round(compare.maxBrake * 100);
  const pressureDiff = comparePressure - basePressure;
  const pressureDiffText =
    pressureDiff === 0 ? 'same' : `${Math.abs(pressureDiff)}% ${pressureDiff > 0 ? 'heavier' : 'lighter'}`;

  const baseExit = Math.round(base.exitSpeed * MPH_PER_METER_PER_SECOND);
  const compareExit = Math.round(compare.exitSpeed * MPH_PER_METER_PER_SECOND);
  const exitDiff = compareExit - baseExit;

  return (
    `${areaName}: ${times}  ` +
    `Base brake ${brakeAt(base.brakePct)} at ${basePressure}%, ` +
    `Compare brake ${brakeAt(compare.brakePct)}${brakepointDiff} at ${comparePressure}% (${pressureDiffText}).  ` +
    `Base exit ${baseExit} mph, Compare exit ${compareExit} mph (${exitDiff >= 0 ? '+' : '-'}${Math.abs(exitDiff)} mph).`
  );
}

// Asks the server for a 6-7 sentence coaching summary written for the Compare lap
async function fetchSummary(comparison: string, track: string) {
  try {
    const res = await fetch('/api/lap-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comparison, track }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to summarize the laps');
    return data.summary as string;
  } catch (err) {
    return `Summary unavailable: ${err instanceof Error ? err.message : 'unknown error'}`;
  }
}

type LapUploaderProps = {
  id: string;
  title: string;
  prompt: string;
  lap: LapFile | null;
  error: string;
  onFiles: (files: FileList | null | undefined) => void;
  onRemove: () => void;
};

// Drop zone that holds a single lap CSV
function LapUploader({ id, title, prompt, lap, error, onFiles, onRemove }: LapUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-dark-blue mb-2">
        {title}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 rounded-lg border-2 border-dashed transition-colors ${
          dragging ? 'border-powder-500 bg-powder-50' : 'border-slate-300 bg-white'
        }`}
      >
        <div className="text-sm text-slate-600 text-center sm:text-left">
          <p className="font-medium text-dark-blue">{prompt}</p>
          <p>Drag and drop 1 file here • Limit 25MB • CSV</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="text/csv,.csv"
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="mt-2 px-4 py-3 rounded-lg border text-sm whitespace-pre-wrap bg-red-50 border-red-200 text-red-900">
          {error}
        </div>
      )}

      {lap && (
        <div className="mt-2 flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-dark-blue">
          <span className="min-w-0 truncate">
            📄 {lap.driverName} • {lap.carName} • {lap.trackName} •{' '}
            <span className="font-semibold">{formatLapTime(lap.lapTime)}</span>{' '}
            <span className="text-slate-500">{formatSize(lap.file.size)}</span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${lap.file.name}`}
            className="ml-3 text-slate-500 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default function LapCompare() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackName, setTrackName] = useState('');
  const [error, setError] = useState('');
  const [baseLap, setBaseLap] = useState<LapFile | null>(null);
  const [compareLap, setCompareLap] = useState<LapFile | null>(null);
  const [baseError, setBaseError] = useState('');
  const [compareError, setCompareError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch('/api/track-names')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load track names');
        setTracks(data.tracks);
        if (data.tracks.length > 0) setTrackName(data.tracks[0].name);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  // Validates a drop/browse into one uploader and stores the lap if it's good
  const handleFiles = async (
    fileList: FileList | null | undefined,
    setLap: (lap: LapFile) => void,
    setLapError: (message: string) => void
  ) => {
    if (!fileList || fileList.length === 0) return;
    if (fileList.length > 1) {
      setLapError(`Only 1 CSV file can be uploaded here (${fileList.length} were selected).`);
      return;
    }

    try {
      const lap = await parseLapFile(fileList[0]);
      // Select the track matching the uploaded file's track name
      const match = tracks.find((t) => t.fileName.toLowerCase() === lap.trackName.toLowerCase());
      if (match) setTrackName(match.name);
      setLapError(
        match ? '' : `No track in Track_Area_Information.txt has TrackFileName "${lap.trackName}".`
      );
      setLap(lap);
    } catch (err) {
      setLapError(`${fileList[0].name}: ${(err as Error).message}`);
    }
  };

  const selectedTrack = tracks.find((t) => t.name === trackName);
  const mismatchedLaps = selectedTrack
    ? [baseLap, compareLap].filter(
        (lap) => lap && lap.trackName.toLowerCase() !== selectedTrack.fileName.toLowerCase()
      )
    : [];

  const analyzeLaps = async () => {
    if (!baseLap || !compareLap) return;
    setAnalyzing(true);
    try {
      const baseSeconds = lapTimeToSeconds(baseLap.lapTime);
      const compareSeconds = lapTimeToSeconds(compareLap.lapTime);
      const lines = [
        `Base lap: ${formatLapTime(baseLap.lapTime)} (${baseLap.driverName}, ${baseLap.carName})`,
        `Compare lap: ${formatLapTime(compareLap.lapTime)} (${compareLap.driverName}, ${compareLap.carName}) (${formatSecondsDiff(
          compareSeconds - baseSeconds
        )})`,
        '',
      ];

      if (!selectedTrack || selectedTrack.areas.length === 0) {
        lines.push('No focus areas for the selected track.');
      } else if (mismatchedLaps.length > 0) {
        lines.push(`Both laps must be from ${selectedTrack.fileName}.`);
      } else {
        const [baseSamples, compareSamples] = await Promise.all([
          readLapSamples(baseLap.file),
          readLapSamples(compareLap.file),
        ]);
        lines.push(`Focus areas (${selectedTrack.fileName}):`, '');
        const areasStart = lines.length;

        for (const area of selectedTrack.areas) {
          if (area.start === null || area.end === null) {
            lines.push(`${area.name}: missing start/end in Track_Area_Information.txt`, '');
            continue;
          }
          const base = areaStats(baseSamples, baseSeconds, area.start, area.end);
          const compare = areaStats(compareSamples, compareSeconds, area.start, area.end);
          lines.push(
            base && compare
              ? formatAreaLine(area.name, base, compare, selectedTrack.lengthFeet)
              : `${area.name}: no data for the ${!base ? 'Base' : 'Compare'} lap`,
            '' // Blank line between focus areas
          );
        }

        // Show the focus areas right away, then add the coaching summary below them
        setAnalysis(`${lines.join('\n').trimEnd()}\n\nSummary: writing…`);
        const summary = await fetchSummary(lines.slice(areasStart).join('\n').trim(), selectedTrack.fileName);
        lines.push('Summary:', summary);
      }

      setAnalysis(lines.join('\n').trimEnd());
    } catch (err) {
      setAnalysis(`Error analyzing laps: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-6">
      <div>
        <label htmlFor="compare-track-name" className="block text-sm font-medium text-dark-blue mb-2">
          Track Name
        </label>
        <select
          id="compare-track-name"
          value={trackName}
          onChange={(e) => setTrackName(e.target.value)}
          disabled={tracks.length === 0}
          className={inputClass}
        >
          {tracks.length === 0 && <option value="">{error ? 'Unavailable' : 'Loading…'}</option>}
          {tracks.map((track) => (
            <option key={track.name} value={track.name}>
              {track.fileName}
            </option>
          ))}
        </select>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <LapUploader
        id="base-lap-file"
        title="Base Lap"
        prompt="Upload a Base lap CSV file"
        lap={baseLap}
        error={baseError}
        onFiles={(files) => void handleFiles(files, setBaseLap, setBaseError)}
        onRemove={() => setBaseLap(null)}
      />

      <LapUploader
        id="compare-lap-file"
        title="Compare Lap"
        prompt="Upload a Compare lap CSV file"
        lap={compareLap}
        error={compareError}
        onFiles={(files) => void handleFiles(files, setCompareLap, setCompareError)}
        onRemove={() => setCompareLap(null)}
      />

      {mismatchedLaps.length > 0 && (
        <div className="px-4 py-3 rounded-lg border text-sm bg-yellow-50 border-yellow-200 text-yellow-900">
          {mismatchedLaps.length === 1 ? 'One uploaded lap is' : 'Both uploaded laps are'} not from{' '}
          {selectedTrack?.fileName}.
        </div>
      )}

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => void analyzeLaps()}
          disabled={!baseLap || !compareLap || analyzing}
          className="px-6 py-3 font-semibold text-white bg-gradient-to-r from-powder-500 to-powder-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing…' : 'Analyze Laps'}
        </button>

        <div>
          <label htmlFor="lap-compare-analysis" className="block text-sm font-medium text-dark-blue mb-2">
            Analysis
          </label>
          <textarea
            id="lap-compare-analysis"
            value={analysis}
            readOnly
            rows={12}
            placeholder={
              !baseLap || !compareLap ? 'Upload a Base lap and a Compare lap, then press Analyze Laps.' : 'Press Analyze Laps.'
            }
            className={`${inputClass} resize-y font-mono text-sm`}
          />
        </div>
      </div>
    </div>
  );
}
