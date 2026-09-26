import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const TRACK_FILE_PATH = path.join(process.cwd(), 'data', 'Track_Area_Information.txt');

// start/end are fractions of a lap (LapDistPct), e.g. 0.02 = 2%
type Area = { name: string; start: number; end: number };
type Track = { name: string; fileName: string; lengthFeet: number | null; areas: Area[] };

// Returns the top-level keys of the TrackConfig object (the track names), each
// track's TrackFileName (the name used in Garage 61 CSV file names) and
// TrackLengthInFeet, and the areas under each, in the order they appear in the file.
// Depth: 1 = TrackConfig, 2 = track, 3 = areas array, 4 = area object.
function parseTracks(contents: string): Track[] {
  const tracks: Track[] = [];
  let depth = 0;

  const currentArea = () => {
    const areas = tracks[tracks.length - 1]?.areas;
    return areas?.[areas.length - 1];
  };

  for (let i = 0; i < contents.length; i++) {
    const ch = contents[i];

    // Skip line comments
    if (ch === '/' && contents[i + 1] === '/') {
      const newline = contents.indexOf('\n', i);
      i = newline === -1 ? contents.length : newline;
      continue;
    }

    if (ch === '"') {
      const end = contents.indexOf('"', i + 1);
      if (end === -1) break;
      const value = contents.slice(i + 1, end);
      const before = contents.slice(Math.max(0, i - 30), i);
      i = end;

      if (depth === 1 && /^\s*:/.test(contents.slice(end + 1, end + 20))) {
        // A quoted key at depth 1 is a track name
        tracks.push({ name: value, fileName: value, lengthFeet: null, areas: [] });
      } else if (depth === 2 && /\bTrackFileName\s*:\s*$/.test(before) && tracks.length > 0) {
        tracks[tracks.length - 1].fileName = value;
      } else if (depth === 4 && /\bname\s*:\s*$/.test(before)) {
        const area = currentArea();
        if (area) area.name = value;
      }
      continue;
    }

    // The numeric TrackLengthInFeet property of a track
    if (depth === 2 && ch === 'T' && !/\w/.test(contents[i - 1] ?? '')) {
      const match = /^TrackLengthInFeet\s*:\s*(\d*\.?\d+)/.exec(contents.slice(i, i + 40));
      if (match && tracks.length > 0) {
        tracks[tracks.length - 1].lengthFeet = Number(match[1]);
        i += match[0].length - 1;
        continue;
      }
    }

    // The numeric start/end properties of an area object
    if (depth === 4 && (ch === 's' || ch === 'e') && !/\w/.test(contents[i - 1] ?? '')) {
      const match = /^(start|end)\s*:\s*(-?\d*\.?\d+(?:e-?\d+)?)/.exec(contents.slice(i, i + 40));
      const area = currentArea();
      if (match && area) {
        area[match[1] as 'start' | 'end'] = Number(match[2]);
        i += match[0].length - 1;
        continue;
      }
    }

    if (ch === '{' || ch === '[') {
      // An object opening inside an areas array starts a new area
      if (ch === '{' && depth === 3 && tracks.length > 0) {
        tracks[tracks.length - 1].areas.push({ name: '', start: NaN, end: NaN });
      }
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
    }
  }

  return tracks;
}

export async function GET() {
  try {
    const contents = await readFile(TRACK_FILE_PATH, 'utf-8');
    return NextResponse.json({ tracks: parseTracks(contents) });
  } catch (error) {
    console.error('Failed to read track names:', error);
    return NextResponse.json({ error: 'Failed to load track names' }, { status: 500 });
  }
}
