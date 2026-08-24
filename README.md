# directly.social App

**directly.social** is a multi-platform social media management application that allows users to schedule and distribute both short-form (Shorts/Reels/TikToks) and long-form video content across various platforms simultaneously.

### 🚀 Advanced Features
- **Privacy-First Analytics:** Integrated Umami Cloud for GDPR-compliant, cookieless telemetry. Tracks core usage without compromising user privacy or requiring consent banners.
- **Lifetime BYOK (Bring Your Own Key):** Professionals can plug their own OpenAI/Anthropic API keys directly into their dashboard to generate content at wholesale API prices without any markup, unlocking infinite scalability and complete privacy. See the dedicated marketing page at `/byok`.
- **Adjustable Lifetime Deal Scarcity:** A rolling cap creates true scarcity for the Lifetime Deal. If a lifetime duration is not explicitly specified, the system defaults to a **5-year fallback logic**, providing a conservative and predictable financial anchor for long-term calculations.
- **Referral Bonus Program:** Users can refer friends to earn extra posts or unlock the Lifetime BYOK tier or Free Cloud Pro.
- **Enterprise-Grade Legal Boilerplate:** The Referral Terms include comprehensive clauses for Refunds & Chargebacks, Tax Liability, Right to Modify/Terminate, Relationship of Parties, and Limitation of Liability to fully protect the platform from fraud.
- **Account Settings Suite:** Comprehensive user control panel including editable profile with private workspace notes, country-grouped searchable timezone selection, auto-saving notification preferences, secure cross-device logout, and automated data portability (export via Inngest background jobs).
- **Modern LinkedIn Video Distribution:** Safely buffers and uploads large video assets (up to 500MB) directly to LinkedIn via the modern `/rest/videos` API, bypassing legacy URN limitations with strict SSRF and LFI stream protections.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL with Prisma ORM
- **Storage:** Cloudflare R2 (S3-compatible via AWS SDK)
- **UI:** Material UI (MUI), Framer Motion
- **Testing:** Playwright (E2E), Vitest (Unit/Integration)
- **Monitoring:** Sentry
- **SEO:** Next.js Metadata API, OpenGraph, Schema.org JSON-LD

## Getting Started

### 1. Prerequisites
- Node.js 20+
- pnpm

### 2. Installation
```bash
pnpm install
```

### 3. Development
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

- `src/app/`: Next.js App Router (Pages, API Routes, Server Actions)
- `src/components/`: Reusable UI components
- `src/lib/`: Core logic, schemas, and utilities
- `src/__tests__/`: Comprehensive test suite (E2E, Unit, Integration) and test scripts
- `.agents/`: AI Agent orchestration and standards

## Core Scripts

- `pnpm build`: Production build
- `pnpm lint`: ESLint check (enforces 100-line modularity rule)
- `pnpm test`: Run unit and integration tests
- `pnpm test:smoke`: Run critical path E2E tests
- `pnpm test:regression`: Run full regression E2E tests

## Architecture & Subdomains

The application is deployed as a single monolithic Next.js application but utilizes Next.js middleware (`src/proxy.ts`) to route requests to specific folders based on the hostname:

- **`directly.social`**: The marketing and landing page. Requests are transparently routed to `src/app/marketing`.
- **`app.directly.social`**: The authenticated application dashboard. Requests are transparently routed to `src/app/app`.
- **`staging.app.directly.social`**: The dedicated staging environment.

For detailed information on the Vercel branch preview routing and the rate limiting logic, see [Subdomain Routing Docs](docs/features/SUBDOMAIN_ROUTING.md).

## Local Development

Ensure your local `.env` has the correct Supabase secrets.

## Authentication Strategy

The primary front-door login is strictly restricted to **Google and Email (Magic Link/OTP)** to prevent account fragmentation. Other social platforms (Facebook, TikTok) are treated as post-authentication integrations and can be connected via the internal settings dashboard.

## Data & Privacy

- **AI Processing Consent**: Users must explicitly opt-in to AI processing (via the `aiProcessingConsent` boolean in the database) before their data is sent to external AI providers. A bypass flag `NEXT_PUBLIC_E2E=true` is available to skip the consent block during automated testing.

## API Documentation

**directly.social** features a centralized API documentation system powered by Swagger/OpenAPI.
Access the interactive Swagger UI at `/api/docs` in your local development environment.

## AI Agent Orchestration

This project uses an agentic workflow defined in `GEMINI.md` and `.agents/base/ORCHESTRATION.md`. The workflow ensures high-quality code delivery through distinct phases: Discovery, Development, Review, QA, and Documentation.
For more details, see [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md).

## Webhooks & Referral Program

The Referral Bonus Program utilizes Stripe Webhooks to grant rewards for paid conversions.
- To test Stripe Webhooks locally without cryptographic signatures, ensure you set `E2E_MOCK_WEBHOOKS=true` in your `.env` file **(Local/E2E testing only)**.
- In production, Stripe signatures are strictly verified. Ensure `STRIPE_WEBHOOK_SECRET` is set in your environment.
- Referral links are structured as `/?ref=<userId>`.

## Documentation Index

Comprehensive documentation is available in the `docs/` directory:
- [Architecture Overview](docs/architecture/OVERVIEW.md)
- [Testing & QA](docs/architecture/TESTING_QA.md)
- [Deployment Guide](docs/LAUNCH_GUIDE.md)
- [Mobile Architecture](docs/architecture/MOBILE.md)
