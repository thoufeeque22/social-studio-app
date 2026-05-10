# UAT Script: E2E Authentication Infrastructure (#374)

## Overview
This script verifies the infrastructure enabling automated E2E authentication for the Social Studio application. It ensures the test user can log in locally but is blocked in production.

## Prerequisites
- Local development environment.
- Database seeded with user `tester@socialstudio.ai`.
- `.env.local` configured with:
  - `NEXT_PUBLIC_E2E=true`
  - `E2E=true`
  - `E2E_TEST_PASSWORD=social-studio-e2e-secret`

## Scenario 1: Local E2E Login Form Visibility
1. **Run** the app locally: `npm run dev`.
2. **Navigate** to `http://localhost:3000/login`.
3. **Verify** that the "E2E Test Login" section is visible at the bottom of the login card.
4. **Expected Result:** Section appears with Email/Password inputs and "Authenticate Tester" button.

## Scenario 2: Successful E2E Authentication
1. **Enter** `tester@socialstudio.ai` and the password from `.env`.
2. **Click** "Authenticate Tester".
3. **Verify** you are redirected to the Dashboard (`/`).
4. **Verify** that linked accounts "Tester Alpha" and "Tester Beta" are visible in the platform selection.
5. **Expected Result:** Full access granted with the correct user profile.

## Scenario 3: Production Safety (Mock Production)
1. **Stop** the app.
2. **Modify** `.env.local`: Set `NODE_ENV=production`.
3. **Restart** the app (or run `npm run build && npm run start`).
4. **Navigate** to `/login`.
5. **Verify** that the "E2E Test Login" section is **NOT** visible.
6. **Expected Result:** Infrastructure is physically removed in non-development environments.

## Scenario 4: Automated Setup Execution
1. **Run** command: `E2E=true NEXT_PUBLIC_E2E=true E2E_TEST_PASSWORD=social-studio-e2e-secret npx playwright test src/__tests__/e2e/auth.setup.ts`.
2. **Check** that the folder `.auth/` is created and contains `user.json`.
3. **Verify** that subsequent tests run without re-authenticating.
4. **Expected Result:** `[setup] › src/__tests__/e2e/auth.setup.ts:5:6 › authenticate` passes.
