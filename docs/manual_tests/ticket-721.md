# Manual Test Script for Ticket 721: Privacy-First Analytics

## Setup
1. Ensure `.env.local` contains `NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-test-id`.
2. Start the development server (`npm run dev`).

## Scenario 1: Happy Path (Standard Tracking)
1. Open a regular browser window and navigate to `http://localhost:3000`.
2. Open Developer Tools -> Network tab. Filter by `umami`.
3. Verify that the Umami script `script.js` is loaded from `cloud.umami.is`.
4. Verify that a `POST` request is sent to `gateway.umami.is/api/send`.
5. Trigger the 'signup' action via the UI. Verify a second `POST` request to `api/send` with payload containing `name: "signup"`.
6. Trigger the 'upgrade' action via the UI. Verify a third `POST` request with payload containing `name: "upgrade"`.
7. Scroll to the footer and verify the presence of the badge: "🛡️ Privacy-First / Zero Tracking Cookies".
8. Click on the Privacy Policy link and verify it contains the updated text regarding cookieless analytics.

## Scenario 2: Edge Case (Ad-blocker / Script Blocked)
1. Install an ad-blocker extension (e.g., uBlock Origin) or use Brave Browser with Shields UP.
2. Navigate to `http://localhost:3000`.
3. Open Developer Tools -> Console.
4. Verify that there are no Javascript runtime crashes.
5. Trigger the 'signup' action. The app should continue to function normally.

## Scenario 3: Negative Test (No Cookies)
1. Open an Incognito/Private window.
2. Navigate to `http://localhost:3000`.
3. Open Developer Tools -> Application -> Cookies.
4. Verify that no tracking cookies are present.
