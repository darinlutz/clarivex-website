// Values of users.role. Dependency-free so client components can use it.
export const ROLES = {
  admin: 'Admin',
  // Signed up but hasn't bought a subscription (account status "New")
  unsubscribed: 'Unsubscribed',
  monthly: 'Monthly Subscriber',
  lifetime: 'Lifetime Subscription',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const isAdmin = (role: string | null | undefined) => role === ROLES.admin;
