'use client';

import { useEffect, useRef, useState } from 'react';

// start/end are fractions of a lap (LapDistPct); null if missing in the config
type Area = { name: string; start: number | null; end: number | null };
type Track = { name: string; fileName: string; areas: Area[] };

type LapFile = {
  file: File;
  driverName: string;
  carName: string;
  trackName: string;
  lapTime: string;
  fileId: string;
};

const MAX_CSV_BYTES = 25 * 1024 * 1024;

// Garage 61 - {driverName} - {carName} - {trackName} - {lapTime} - {uniqueFileID}.csv
const FILE_NAME_PATTERN = /^Garage 61 - (.+?) - (.+?) - (.+) - (\d+\.\d{2}\.\d{3}) - ([A-Za-z0-9]+)\.csv$/i;

// P2PActive is left out on purpose: some files don't have it, and it's ignored when present.
const EXPECTED_COLUMNS = [
  'Speed', 'LapDistPct', 'Lat', 'Lon', 'Brake', 'Throttle', 'RPM', 'SteeringWheelAngle', 'Gear',
  'Clutch', 'ABSActive', 'DRSActive', 'LatAccel', 'LongAccel', 'VertAccel', 'Yaw',
  'YawRate', 'PositionType',
];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// "01.18.683" -> 78.683
function lapTimeToSeconds(lapTime: string) {
  const [minutes, seconds, millis] = lapTime.split('.').map(Number);
  return minutes * 60 + seconds + millis / 1000;
}

// "01.18.683" -> "1:18.683"
function formatLapTime(lapTime: string) {
  const [minutes, seconds, millis] = lapTime.split('.');
  return `${Number(minutes)}:${seconds}.${millis}`;
}

type LapSamples = { pcts: number[]; brakes: number[] };

// Reads the LapDistPct and Brake columns. LapDistPct is unwrapped so it keeps
// increasing past the start/finish line (e.g. 0.999 -> 1.001 instead of 0.001).
async function readLapSamples(file: File): Promise<LapSamples> {
  const lines = (await file.text()).split(/\r?\n/);
  const header = lines[0].split(',').map((c) => c.trim());
  const pctColumn = header.indexOf('LapDistPct');
  const brakeColumn = header.indexOf('Brake');
  const pcts: number[] = [];
  const brakes: number[] = [];
  let offset = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    const value = parseFloat(cells[pctColumn]);
    if (Number.isNaN(value)) continue;
    if (pcts.length === 0 && value > 0.5) offset = -1; // Lap starts just before the line
    if (pcts.length > 0 && value + offset < pcts[pcts.length - 1] - 0.5) offset += 1;
    pcts.push(value + offset);
    brakes.push(parseFloat(cells[brakeColumn]) || 0);
  }
  return { pcts, brakes };
}

// Fractional sample index where the lap first reaches `target`, at or after `from`
function crossingIndex(pcts: number[], target: number, from: number) {
  for (let i = Math.max(1, Math.ceil(from)); i < pcts.length; i++) {
    if (pcts[i - 1] < target && pcts[i] >= target) {
      return i - 1 + (target - pcts[i - 1]) / (pcts[i] - pcts[i - 1]);
    }
  }
  return null;
}

// Seconds spent between start and end, and the highest Brake value (0-1) in
// that stretch. Samples are evenly spaced (60 Hz), so each one is
// lapSeconds / sampleCount long.
function areaStats({ pcts, brakes }: LapSamples, lapSeconds: number, start: number, end: number) {
  const startIndex = crossingIndex(pcts, start, 0);
  if (startIndex === null) return null;
  // An area that crosses the start/finish line ends on the next lap
  const endIndex = crossingIndex(pcts, end < start ? end + 1 : end, startIndex);
  if (endIndex === null) return null;

  let maxBrake = 0;
  for (let i = Math.floor(startIndex); i <= Math.ceil(endIndex); i++) {
    maxBrake = Math.max(maxBrake, brakes[i] ?? 0);
  }
  return { seconds: ((endIndex - startIndex) * lapSeconds) / pcts.length, maxBrake };
}

