import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { renewSubscription, setStatusBySubscriptionId, startSubscription } from '@/lib/users';

export async function POST(request: Request) {
  // Check if Stripe keys are configured
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !webhookSecret) {
    console.error('Stripe webhook is not configured');
    return NextResponse.json(
      { error: 'Stripe webhook is not configured' },
      { status: 500 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  // Signature verification needs the raw, unparsed body
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // First payment: mark the user Active for one month
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = Number(session.client_reference_id);
        if (
          session.mode !== 'subscription' ||
          !Number.isInteger(userId) ||
          typeof session.customer !== 'string' ||
          typeof session.subscription !== 'string'
        ) {
          console.warn('Checkout session not linked to a user:', session.id);
          break;
        }
        // Subscription mode sessions only complete once the first payment succeeds
        await startSubscription(userId, session.customer, session.subscription);
        break;
      }
      // Monthly renewal paid: extend the subscription another month
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscription = invoice.parent?.subscription_details?.subscription;
        // The first invoice is handled by checkout.session.completed
        if (invoice.billing_reason !== 'subscription_cycle' || !subscription) break;
        await renewSubscription(
          typeof subscription === 'string' ? subscription : subscription.id
        );
        break;
      }
      // Subscription ended (canceled here, in the Dashboard, or after failed payments)
      case 'customer.subscription.deleted': {
        await setStatusBySubscriptionId(event.data.object.id, 'Canceled');
        break;
      }
      default:
        console.log('Unhandled Stripe event type:', event.type);
    }
  } catch (error) {
    // A non-2xx response makes Stripe retry the event later
    console.error('Stripe webhook handling error:', error);
    return NextResponse.json(
      { error: 'Webhook handling failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
