# Stripe Integration TODO

This file is the single source of truth for the remaining Stripe Checkout setup steps.

## Values to Replace

No placeholders remain in code. The Price ID comes from an environment variable, so test and live can use different values.

**Files involved:**
- [src/app/api/create-checkout-session/route.ts](src/app/api/create-checkout-session/route.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | subscription | Set. Recurring billing. |
| success_url | `${origin}/success?session_id={CHECKOUT_SESSION_ID}` | Set. Page is [src/app/success/page.tsx](src/app/success/page.tsx). |
| cancel_url | `${origin}/account` | Set. Returns to the Account page. |
| line_items[].price | `process.env.STRIPE_PRICE_ID` | **Set `STRIPE_PRICE_ID`** in `.env.local` and in production env settings to your recurring Price ID (`price_...`) from https://dashboard.stripe.com/prices. |

`origin` is taken from the incoming request URL, so no `DOMAIN` env variable is needed.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [src/app/api/create-checkout-session/route.ts](src/app/api/create-checkout-session/route.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page (installed `stripe` SDK is 23.0.0, which is ≥ 21.0.0) |
| billing_address_collection | auto |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| allow_promotion_codes | false |
| payment_method_collection | always (sent because `mode` is "subscription") |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

## Setup

1. **Dependency.** `stripe` (^23.0.0) was added to `package.json`. Run `npm install` on any other machine or deploy target.
2. **Environment variables** in `.env.local` (and in your hosting provider's env settings for production):
   ```
   # Get from https://dashboard.stripe.com/apikeys (sk_live_... for live, sk_test_... for testing)
   STRIPE_SECRET_KEY=sk_live_...
   # Recurring Price ID from https://dashboard.stripe.com/prices (live and test prices have different IDs)
   STRIPE_PRICE_ID=price_...
   # Signing secret for the webhook endpoint (see step 3)
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
   These are server-only, so do **not** prefix them with `NEXT_PUBLIC_`. Hosted Checkout redirects server-side, so you don't need a publishable key.
3. **Webhook setup (required for go-live):**
   - In https://dashboard.stripe.com/workbench/webhooks, add a live-mode endpoint at `https://<your-domain>/api/stripe-webhook`.
   - Select the events `checkout.session.completed`, `invoice.paid` and `customer.subscription.deleted`. `customer.subscription.updated` is no longer used and can be removed.
   - Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` in production.
   - For local testing, run `stripe listen --forward-to localhost:3000/api/stripe-webhook` and use the `whsec_...` it prints. Use test keys and a test Price ID while doing this.
4. **Restricted keys:** if `STRIPE_SECRET_KEY` is a restricted key (`rk_...`), give it **Checkout Sessions: Write** permission (creating sessions, reading them on the success page) and **Subscriptions: Write** permission (the Cancel Subscription button).
5. The Stripe client is created with no API version argument, so it uses the SDK's pinned default version.

## Project Structure (new files)

```
src/app/api/create-checkout-session/route.ts   # POST: creates a Checkout Session and 303-redirects to Stripe
src/app/api/stripe-webhook/route.ts            # POST: verifies Stripe events and syncs Users.AccountStatus
src/app/success/page.tsx                        # Confirms the session status after checkout
src/app/api/cancel-subscription/route.ts       # POST: cancels the user's Stripe subscription, sets Canceled
src/components/CancelSubscriptionButton.tsx     # Cancel button with a confirm prompt
src/app/account/page.tsx                        # (modified) Signup/end dates, Subscribe and Cancel Subscription buttons
src/lib/users.ts                                # (modified) SignupDate, SubscriptionEndDate, Stripe ID columns + helpers
STRIPE_INTEGRATION_TODO.md                      # this file
```

## How It Works

1. A signed-in user clicks **Subscribe** on `/account`. The form POSTs to `/api/create-checkout-session`. Signed-out users are redirected to `/login`.
2. The route creates a subscription Checkout Session and responds with a `303` redirect to `session.url`.
3. The customer pays on the Stripe-hosted page.
4. Stripe redirects to `/success?session_id=...`. The page retrieves the session and shows a confirmation if `status` is `complete`. If the customer backs out, Stripe sends them to `/account`.
5. Stripe calls `/api/stripe-webhook`:
   - `checkout.session.completed`: looks up the user by `client_reference_id`, stores the Stripe customer and subscription IDs, sets `AccountStatus = 'Active'`, and sets `SubscriptionEndDate` to now + 1 month.
   - `invoice.paid` (monthly renewals only, `billing_reason = subscription_cycle`): sets `Active` and moves `SubscriptionEndDate` to now + 1 month.
   - `customer.subscription.deleted`: sets `Canceled`.
6. Whenever a user is loaded, a `Active` account whose `SubscriptionEndDate` has passed becomes `Expired`, for example after a failed renewal.
7. **Cancel Subscription** (shown only when `Active`) cancels the Stripe subscription immediately, with no further charges and no refund. It sets `Canceled` and keeps `SubscriptionEndDate`.
8. **Subscribe** is shown only when the status is `New`, `Expired`, or `Canceled` with `SubscriptionEndDate` in the past. The checkout route enforces the same rule.

## Testing

Use test mode keys (`sk_test_...`) and these test cards (any future expiry date, any CVC, any ZIP):

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Payment succeeds |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |
| 4000 0000 0000 9995 | Declined (insufficient funds) |

More test cards are at https://docs.stripe.com/testing.

## Next Steps

- **Gate paid features:** check `user.accountStatus === 'Active'` wherever subscribers get access.
- **Self-service billing:** add a Stripe Customer Portal link so subscribers can update cards or cancel. This uses the stored `StripeCustomerId`.
- **Go live:** set up the live webhook endpoint (Setup step 3), and use `sk_live_...` and a live-mode `STRIPE_PRICE_ID` in your production environment. Test-mode prices don't exist in live mode.

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
