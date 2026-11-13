import AiLockdownSwitch from '@/components/AiLockdownSwitch';
import { requireAdminPage } from '@/lib/adminAccess';
import { getAiLockdown } from '@/lib/aiLockdown';

export default async function AdminPage() {
  // The Admin page is for Admins only: visitors who aren't signed in go to
  // Log In, and everyone else gets a 404
  await requireAdminPage();
  const lockdown = await getAiLockdown();

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Admin
          </h1>
          <p className="text-lg text-slate-600">Site controls for administrators.</p>
        </div>
      </section>

      {/* Admin Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <AiLockdownSwitch initial={lockdown} />
        </div>
      </section>
    </div>
  );
}
