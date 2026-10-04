'use client';

export default function CancelSubscriptionButton() {
  return (
    <form
      action="/api/cancel-subscription"
      method="POST"
      className="mt-8"
      onSubmit={(event) => {
        if (!confirm('Cancel your subscription? You will not be charged again.')) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="w-full px-6 py-3 rounded-lg font-semibold text-red-600 bg-white border border-red-300 hover:bg-red-50 transition-colors"
      >
        Cancel Subscription
      </button>
    </form>
  );
}
