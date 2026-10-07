import TrendsTabs from '@/components/TrendsTabs';
import { isAdmin } from '@/lib/roles';
import { getCurrentUser } from '@/lib/session';

export default async function Trends() {
  // The SQL Query tab is for admins only
  const user = await getCurrentUser();

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Trends
          </h1>
          <p className="text-lg text-slate-600">
            See what people are searching for right now on Google Trends.
          </p>
        </div>
      </section>

      {/* Trends Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <TrendsTabs signedIn={!!user} canQuery={isAdmin(user?.role)} />
        </div>
      </section>
    </div>
  );
}
