'use client';

import { useEffect, useRef, useState } from 'react';

type Track = { name: string; fileName: string; areas: string[] };

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

const EXPECTED_COLUMNS = [
  'Speed', 'LapDistPct', 'Lat', 'Lon', 'Brake', 'Throttle', 'RPM', 'SteeringWheelAngle', 'Gear',
  'Clutch', 'ABSActive', 'DRSActive', 'P2PActive', 'LatAccel', 'LongAccel', 'VertAccel', 'Yaw',
  'YawRate', 'PositionType',
];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// "01.18.683" -> "1:18.683"
function formatLapTime(lapTime: string) {
  const [minutes, seconds, millis] = lapTime.split('.');
  return `${Number(minutes)}:${seconds}.${millis}`;
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
  const [focusAreas, setFocusAreas] = useState('');
  const [error, setError] = useState('');
  const [lapFiles, setLapFiles] = useState<LapFile[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectTrack = (name: string, trackList: Track[] = tracks) => {
    setTrackName(name);
    setFocusAreas(trackList.find((t) => t.name === name)?.areas.join('\n') ?? '');
  };

  useEffect(() => {
    fetch('/api/track-names')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load track names');
        setTracks(data.tracks);
        if (data.tracks.length > 0) selectTrack(data.tracks[0].name, data.tracks);
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (match) selectTrack(match.name);
      else errors.push(`No track in Track_Area_Information.txt has TrackFileName "${uploadedTrack}".`);
    }

    setFileErrors(errors);
    // Skip files that were already added (same unique ID)
    setLapFiles((prev) => [
      ...prev,
      ...added.filter((lap) => !prev.some((p) => p.fileId === lap.fileId)),
    ]);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="stint-track-name" className="block text-sm font-medium text-dark-blue mb-2">
            Track Name
          </label>
          <select
            id="stint-track-name"
            value={trackName}
            onChange={(e) => selectTrack(e.target.value)}
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

        <div>
          <label htmlFor="stint-focus-areas" className="block text-sm font-medium text-dark-blue mb-2">
            Focus Areas
          </label>
          <textarea
            id="stint-focus-areas"
            value={focusAreas}
            onChange={(e) => setFocusAreas(e.target.value)}
            rows={8}
            className={`${inputClass} resize-y`}
          />
        </div>
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
    </div>
  );
}
