# Clarivex Website Developer Guidelines

<!-- BEGIN:nextjs-agent-rules -->
## ⚠️ Next.js 16.2.6 Breaking Changes

This project uses **Next.js 16.2.6** with breaking changes — APIs, conventions, and file structure may differ from older versions. **Always** read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

Key differences:
- React 19.2.4 (with new features and changes from v18)
- Updated App Router patterns
- Tailwind CSS 4 changes
<!-- END:nextjs-agent-rules -->

## Project Overview

**Clarivex** is a business automation consulting website specializing in process automation and integration services.

**Tech Stack:**
- Frontend: Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4
- Backend: Node.js API routes, Python automation scripts
- Integrations: Clockify (time tracking), Resend (email), Bitcoin data fetching
- Styling: Tailwind CSS 4 with custom color palette (`powder-*`, `dark-blue`)

## Quick Start

```bash
npm run dev          # Development server on http://localhost:3000
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

**Environment Variables** (`.env.local`):
- `CLOCKIFY_API_KEY` - Clockify workspace API key
- `RESEND_API_KEY` - Resend email service API key
- `OPENAI_API_KEY` - OpenAI API key (LangChain/LangGraph agents: translate, friend, trip planner, financial analysis)
- `TAVILY_API_KEY` - Tavily web search API key (Financial Analysis web search agent)
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage API key (Financial Analysis stock data agent)
- `TURSO_DATABASE_URL` - Turso/libSQL database URL (Friends roster persistence). Omit locally to fall back to a `local.db` file
- `TURSO_AUTH_TOKEN` - Turso auth token, paired with `TURSO_DATABASE_URL`

## Project Structure

```
src/
├── app/              # App Router root
│   ├── layout.tsx    # Root layout with Navigation & Footer
│   ├── page.tsx      # Home page (Bitcoin ticker, hero, CTA)
│   ├── globals.css   # Global Tailwind styles
│   ├── api/
│   │   ├── bitcoin/      # Bitcoin price ticker data
│   │   ├── clockify/     # Clockify integration endpoints
│   │   ├── contact/      # Contact form submissions (Resend)
│   │   ├── inquiry/      # Business inquiry handling
│   │   └── timesheet/    # Timesheet management
│   ├── contact/      # Contact page
│   ├── solutions/    # Solutions showcase page
│   └── timesheet/    # Timesheet page
└── components/       # Reusable React components
    ├── Navigation.tsx
    ├── Footer.tsx
    ├── BitcoinTicker.tsx
    ├── ContactForm.tsx
    ├── TimesheetForm.tsx
```

**Python Components** (backend automation):
- `clockify_entry.py` - Automated Clockify time entry management
- `plot_stock.py` - Generates a stock closing-price chart (PNG, base64 over stdout) from live Alpha Vantage data; invoked as a subprocess from `src/lib/financialAnalysis.ts`'s CodeAgent node
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
- **API endpoint**: `/api/clockify/projects` - Fetches active projects

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
