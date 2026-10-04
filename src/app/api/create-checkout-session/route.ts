import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/session';
import { canSubscribe } from '@/lib/users';

export async function POST(request: Request) {
  try {
    // Check if Stripe secret key and price are configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!stripeSecretKey || !priceId) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;

    // The webhook uses client_reference_id to find which user subscribed
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${origin}/login`, 303);
    }
    // Prevents a second subscription while one is still running
    if (!canSubscribe(user)) {
      return NextResponse.redirect(`${origin}/account`, 303);
    }

    const stripe = new Stripe(stripeSecretKey);

    const mode: Stripe.Checkout.SessionCreateParams.Mode = 'subscription';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'hosted_page',
      mode,
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      submit_type: 'auto',
      integration_identifier: 'hosted_web_0001',
      origin_context: 'web',
      client_reference_id: String(user.id),
      customer_email: user.emailAddress,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account`,
      line_items: [{ price: priceId, quantity: 1 }],
    };
    if (sessionParams.mode === 'subscription') {
      sessionParams.payment_method_collection = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: 'Checkout session has no URL' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error('Stripe checkout error:', error);

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
