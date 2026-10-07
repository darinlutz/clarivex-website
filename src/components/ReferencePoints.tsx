'use client';

import { useEffect, useRef, useState } from 'react';

import { lapId } from '@/lib/debriefSession';
import { formatLapTime, formatSize, parseLapFile, type LapFile, type Track } from '@/lib/lapData';
import type { ReferenceRow } from '@/lib/referencePoints';
import { buildReferenceSession } from '@/lib/referenceSession';

const cell = (value: number | null) => (value === null ? '—' : value.toLocaleString('en-US'));

// A measured value with the file's target beside it
function Measured({ value, target }: { value: number | null; target: number | null }) {
  return (
    <>
      <span className="font-semibold text-dark-blue">{cell(value)}</span>
      <span className="ml-2 text-xs text-slate-500">(target {cell(target)})</span>
    </>
  );
}

export default function ReferencePoints() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackName, setTrackName] = useState('');
  const [error, setError] = useState('');
  const [lapFiles, setLapFiles] = useState<LapFile[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<ReferenceRow[] | null>(null);
  const [commentary, setCommentary] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [runError, setRunError] = useState('');
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

    const files = Array.from(fileList);
    const results = await Promise.allSettled(files.map(parseLapFile));
    const added: LapFile[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') added.push(result.value);
      else errors.push(`${files[index].name}: ${(result.reason as Error).message}`);
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
    setLapFiles((prev) => [...prev, ...added.filter((lap) => !prev.some((p) => p.fileId === lap.fileId))]);
  };

  const removeFile = (fileId: string) => {
    setLapFiles((prev) => prev.filter((lap) => lap.fileId !== fileId));
  };

  const selectedTrack = tracks.find((t) => t.name === trackName);
  // Only laps from the selected track can be measured against its focus areas
  const trackLaps = selectedTrack
    ? lapFiles.filter((lap) => lap.trackName.toLowerCase() === selectedTrack.fileName.toLowerCase())
    : [];
  const otherLaps = lapFiles.length - trackLaps.length;

  const getReferencePoints = async () => {
    if (!selectedTrack) return;
    setRunning(true);
    setRunError('');
    setRows(null);
    setCommentary('');
    setSteps([]);
    try {
      const session = await buildReferenceSession(selectedTrack, trackLaps);
      const res = await fetch('/api/reference-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get the reference points');
      setRows(data.rows);
      setCommentary(data.commentary);
      setSteps(data.steps);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setRunning(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-6">
      <div>
        <label htmlFor="reference-track-name" className="block text-sm font-medium text-dark-blue mb-2">
          Track Name
        </label>
        <select
          id="reference-track-name"
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
        <label className="block text-sm text-slate-600 mb-2">Upload your lap CSVs</label>
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
            <p>Limit 25MB per file • CSV • Multiple files</p>
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

        {otherLaps > 0 && (
          <div className="mt-2 px-4 py-3 rounded-lg border text-sm bg-yellow-50 border-yellow-200 text-yellow-900">
            {otherLaps} uploaded {otherLaps === 1 ? 'lap is' : 'laps are'} not from {selectedTrack?.fileName} and will
            be left out.
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
                  📄 <span className="text-slate-500">[{lapId(lap)}]</span> {lap.driverName} • {lap.carName} •{' '}
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
          onClick={() => void getReferencePoints()}
          disabled={trackLaps.length < 1 || !selectedTrack?.areas.length || running}
          className="px-6 py-3 font-semibold text-white bg-gradient-to-r from-powder-500 to-powder-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? 'Analyzing your laps…' : 'Get Reference Points'}
        </button>

        {runError && (
          <div className="px-4 py-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-900">
            Failed: {runError}
          </div>
        )}

        {!rows && !runError && !running && (
          <p className="text-sm text-slate-500">
            {trackLaps.length < 1
              ? 'Upload at least 1 lap from the selected track, then press Get Reference Points.'
              : 'Press Get Reference Points to see the brake and throttle points for each focus area.'}
          </p>
        )}

        {rows && (
          <div className="space-y-4">
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-dark-blue">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Focus Area
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">
                      Brake Point (feet)
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">
                      Max Brake Pressure (%)
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">
                      On Throttle Point (feet)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {rows.map((row) => (
                    <tr key={row.area}>
                      <th scope="row" className="px-4 py-3 font-semibold text-dark-blue">
                        {row.area}
                      </th>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <Measured value={row.brakeFeet} target={row.brakeTargetFeet} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <Measured value={row.maxBrakePct} target={row.maxBrakeTargetPct} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <Measured value={row.throttleFeet} target={row.throttleTargetFeet} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Each point is the average of your fastest third of runs through the area (at least one), measured in feet
              from the start/finish line. Laps over 110% of the median lap time are left out as incident laps. The target is the value from
              Track_Area_Information.txt. A dash means no braking or throttle point was found in that area, or no
              target is set (a target of 0 counts as not set).
            </p>

            {commentary && (
              <div className="px-5 py-4 bg-white border border-slate-200 rounded-lg">
                <h3 className="font-bold text-dark-blue mb-2">Commentary</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{commentary}</p>
              </div>
            )}

            {steps.length > 0 && (
              <details className="text-sm text-slate-600">
                <summary className="cursor-pointer">What the agent checked ({steps.length} steps)</summary>
                <ol className="mt-2 list-decimal pl-5 space-y-1 font-mono text-xs">
                  {steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
