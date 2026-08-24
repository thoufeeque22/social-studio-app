<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Global Management Policies

> **Primary rules file for Agy (Antigravity).** `GEMINI.md` at the repo root is deprecated and no longer authoritative — these rules take precedence.

- **Phase Throttling (Human-in-the-Loop):** The Orchestrator MUST terminate its turn after calling exactly one sub-agent. NEVER chain sub-agents autonomously. ALL phase transitions (per `PHASE_ORDER` in [VARIABLES.md](base/VARIABLES.md)) MUST be approved by the user.
- **Artifact-First Protocol (replaces State-First):** Before invoking any sub-agent or performing any action, the Orchestrator MUST create or update an Artifact using Agy's native `write_to_file` tool into `<appDataDir>/brain/<conversation-id>/`. Do NOT write state to `.agents/state/ticket-<id>/` — that path is obsolete.
- **Ticket Initialization / Initialization Precedence:** Before starting work on a new ticket/task, strictly follow this orchestration:
  1. **Standard Branch:** Stash untracked/local changes (`git stash -u`), checkout main (`git checkout main`), pull latest (`git pull`), and create branch (`git checkout -b <branch_name>`). DO NOT use `BypassSandbox` directly if a simple `git pull` fails due to local changes.
  2. Start working in the appropriate directory.
  Every new ticket MUST also follow the workflow defined in [ORCHESTRATION.md](base/ORCHESTRATION.md).
