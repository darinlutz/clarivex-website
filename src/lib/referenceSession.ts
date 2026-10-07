// Builds the Reference Points session data in the browser: every lap measured in every focus area.

import type { ReferenceSession } from '@/lib/referencePoints';
import { lapId } from '@/lib/debriefSession';
import { areaStats, brakeFeet, lapTimeToSeconds, readLapSamples, type LapFile, type Track } from '@/lib/lapData';

export async function buildReferenceSession(track: Track, laps: LapFile[]): Promise<ReferenceSession> {
  const samples = await Promise.all(laps.map((lap) => readLapSamples(lap.file)));
  const feet = (pct: number | null) => (pct === null || !track.lengthFeet ? null : brakeFeet(pct, track.lengthFeet));

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
          brakeFeet: feet(stats.brakePct),
          maxBrakePct: stats.maxBrake * 100,
          throttleFeet: feet(stats.throttlePct),
        },
      ];
    });

    return [
      {
        name: area.name,
        range: `${(start * 100).toFixed(0)}%-${(end * 100).toFixed(0)}%`,
        brakepointTarget: area.brakepointTarget,
        maxBrakeTarget: area.maxBrakeTarget,
        throttlePickupTarget: area.throttlePickupTarget,
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