// Sample standard deviation (n - 1); needs at least two values
function sampleStdDev(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

async function parseLapFile(file: File): Promise<LapFile> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('only CSV files are supported');
  }
  if (file.size > MAX_CSV_BYTES) {
    throw new Error('file is too large (25 MB max)');
  }

  const match = file.name.match(FILE_NAME_PATTERN);
  if (!match) {
    throw new Error(
      'file name must look like "Garage 61 - Driver - Car - Track - 01.18.683 - ID.csv"'
    );
  }

  const header = (await file.slice(0, 4096).text()).split(/\r?\n/)[0].split(',').map((c) => c.trim());
  const missing = EXPECTED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new Error(`missing columns: ${missing.join(', ')}`);
  }

  const [, driverName, carName, trackName, lapTime, fileId] = match;
  return { file, driverName, carName, trackName, lapTime, fileId };
}

export default function StintAnalysis() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackName, setTrackName] = useState('');
  const [error, setError] = useState('');
  const [lapFiles, setLapFiles] = useState<LapFile[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFiles = async (fileList: FileList | null | undefined) => {
    if (!fileList || fileList.length === 0) return;

    const results = await Promise.allSettled(Array.from(fileList).map(parseLapFile));
    const added: LapFile[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') added.push(result.value);
      else errors.push(`${fileList[index].name}: ${(result.reason as Error).message}`);
    });

    // Select the track matching the uploaded files' track name
    if (added.length > 0) {
      const uploadedTrack = added[0].trackName;
      const match = tracks.find((t) => t.fileName.toLowerCase() === uploadedTrack.toLowerCase());
      if (match) setTrackName(match.name);
      else errors.push(`No track in Track_Area_Information.txt has TrackFileName "${uploadedTrack}".`);
    }

    setFileErrors(errors);
    // Skip files that were already added (same unique ID)
    setLapFiles((prev) => [
      ...prev,
      ...added.filter((lap) => !prev.some((p) => p.fileId === lap.fileId)),
    ]);
  };

  const analyzeStint = async () => {
    setAnalyzing(true);
    try {
      const fastest = lapFiles.reduce((best, lap) =>
        lapTimeToSeconds(lap.lapTime) < lapTimeToSeconds(best.lapTime) ? lap : best
      );
      const lines = [
        `CSV files uploaded: ${lapFiles.length}`,
        `Fastest lap: ${formatLapTime(fastest.lapTime)} (${fastest.driverName}, ${fastest.carName}) [${fastest.fileId.slice(-4)}]`,
        '',
      ];

      // Only laps from the selected track can be compared against its areas
      const trackLaps = selectedTrack
        ? lapFiles.filter((lap) => lap.trackName.toLowerCase() === selectedTrack.fileName.toLowerCase())
        : [];

      if (!selectedTrack || selectedTrack.areas.length === 0) {
        lines.push('No focus areas for the selected track.');
      } else if (trackLaps.length === 0) {
        lines.push(`No uploaded laps are from ${selectedTrack.fileName}.`);
      } else {
        const lapSamples = await Promise.all(trackLaps.map((lap) => readLapSamples(lap.file)));
        lines.push(`Fastest time per focus area (${selectedTrack.fileName}):`);

        for (const area of selectedTrack.areas) {
          if (area.start === null || area.end === null) {
            lines.push(`${area.name}: missing start/end in Track_Area_Information.txt`);
            continue;
          }

          let best: { seconds: number; maxBrake: number } | null = null;
          let bestLap: LapFile | null = null;
          const areaTimes: number[] = [];
          for (let i = 0; i < trackLaps.length; i++) {
            const stats = areaStats(lapSamples[i], lapTimeToSeconds(trackLaps[i].lapTime), area.start, area.end);
            if (!stats) continue;
            areaTimes.push(stats.seconds);
            if (!best || stats.seconds < best.seconds) {
              best = stats;
              bestLap = trackLaps[i];
            }
          }

          const range = `${(area.start * 100).toFixed(0)}%-${(area.end * 100).toFixed(0)}%`;
          const stdDev = sampleStdDev(areaTimes);
          lines.push(
            best && bestLap
              ? `${area.name} (${range}): ${best.seconds.toFixed(3)}s, Max Brake ${Math.round(best.maxBrake * 100)}% [${bestLap.fileId.slice(-4)}], Stand Dev = ${stdDev === null ? 'n/a' : `${stdDev.toFixed(3)}s`}`
              : `${area.name} (${range}): no data`
          );
        }
      }

      setAnalysis(lines.join('\n'));
    } catch (err) {
      setAnalysis(`Error analyzing stint: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const removeFile = (fileId: string) => {
    setLapFiles((prev) => prev.filter((lap) => lap.fileId !== fileId));
  };

  const selectedTrack = tracks.find((t) => t.name === trackName);
  const mismatchedLaps = selectedTrack
    ? lapFiles.filter((lap) => lap.trackName.toLowerCase() !== selectedTrack.fileName.toLowerCase())
    : [];

  const inputClass =
    'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-6">
      <div>
        <label htmlFor="stint-track-name" className="block text-sm font-medium text-dark-blue mb-2">
          Track Name
        </label>
        <select
          id="stint-track-name"
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

      {/* File upload */}
      <div>
        <label className="block text-sm text-slate-600 mb-2">Upload Lap CSVs</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 rounded-lg border-2 border-dashed transition-colors ${
            dragging ? 'border-powder-500 bg-powder-50' : 'border-slate-300 bg-white'
          }`}
        >
          <div className="text-sm text-slate-600 text-center sm:text-left">
            <p className="font-medium text-dark-blue">Drag and drop files here</p>
            <p>Limit 25MB per file • CSV</p>
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
            type="file"
            accept="text/csv,.csv"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {fileErrors.length > 0 && (
          <div className="mt-2 px-4 py-3 rounded-lg border text-sm whitespace-pre-wrap bg-red-50 border-red-200 text-red-900">
            {fileErrors.join('\n')}
          </div>
        )}

        {mismatchedLaps.length > 0 && (
          <div className="mt-2 px-4 py-3 rounded-lg border text-sm bg-yellow-50 border-yellow-200 text-yellow-900">
            {mismatchedLaps.length} uploaded {mismatchedLaps.length === 1 ? 'lap is' : 'laps are'} not from{' '}
            {selectedTrack?.fileName}.
          </div>
        )}

        {lapFiles.length > 0 && (
          <ul className="mt-2 space-y-2">
            {lapFiles.map((lap) => (
              <li
                key={lap.fileId}
                className="flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-dark-blue"
              >
                <span className="min-w-0 truncate">
                  📄 {lap.driverName} • {lap.carName} • {lap.trackName} •{' '}
                  <span className="font-semibold">{formatLapTime(lap.lapTime)}</span>{' '}
                  <span className="text-slate-500">{formatSize(lap.file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(lap.fileId)}
                  aria-label={`Remove ${lap.file.name}`}
                  className="ml-3 text-slate-500 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => void analyzeStint()}
          disabled={lapFiles.length === 0 || analyzing}
          className="px-6 py-3 font-semibold text-white bg-gradient-to-r from-powder-500 to-powder-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing…' : 'Analyze Stint'}
        </button>

        <div>
          <label htmlFor="stint-analysis" className="block text-sm font-medium text-dark-blue mb-2">
            Analysis
          </label>
          <textarea
            id="stint-analysis"
            value={analysis}
            readOnly
            rows={8}
            placeholder={lapFiles.length === 0 ? 'Upload lap CSVs, then press Analyze Stint.' : 'Press Analyze Stint.'}
            className={`${inputClass} resize-y font-mono text-sm`}
          />
        </div>
      </div>
    </div>
  );
}
