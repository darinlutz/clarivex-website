// Statistics for the Stint Analysis tab, computed from a Garage 61 stint export.

import { formatSeconds, formatTempF, type StintExport, type StintLap } from '@/lib/stintExport';

function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Sample standard deviation (n - 1); needs at least two values
function stdDev(values: number[]) {
  if (values.length < 2) return null;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1));
}

// Least-squares slope of ys against xs (e.g. seconds per lap)
function slope(xs: number[], ys: number[]) {
  const mx = mean(xs);
  const my = mean(ys);
  const denominator = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  if (denominator === 0) return null;
  return xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0) / denominator;
}

// Pearson correlation; null when either series doesn't vary
function correlation(xs: number[], ys: number[]) {
  const mx = mean(xs);
  const my = mean(ys);
  const sxy = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  const syy = ys.reduce((sum, y) => sum + (y - my) ** 2, 0);
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

const seconds = (value: number | null) => (value === null ? 'n/a' : `${value.toFixed(3)}s`);
const signed = (value: number) => `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(3)}s`;

// Why a lap doesn't count toward the stint statistics, or null if it does
function exclusionReason(lap: StintLap) {
  if (lap.pitOut) return 'out lap';
  if (lap.pitIn) return 'in lap';
  if (lap.sectors.length > 0 && lap.sectors.some((s) => s === null)) return 'incomplete lap';
  if (!lap.clean) return 'not clean';
  return null;
}

// Plain-text stint report: shown in the text box and sent to the AI for the summary
export function stintReport(stint: StintExport) {
  const timed = stint.laps.filter((lap) => exclusionReason(lap) === null);
  const excluded = stint.laps.filter((lap) => exclusionReason(lap) !== null);
  const first = stint.laps[0];
  const lines = [
    `Driver: ${first.driver}`,
    `Started: ${new Date(first.startedAt).toLocaleString()}`,
    `Laps in export: ${stint.laps.length}, timed laps (clean, complete, no pit): ${timed.length}`,
  ];
  if (excluded.length > 0) {
    lines.push(`Excluded: ${excluded.map((lap) => `lap ${lap.lap} (${exclusionReason(lap)})`).join(', ')}`);
  }
  lines.push('');

  if (timed.length < 2) {
    lines.push('Need at least 2 clean, complete laps to analyze the stint.');
    return lines.join('\n');
  }

  // Lap times
  const times = timed.map((lap) => lap.lapSeconds);
  const best = timed.reduce((a, b) => (b.lapSeconds < a.lapSeconds ? b : a));
  const worst = timed.reduce((a, b) => (b.lapSeconds > a.lapSeconds ? b : a));
  const avg = mean(times);
  const withinHalf = times.filter((t) => t - best.lapSeconds <= 0.5).length;
  lines.push(
    'Lap times:',
    `  Best ${formatSeconds(best.lapSeconds)} (lap ${best.lap}), average ${formatSeconds(avg)}, worst ${formatSeconds(worst.lapSeconds)} (lap ${worst.lap})`,
    `  Std dev ${seconds(stdDev(times))}, spread ${(worst.lapSeconds - best.lapSeconds).toFixed(3)}s, ${withinHalf} of ${timed.length} laps within 0.5s of best`
  );

  // Pace trend: first half vs second half, and the per-lap slope
  const half = Math.floor(timed.length / 2);
  const firstHalf = mean(times.slice(0, half));
  const secondHalf = mean(times.slice(timed.length - half));
  const trend = slope(timed.map((lap) => lap.lap), times);
  lines.push(
    `  First ${half} laps avg ${formatSeconds(firstHalf)}, last ${half} laps avg ${formatSeconds(secondHalf)} (${signed(secondHalf - firstHalf)})`,
    `  Trend ${trend === null ? 'n/a' : `${signed(trend)} per lap`}`,
    ''
  );

  // Sectors
  if (stint.sectorCount > 0) {
    const sectorStats = Array.from({ length: stint.sectorCount }, (_, i) => {
      const values = timed.map((lap) => lap.sectors[i] as number);
      const bestValue = Math.min(...values);
      return {
        number: i + 1,
        best: bestValue,
        bestLap: timed[values.indexOf(bestValue)].lap,
        avg: mean(values),
        stdDev: stdDev(values),
      };
    });
    const theoretical = sectorStats.reduce((sum, s) => sum + s.best, 0);
    lines.push(
      `Theoretical best (best sectors combined): ${formatSeconds(theoretical)}, ${(best.lapSeconds - theoretical).toFixed(3)}s faster than your best lap`,
      '',
      'Sectors (avg lost = average minus best):'
    );
    for (const s of sectorStats) {
      lines.push(
        `  Sector ${s.number}: best ${s.best.toFixed(3)}s (lap ${s.bestLap}), avg ${s.avg.toFixed(3)}s, ` +
          `avg lost ${(s.avg - s.best).toFixed(3)}s, std dev ${seconds(s.stdDev)}`
      );
    }
    const mostLost = sectorStats.reduce((a, b) => (b.avg - b.best > a.avg - a.best ? b : a));
    const leastConsistent = sectorStats.reduce((a, b) => ((b.stdDev ?? 0) > (a.stdDev ?? 0) ? b : a));
    lines.push(
      `  Most time lost on average: sector ${mostLost.number}; least consistent: sector ${leastConsistent.number}`,
      ''
    );
  }

  // Conditions and their relation to pace
  const trackTemps = timed.map((lap) => lap.trackTempC);
  const tempCorrelation = correlation(trackTemps, times);
  lines.push(
    'Conditions:',
    `  Track temp ${formatTempF(trackTemps[0])} at the start, ${formatTempF(trackTemps[trackTemps.length - 1])} at the end ` +
      `(range ${formatTempF(Math.min(...trackTemps))} – ${formatTempF(Math.max(...trackTemps))})`,
    `  Air temp ${formatTempF(Math.min(...timed.map((l) => l.airTempC)))} – ${formatTempF(Math.max(...timed.map((l) => l.airTempC)))}, ` +
      `humidity ${Math.round(Math.min(...timed.map((l) => l.relativeHumidity)) * 100)}–${Math.round(Math.max(...timed.map((l) => l.relativeHumidity)) * 100)}%`,
    `  Correlation between track temp and lap time: ${tempCorrelation === null ? 'n/a (track temp did not change)' : tempCorrelation.toFixed(2)}`,
    ''
  );

  // Fuel
  const fuelPerLap = mean(timed.map((lap) => lap.fuelUsed));
  const last = stint.laps[stint.laps.length - 1];
  const fuelLeft = last.fuelLevel - (last.fuelUsed || 0);
  lines.push(
    'Fuel:',
    `  Average ${fuelPerLap.toFixed(2)} L per timed lap; ${fuelLeft.toFixed(1)} L left at the end (about ${Math.floor(fuelLeft / fuelPerLap)} more lap${Math.floor(fuelLeft / fuelPerLap) === 1 ? '' : 's'})`
  );

  return lines.join('\n');
}
