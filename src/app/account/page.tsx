import { redirect } from 'next/navigation';
import CancelSubscriptionButton from '@/components/CancelSubscriptionButton';
import { getCurrentUser } from '@/lib/session';
import { canSubscribe } from '@/lib/users';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'long' });
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-slate-100 to-white flex justify-center">
      <div className="w-full max-w-lg bg-slate-50 rounded-xl border border-slate-200 p-6 sm:p-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
          My Account
        </h1>
        <p className="text-slate-600 mb-8">Your account details.</p>

        <dl className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="text-dark-blue font-medium text-right">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div className="flex justify-between items-center gap-4 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">Account Status</dt>
            <dd>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-powder-500/15 text-powder-600">
                {user.accountStatus}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">Signup Date</dt>
            <dd className="text-dark-blue font-medium text-right">
              {formatDate(user.signupDate)}
            </dd>
          </div>
          {user.accountStatus === 'Active' && (
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm font-medium text-slate-500">Subscription End Date</dt>
              <dd className="text-dark-blue font-medium text-right">
                {formatDate(user.subscriptionEndDate)}
              </dd>
            </div>
          )}
        </dl>

        {canSubscribe(user) && (
          <form action="/api/create-checkout-session" method="POST" className="mt-8">
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-powder-500 to-powder-600 hover:from-powder-600 hover:to-powder-500 transition-colors"
            >
              Subscribe
            </button>
          </form>
        )}

        {user.accountStatus === 'Active' && <CancelSubscriptionButton />}
      </div>
    </section>
  );
}
