// Values of clarivex."Users".account_status. Dependency-free so pages and API
// routes can share it. Subscriptions are no longer sold on the site, so new
// accounts stay Unsubscribed; the other values remain for existing rows.
export const ACCOUNT_STATUS = {
  // Signed up, never subscribed
  unsubscribed: 'Unsubscribed',
  monthly: 'Monthly Subscription',
  lifetime: 'Lifetime Subscription',
  canceled: 'Canceled',
  expired: 'Expired',
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