- **Explicit Commit Permission & Auto-Handoff:** AI agents MUST NOT commit changes without user permission, EXCEPT during phase handoffs. As defined in [ORCHESTRATION.md](base/ORCHESTRATION.md), the Orchestrator automatically checkpoints changes upon handoff approval.
- **Strict Phase Guardrails (Test-Driven Transition):** The Orchestrator MUST NOT transition from the `Discovery` phase directly to the `Development` phase. Even when a technical blueprint is approved, the Orchestrator MUST force a stop to generate the automated E2E test scripts (`.spec.ts`) and manual test document in the `QA` phase FIRST. Writing application code (`src/`) before generating QA artifacts is a terminal violation.
- **Verification Integrity (Strict Push-Gate):** Local verification MUST be exhaustive (`npx tsc --noEmit`, `pnpm lint`, or `pnpm build`). The Orchestrator is **strictly forbidden** from executing a `git push` or concluding a phase until a full compilation check passes. Playwright passing is NOT sufficient to bypass type-checking. NEVER use 'surgical' or 'token-optimized' checks unless explicitly instructed by the user.
- **Technical Excellence:** ALL code MUST adhere to the standards in [CORE.md](base/CORE.md). **MANDATORY:** Invoke the `arxitect:architect` skill for ALL new feature implementations and refactors.
- **Aesthetic Integrity:** ALL UI MUST adhere to the standards in [UI_UX.md](base/UI_UX.md) (MUI, Theme Awareness, No Emojis).
- **Manual Environment Management:** The User manages the dev server, the E2E test server (http://localhost:3000), and tunnels manually. Agents MUST NOT interfere.
- **Context Preservation:** Agents must never destructively overwrite artifact files.

## Standards Reference

1. **[Core Technical Standards](base/CORE.md)** — TypeScript Zero-Any, Next.js 15, 100-Line Modularity
2. **[UI & Aesthetic Standards](base/UI_UX.md)** — MUI, Theme Awareness, A11y, No Emojis
3. **[Production & Infrastructure](base/PRODUCTION.md)** — Performance, Security, Supabase DB
4. **[Agent Orchestration & Workflow](base/ORCHESTRATION.md)** — Phase Sequence, Failure Protocols
5. **[Global Variables & Constants](base/VARIABLES.md)** — Branching, commands, skill names

*Agents MUST read the relevant base files before starting any task.*

---

# Strict AI Coding Guidelines & Rules

To ensure production-level stability and prevent build failures or linting warnings, ALL AI agents modifying this codebase MUST strictly adhere to the following rules:

### 1. TypeScript Strictness (Zero Tolerance for `any`)
- **NEVER use the `any` type.** There are zero exceptions.
- When parsing external data (API responses, JSON), use `unknown` and validate the shape or cast it explicitly to a defined interface/type.
- Inside `catch` blocks, always use `catch (error: unknown)`. Narrow it down before accessing properties: `const message = error instanceof Error ? error.message : String(error);`.
- Avoid arbitrary type assertions (`as Type`) unless absolutely necessary, and never chain `as unknown as Type` unless interacting with deeply incompatible external libraries.

### 2. Modern React & Next.js Conventions
- **React 19 / Next.js 15 Forms:** Use `action={...}` passing `FormData` instead of the legacy `onSubmit={...}` paired with `React.FormEvent`.
- **Client/Server boundaries:** Ensure `'use client'` is only used when hooks (`useState`, `useEffect`) or browser APIs are required.
- **Hydration & Storage:** Do not use `window` for global variables; use `globalThis` instead. **NEVER** read from `localStorage` or `sessionStorage` in a `useState` initializer or directly in the component body during render. Always use a `useEffect` hook to synchronize state with browser storage after the initial client-side mount to avoid SSR hydration mismatches.
- **Middleware Naming:** Since Next.js 16, the middleware file convention has changed. Always name the Next.js middleware file exactly `proxy.ts` inside the `src/` directory (or root). Do NOT name it `middleware.ts` (it is deprecated) and ensure the middleware logic is Edge-compatible (e.g., use `supabase/middleware.ts` for Supabase Auth, do not import Prisma).


### 3. Strict Accessibility (A11y) Compliance
- Follow `eslint-plugin-jsx-a11y` rules flawlessly.
- **Labels:** Every `<input>` MUST have a corresponding `<label>` either wrapping it or linked via `htmlFor`/`id`.
- **Interactive Elements:** Do NOT add `onClick` handlers to non-interactive elements like `<div>` or `<span>`. Use semantic `<button>` tags. 
- If a custom wrapper element is absolutely necessary for styling over an input, prefer using a `<label>` as the wrapper so clicks automatically focus the input natively without needing `(input as HTMLInputElement).showPicker()`.

### 4. Code Quality & Cleanliness
- **Modularity Strictness (No Linter Evasion):** The 100-line strict modularity rule outlined in `CORE.md` MUST NOT be bypassed using `/* eslint-disable max-lines */` in UI components. Monolithic UI components must be split logically into feature sections and isolated hooks, instead of suppressing the linter.
- **No nested ternaries.** Avoid code like `condition1 ? result1 : condition2 ? result2 : result3`. Extract this into a mapping object (`Record<string, string>`) or a dedicated helper function.
- **Optional Chaining:** Prefer `obj?.prop?.sub` over verbose checks like `if (obj && obj.prop && obj.prop.sub)`.
- Use standard JS/TS features: `Array.prototype.some/every` instead of complex `reduce` loops, and `Date.now()` instead of `new Date().getTime()`.
- Avoid cognitive complexity: if a function exceeds 15 lines of dense logic, break it down into smaller helper functions.

### 5. Transient & State Files
- **Strictly No Transient Files in `.agents/`:** NEVER write `BRIEFING.md`, `progress.md`, `handoff.md`, `ORIGINAL_REQUEST.md`, or any other temporary orchestration state files to `.agents/` or its subdirectories. `.agents/state/ticket-*/` is **obsolete** — do NOT create new directories there.
- **Target Directory:** All phase artifacts and transient files MUST be written using Agy's native `write_to_file` tool to `<appDataDir>/brain/<conversation-id>/` (artifacts) or `<appDataDir>/brain/<conversation-id>/scratch/` (scratch files). These paths are injected into your context — use them directly.

### 6. Code Refactoring & Cleanup Hazards
- **Stale Imports/Variables:** When deleting or relocating UI components, always double-check for unused imports (e.g., `Image` from `next/image`) and orphaned props. `@typescript-eslint/no-unused-vars` will fail the build if these are left behind.
- **Type Casting & "Zero-Any" strictness:** Never lazily cast to `any` to bypass complex type errors (such as third-party SDK namespace collisions like `Stripe.Subscription`). Instead, use precise intersections (e.g., `as unknown as { id: string }`) or exact typing.
- **MUI Component Typings:** When using MUI components (like `<Typography>`), ensure you are using valid props (e.g., `sx={{ fontWeight: 'bold' }}`). Do not pass invalid HTML/CSS props directly unless explicitly supported, as it will trigger strict TypeScript React typings errors (`IntrinsicAttributes & ...`).
- **Callback `this` Context:** In test files (like `vi.fn(function(this: unknown) { ... })`), explicitly type `this` instead of letting it default to `any`, which violates the strict config.

### 7. Secrets & Credentials in Tests
- **Never Hardcode Secrets:** When writing Playwright or Maestro E2E tests, never hardcode passwords (like `Tester@123`) or other sensitive credentials directly in the test scripts.
- **Environment Variables:** Always use environment variables (e.g., `process.env.TEST_USER_PASSWORD` in Playwright or `${TEST_USER_PASSWORD}` in Maestro) and pull them from the `.env` file to ensure local testing doesn't leak secrets or break across environments.
- **E2E Bypass Security:** NEVER expose E2E bypass flags (like `NEXT_PUBLIC_E2E`) to the client bundle to toggle authentication backdoors. Always use a strictly server-side variable (e.g., `E2E_TEST_MODE`) for backend validation checks.

### 8. Authentication Strategy
- **Front-Door Auth Policy:** The primary login MUST be restricted to Google and Email (Magic Link + OTP). Do NOT implement an Email/Password login option.
- **Social Integrations as Features:** Third-party integrations (Facebook, TikTok, etc.) MUST NOT be used for initial authentication. They should be connected *inside* the application (e.g., via an Integrations Dashboard) using Supabase `linkIdentity` after the user has authenticated with their primary identity.

### 9. Branding & Naming
- **Strict Application Name:** When referring to the application or writing user-facing documentation, ALWAYS use the exact string `directly.social`. NEVER use "Directly Social", "Directly.Social", or any capitalized variation.

### 10. Subagent Capabilities & Boundaries
- **Discovery Agent**: Does NOT modify application code. Requires file-writing tools ONLY to generate and save phase artifacts (like technical blueprints).
- **QA Agent**: Must be granted write access restricted strictly to test directories (`src/__tests__/` and `docs/manual_tests/`). Must never modify implementation code.
- **Dev Agent**: Must be granted write access restricted strictly to implementation directories (`src/app/`, `src/lib/`, `src/components/`, etc.) and configuration.
- **Doc Agent**: Must be granted write access restricted strictly to documentation directories (`docs/`, `README.md`) and `.agents/` config files for updating rules and learnings.
- **Audit Agent**: Must be explicitly granted read-only access to the entire repository to explore the codebase for deep security and performance audits. Does NOT modify application code.
- **Project Agent**: Must be granted `enable_write_tools: true` to run `gh` shell commands, and `enable_mcp_tools: true` to use `mcp_github_create_issue` for issue management and project board linking. Does NOT modify application code.
- The Orchestrator MUST use the `define_subagent` tool with `enable_write_tools: true` (and `enable_mcp_tools: true` when required) for these agents before invoking them, rather than relying on default read-only inheritance.

### 11. Proactive Growth & Product Strategy
- **Marketing & Pricing Psychology:** When discussing features, UI, or pricing, ALL agents MUST proactively suggest psychological pricing tactics (e.g., 5-year anchors for lifetime deals, decoy pricing) and growth-minded UX flows.
- **Do not wait for prompts:** Do not rely on the user to specify every marketing hook or product strategy. Act as a proactive co-founder: if a UI flow or copy could be optimized for conversion, retention, or perceived value, you must suggest and implement it.

### 12. 7-Point AI Security Risk Checklist
For any significant feature or codebase audit, the following 7 vulnerabilities must be assessed:
1. **Server-Side Template Injection (SSTI)** - Verify no unsafe `dangerouslySetInnerHTML` or risky markdown parsing (App uses React/Next.js).
2. **Regular Expression Denial of Service (ReDoS)** - Ensure no unbounded or nested quantifiers in custom regexes (e.g., in Zod validation or route matching).
3. **Long Password DoS** - Verify password length limits (N/A for OAuth-only flows).
4. **AWS S3 Client-Side Secret Leakage** - Ensure server-side APIs do not leak plaintext `secretAccessKey` or other credentials to the client.
5. **NoSQL Injection** - Verify database queries (N/A for Prisma + Postgres).
6. **Clipboard Copy Attack (Pastejacking)** - Validate content when copying snippets/codes to clipboard.
7. **Login Replay Attack** - Ensure state/nonce validation in OAuth or Magic Link flows.

### 13. Strict Content Security Policy (CSP) Enforcement
- **MANDATORY CSP UPDATES:** This application implements a strict `Content-Security-Policy` header in `next.config.ts`. If any agent introduces a new external domain (e.g., for images, fonts, scripts, iframes, or APIs), the agent **MUST** update the `Content-Security-Policy` string in `next.config.ts` to explicitly allow that specific domain (e.g., adding it to `img-src` or `connect-src`).
- **No Wildcards:** NEVER use wildcard `https:` sources in the CSP. Always define exact domains.
- **Unsafe-Inline/Eval:** Next.js and Material UI require `unsafe-inline` and `unsafe-eval` in standard setups; do not attempt to remove them from `style-src` or `script-src` unless explicitly implementing a full middleware nonce system.

### 14. OWASP ZAP Automation Framework Strictness
- **YAML Schema:** When modifying `.zap/af-plan.yaml` (e.g., for alert filters or replacer rules), you MUST adhere to ZAP's strict YAML schema. 
- **Known Quirks:** Always use `replacementString` instead of `replacement` for replacer rules. For HTTP headers, ensure they are passed as proper arrays if required by the block. For alert filters, ensure `newRisk` exact casing is used (e.g., `"Info"`, `"False Positive"`). Do not guess the schema.

### 15. Form Hydration & Large Media Mocking
- **Hydration Crash Rule:** `localStorage` must NEVER be accessed inside `useMemo` or directly in a component body during SSR. It must be initialized with a stable default (`false`/`null`) and hydrated inside a `useEffect`.
- **Large Media OOM Hazard:** When mocking large media files for client-side forms (e.g., Demo Videos), NEVER use `await res.blob()` to load the data into a new File object in main memory. Use a 0-byte payload (`new File([], 'name', { type: 'video/mp4' })`) and rely on URL mapping for previews/exports to prevent Out Of Memory (OOM) crashes on mobile devices.
