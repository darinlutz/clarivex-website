import { readLatestWeight } from '@/lib/weightStore';

export const dynamic = 'force-dynamic';

async function getMostRecentWeight(): Promise<string> {
  const latest = await readLatestWeight();
  if (!latest) {
    return 'No weight recorded yet.';
  }
  const recordedAt = new Date(latest.recordedAt).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return `${latest.weightLb.toFixed(1)} lb (recorded ${recordedAt})`;
}

export default async function WeightPage() {
  const mostRecentWeight = await getMostRecentWeight();

  return (
    <div className="w-full">
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Weight
          </h1>
          <p className="text-lg text-slate-600">
            Review the most recent weight reading synced from Apple Health.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
            <label htmlFor="most-recent-weight" className="block text-sm font-medium text-dark-blue mb-2">
              Most Recent Weight
            </label>
            <input
              id="most-recent-weight"
              type="text"
              value={mostRecentWeight}
              readOnly
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
