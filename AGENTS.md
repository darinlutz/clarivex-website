# Clarivex Website Developer Guidelines

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Overview

**Clarivex** is a business automation consulting website specializing in process automation and integration services.

**Tech Stack:**
- Frontend: Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4
- Backend: Node.js API routes, Python automation scripts
- Integrations: Clockify (time tracking), Resend (email), OpenAI/Tavily/Alpha Vantage (Sandbox AI features), Bitcoin data fetching
- Styling: Tailwind CSS 4 with custom color palette (`powder-*`, `dark-blue`)

## Quick Start

```bash
npm run dev          # Development server on http://localhost:3000
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

**Environment Variables** (`.env.local`):
- `CLOCKIFY_API_KEY` - Clockify workspace API key (used by `clockify_entry.py`)
- `RESEND_API_KEY` - Resend email service API key
- `RESEND_FROM_EMAIL` - Sender for the email verification and password reset emails, on a domain verified in Resend (e.g. `Clarivex <no-reply@clarivex.app>`). Defaults to `onboarding@resend.dev`, which only delivers to the Resend account owner
- `SITE_URL` - Public site URL used in email verification and password reset links (e.g. `https://clarivex.app`). Set in production; locally it falls back to the request's host
- `OPENAI_API_KEY` - OpenAI API key (LangChain/LangGraph agents: trip planner, financial analysis; web search for the Sandbox page's Google Trends tab)
- `OPENAI_ADMIN_KEY` - OpenAI Admin API key (`sk-admin-...`, created under Organization settings → Admin keys with read access to Usage). Used only by the Sandbox page's AI Usage Limits tab (admins only) to list API keys and this month's spend per project; the regular `OPENAI_API_KEY` can't do this
- `TAVILY_API_KEY` - Tavily web search API key (Financial Analysis web search agent)
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage API key (Financial Analysis stock data agent)
- `DATABASE_URL` - PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/clarivex`. Passed to `pg` as-is. Required; tables are created on first use (`ensureUserSchema()` in `src/lib/users.ts`). Everything lives in the `clarivex` schema: `"Users"` (role `Admin` for the site owner, `User` for everyone else; `email_verified`), `"Friends"`, `"Sessions"`, `"PasswordResets"`, `"EmailVerifications"` and `"SiteSettings"` (the AI lockdown)
- `WEIGHT_WEBHOOK_SECRET` - Shared secret for `POST /api/weight`

## Accounts, Roles & Access

- **Roles** (`src/lib/roles.ts`): `Admin` and `User`. Sign-up always assigns `User`; only the site owner's address (`OWNER_EMAIL` in `src/lib/users.ts`) is `Admin`. The Account page shows the role under Account Status.
- **Email verification** (`src/lib/emailVerification.ts`): sign-up emails a link and does not sign the user in; log-in is refused until the link has been opened. Using a password reset link also verifies the address.
- **Password reset** (`src/lib/passwordReset.ts`): "Forgot password?" on the Log In and Sign Up forms emails a one-hour, single-use link to `/reset-password`.
- **Emails** (`src/lib/email.ts`): both emails share one branded layout (`renderEmail`) and are sent with `sendEmail` (Resend).
- **Admin-only pages**: `/sandbox` (all the AI experiments plus SQL Query and AI Usage Limits) and `/admin`. Start each such page with `requireAdminPage()` from `src/lib/adminAccess.ts`; the nav links are hidden for everyone else, but the page check is what protects them.
- **AI routes**: every API route that runs a model (or a script that does) must start with `requireAi()` from `src/lib/adminAccess.ts`: Admin session required, and nobody while the lockdown is on. Other Admin-only routes use `requireAdmin()`.
- **AI lockdown** (`src/lib/aiLockdown.ts`): the emergency switch on the Admin page (`/api/admin/ai-lockdown`), stored in `clarivex."SiteSettings"`.
- **Rate limits** (`src/lib/rateLimit.ts`): in-memory limits on log-in, sign-up and the email forms.
- The Racing page was removed; its API routes (`lap-summary`, `debrief-coach`, `friends-roster`, ...) remain, Admin-only, with no UI.

## Project Structure

```
src/
├── app/              # App Router root
│   ├── layout.tsx    # Root layout with Navigation & Footer
│   ├── page.tsx      # Home page (tickers, hero, CTA)
│   ├── globals.css   # Global Tailwind styles
│   ├── api/
│   │   ├── auth/         # signup, login, logout, verify-email, forgot-password, reset-password
│   │   ├── admin/        # ai-lockdown (Admin page switch)
│   │   ├── bitcoin/ ...  # Public price tickers
│   │   ├── contact/      # Contact form submissions (Resend)
│   │   └── ...           # AI routes (trip-planner, agent, trends, pdf-analyzer, ...), all behind requireAi()
│   ├── account/      # Account page (status, role)
│   ├── admin/        # Admin page (Admins only): emergency AI lockdown
│   ├── sandbox/      # Sandbox page (Admins only): AI experiments and admin tools
│   ├── login/, signup/, reset-password/
│   ├── contact/      # Contact page
│   └── solutions/    # Solutions showcase page
├── components/       # Reusable React components
└── lib/              # Server and shared logic (users, session, adminAccess, email, ...)
```

**Python Components** (backend automation):
- `clockify_entry.py` - Automated Clockify time entry management
- `plot_stock.py` - Generates a stock closing-price chart (PNG, base64 over stdout) from live Alpha Vantage data; invoked as a subprocess from `src/lib/financialAnalysis.ts`'s CodeAgent node
- `beep_generator.py` - Standalone, standard-library-only beep sequence → WAV generator (`generate_beeps()`, plus a CLI). Not called by the site: the Sandbox's Beep Generator tab runs a sample-identical TypeScript port (`src/lib/beepGenerator.ts`) in the browser, so keep the two in step. Tests: `python -m unittest discover -s tests`
- `requirements.txt` - Python dependencies (requires `pandas`/`matplotlib` for `plot_stock.py`)

## Development Conventions

### File Organization
- **Page components** in `src/app/[route]/page.tsx`
- **API routes** in `src/app/api/[feature]/route.ts`
- **Reusable components** in `src/components/`
- **One component per file** with matching exported name

### Styling
- Use Tailwind CSS utility classes (no CSS-in-JS)
- Custom colors: `powder-500/600` (primary), `dark-blue` (text), `slate-*` (neutrals)
- Gradients common in hero sections and CTAs: `bg-gradient-to-r from-powder-500 to-powder-600`

### API Route Patterns
- Validate input early (required fields, email format)
- Check environment variables before making external calls
- Return `NextResponse.json()` with appropriate status codes
- Handle errors gracefully with clear error messages

**Example API route structure:**
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validate
    if (!body.requiredField) {
      return NextResponse.json({ error: 'Missing field' }, { status: 400 });
    }
    // Process
    // Return
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## External Integrations

### Clockify API
- **Workspace ID**: `5f5fb2a73ab33d735bc7ca3a`
- **Docs**: https://docs.clockify.me/
- **Python tool** (`clockify_entry.py`): Creates time entries, respects workdays/holidays

### Resend Email Service
- **Docs**: https://resend.com/docs
- **Usage**: Contact form submissions sent via Resend
- **Config**: API key in `.env.local`

### Bitcoin Ticker
- Fetches real-time Bitcoin price data
- Component: `BitcoinTicker.tsx`
- No external API—check route implementation for data source

## Linting & Code Quality

**ESLint configuration** (`eslint.config.mjs`):
- Next.js Core Web Vitals rules
- TypeScript support
- Uses modern ESLint flat config format

```bash
npm run lint         # Check all files
```

**Ignored paths**: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Common Tasks

### Add a New Page
1. Create file: `src/app/[page-name]/page.tsx`
2. Export default React component
3. Add route to `Navigation.tsx` if needed

### Add an API Endpoint
1. Create `src/app/api/[feature]/route.ts`
2. Implement `GET`, `POST`, etc. handlers
3. Add env variables to `.env.local` if needed

### Update Tailwind Styles
1. Edit `tailwind.config.ts` for theme/colors
2. Use classes in components (auto-generated)
3. No build step needed—watch mode handles it

## Troubleshooting

**npm run dev fails with "command not found"?**
- Ensure Node.js 18+ is installed
- Run `npm install` first
- Check that `.env.local` exists (can be empty initially)

**ESLint errors on import statements?**
- Verify TypeScript path aliases in `tsconfig.json` (e.g., `@/*` → `src/*`)
- Run `npm run lint -- --fix` to auto-fix common issues

**Build succeeds but `npm start` is slow?**
- Normal for first cold start
- Production bundle includes optimizations
- Subsequent requests are faster

## Related Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/12/19/react-19)
- [Tailwind CSS 4 Changelog](https://tailwindcss.com/docs/v4)
- [TypeScript Configuration](tsconfig.json)
