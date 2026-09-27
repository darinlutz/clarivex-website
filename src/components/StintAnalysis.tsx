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
  type LapFile,
  type Track,
} from '@/lib/lapData';

// Lap position (unwrapped LapDistPct) -> "Brakepoint at 1234 ft. (Brake target = 1200)"
function formatBrakepoint(brakePct: number | null, lengthFeet: number | null, target: number | null) {
  if (brakePct === null) return 'No braking';
  if (!lengthFeet) return 'Brakepoint at n/a (no TrackLengthInFeet)';
  return `Brakepoint at ${brakeFeet(brakePct, lengthFeet)} ft. (Brake target = ${target ?? 'n/a'})`;
}

// Sample standard deviation (n - 1); needs at least two values
function sampleStdDev(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
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
            lines.push(`${area.name}: missing start/end in Track_Area_Information.txt`, '');
            continue;
          }

          let best: ReturnType<typeof areaStats> = null;
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
              ? `${area.name} (${range}): ${best.seconds.toFixed(3)}s, ${formatBrakepoint(best.brakePct, selectedTrack.lengthFeet, area.brakepointTarget)}, Max Brake ${Math.round(best.maxBrake * 100)}% (Max Brake Target = ${area.maxBrakeTarget === null ? 'n/a' : `${area.maxBrakeTarget}%`}) [${bestLap.fileId.slice(-4)}], Stand Dev = ${stdDev === null ? 'n/a' : `${stdDev.toFixed(3)}s`}`
              : `${area.name} (${range}): no data`,
            '' // Blank line between focus areas
          );
        }
      }

      setAnalysis(lines.join('\n').trimEnd());
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
            rows={12}
            placeholder={lapFiles.length === 0 ? 'Upload lap CSVs, then press Analyze Stint.' : 'Press Analyze Stint.'}
            className={`${inputClass} resize-y font-mono text-sm`}
          />
        </div>
      </div>
    </div>
  );
}
