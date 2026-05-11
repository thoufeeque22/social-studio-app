# Manual Test: Production Readiness Infrastructure

## Prerequisites
- Local development server running (`npm run dev`) or deployed environment.
- Redis server running locally (or Upstash Redis configured via `.env`).
- Sentry DSN configured in `.env`.

## Scenarios

### 1. Zod Runtime Validation
**Description:** Verify that Next.js Server Actions validate inputs correctly.
**Steps:**
1. Navigate to a form that triggers a server action (e.g., Settings or AI Preview).
2. Intercept the network request using browser DevTools (Network tab -> Block request URL or use fetch override) or send a direct POST request to the API with invalid schema (e.g., missing required fields, wrong types).
3. Observe the response.
**Expected Result:** 
- The server should return a 400 Bad Request or a structured validation error response.
- The UI should not crash and should ideally handle the error gracefully.

### 2. Rate Limiting (Upstash Redis)
**Description:** Verify that actions are rate-limited to prevent abuse.
**Steps:**
1. Open the Network tab in DevTools.
2. Trigger an action multiple times rapidly (e.g., clicking "Generate AI Preview" repeatedly, or running a loop in the console to fetch an API route).
3. Continue triggering the action until the rate limit threshold (e.g., 5-10 requests per window) is hit.
**Expected Result:**
- The server should respond with a `429 Too Many Requests` status.
- The UI should display an error message indicating the user is rate-limited (e.g., "AI Generation limit reached. Please wait a minute.").

### 3. Sentry Observability
**Description:** Verify that unhandled errors are logged to Sentry.
**Steps:**
1. Force an artificial error in a non-critical flow (e.g., visiting `/sentry-example-page` if available, or triggering an invalid state).
2. Go to the Sentry dashboard for this project.
**Expected Result:**
- The error should appear in the "Issues" stream with the correct stack trace.
- The environment tag should correspond to the execution environment (e.g., `development` or `production`).

### 4. Language, Currency, and Units Compliance
**Description:** Verify that all data displays conform to project standards.
**Steps:**
1. Navigate through the dashboard and settings pages.
2. Verify text language.
3. Verify any currency representations.
4. Verify any measurement units.
**Expected Result:**
- All text must be in English.
- Any currency must use PLN (Polish Złoty).
- Any measurements must use Metric units (e.g., MB, GB for file sizes).
