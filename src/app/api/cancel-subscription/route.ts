import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/session';
import { getSiteOrigin } from '@/lib/siteOrigin';
import { setStatusBySubscriptionId } from '@/lib/users';
import { ACCOUNT_STATUS } from '@/lib/accountStatus';

export async function POST(request: Request) {
  try {
    const origin = getSiteOrigin(request);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${origin}/login`, 303);
    }

    if (user.accountStatus !== ACCOUNT_STATUS.monthly || !user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }

    // Check if Stripe secret key is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Cancels immediately: no further charges, no refund. SubscriptionEndDate is kept.
    const stripe = new Stripe(stripeSecretKey);
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    await setStatusBySubscriptionId(user.stripeSubscriptionId, ACCOUNT_STATUS.canceled);

    return NextResponse.redirect(`${origin}/account`, 303);
  } catch (error) {
    console.error('Stripe cancel subscription error:', error);

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
