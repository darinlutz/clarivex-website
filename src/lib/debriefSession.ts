// Builds the Debrief Coach's session data in the browser: every lap measured in every focus area.

import type { DebriefSession } from '@/lib/debriefCoach';
import {
  areaStats,
  brakeFeet,
  lapTimeToSeconds,
  MPH_PER_METER_PER_SECOND,
  readLapSamples,
  type LapFile,
  type Track,
} from '@/lib/lapData';

// Short lap ID shown in the app and used by the agent, e.g. "ab12"
export const lapId = (lap: LapFile) => lap.fileId.slice(-4);

export async function buildDebriefSession(track: Track, laps: LapFile[]): Promise<DebriefSession> {
  const samples = await Promise.all(laps.map((lap) => readLapSamples(lap.file)));

  const areas = track.areas.flatMap((area) => {
    const { start, end } = area;
    if (start === null || end === null) return [];

    const runs = laps.flatMap((lap, i) => {
      const stats = areaStats(samples[i], lapTimeToSeconds(lap.lapTime), start, end);
      if (!stats) return [];
      return [
        {
          lap: lapId(lap),
          seconds: stats.seconds,
          brakeFeet: stats.brakePct === null || !track.lengthFeet ? null : brakeFeet(stats.brakePct, track.lengthFeet),
          maxBrakePct: stats.maxBrake * 100,
          minSpeedMph: stats.minSpeed * MPH_PER_METER_PER_SECOND,
          exitSpeedMph: stats.exitSpeed * MPH_PER_METER_PER_SECOND,
        },
      ];
    });

    return [
      {
        name: area.name,
        range: `${(start * 100).toFixed(0)}%-${(end * 100).toFixed(0)}%`,
        brakepointTarget: area.brakepointTarget,
        maxBrakeTarget: area.maxBrakeTarget,
        runs,
      },
    ];
  });

  return {
    track: track.fileName,
    car: laps[0].carName,
    laps: laps.map((lap) => ({ id: lapId(lap), lapTime: lapTimeToSeconds(lap.lapTime) })),
    areas,
  };
}
