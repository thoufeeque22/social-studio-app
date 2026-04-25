# 📱 Mobile Auth Troubleshooting & Resolution Guide

This document summarizes the challenges and solutions encountered while implementing **NextAuth v5 (Auth.js)** within a **Capacitor-wrapped Next.js** mobile application.

---

## 🚀 The Core Problem: Web vs. Native Shell
In a "Remote Shell" architecture, the app's WebView (the app) and the System Browser (Chrome/Safari) are separate environments. They do not share cookies, and security protocols for web browsers often block native app behaviors.

---

## 🛠️ Issues & Solutions

### 0. "disallowed_useragent" (Google Block)
- **Issue**: Google blocked the login with a "disallowed_useragent" error.
- **Root Cause**: Google blocks OAuth requests from within embedded WebViews (like Capacitor's default view) for security.
- **Fix**: **The "Secret Handshake" + Native Browser**. 
  - Added a custom User-Agent (`SocialStudioApp`) in `capacitor.config.ts`.
  - Updated the login page to detect this string and use `@capacitor/browser` to open the login flow in the **System Browser** (Chrome/Safari) instead of the app's internal view.


### 1. "Server Configuration" / 500 Error
- **Issue**: Clicking "Continue with Google" resulted in a generic 500 error on Vercel.
- **Root Cause**: NextAuth v5 requires a **POST** request to initiate sign-in. The app was using `Browser.open()` to hit the API with a **GET** request, which is forbidden.
- **Fix**: Implemented a **Native Bridge**. The app now opens a regular page (`/login?bridge=true`) which then triggers the standard `signIn()` function (POST) from within the browser.

### 2. "Unknown Action" Error
- **Issue**: Logs showed `UnknownAction: Unknown action`.
- **Root Cause**: Directly hitting `/api/auth/signin/[provider]` via a URL is no longer supported in Auth.js v5.
- **Fix**: The **Native Bridge** strategy (above) resolved this by ensuring all sign-ins are initiated via the official SDK.

### 3. Missing Middleware
- **Issue**: Intermittent session failures and host trust issues.
- **Root Cause**: Auth.js v5 requires a `middleware.ts` to initialize headers and validate the `AUTH_TRUST_HOST` setting.
- **Fix**: Created `src/middleware.ts` using `export default NextAuth(authConfig).auth`.

### 4. Session Not Syncing (Stuck at Login)
- **Issue**: User logs in via Chrome, but the app stays on the login page.
- **Root Cause**: Cookies set in the system browser are not available to the app's WebView.
- **Fix**: **JWT Cookie Hand-off**.
  1. Browser completes login.
  2. Browser redirects to `/auth/success`.
  3. A Server Action extracts the encrypted `authjs.session-token`.
  4. The browser "jumps" back to the app via a deep link, passing the token in the URL.
  5. The app catches the token and manually injects it into `document.cookie`.

### 5. Play Store Redirect ("Item not found")
- **Issue**: Deep links were opening the Play Store instead of the app.
- **Root Cause**: Android's `intent://` URLs default to the Play Store if the exact package/scheme match isn't found or is too complex (e.g., used strict `host` matching).
- **Fix**: 
  - Simplified `AndroidManifest.xml` by removing `android:host` requirements.
  - Used a "Scheme-First" redirect strategy (`socialstudio://`) which Chrome is less likely to block.
  - Added the package-name scheme `com.thoufeeque.socialstudio://` as a fallback.

### 6. Build Failures & 500 Errors (Edge Runtime)
- **Issue**: Deployments failed or returned 500 errors when accessing auth routes.
- **Root Cause**: The `middleware.ts` (or `proxy.ts`) was importing the full `auth.ts`, which includes the **Prisma Adapter**. Prisma does not run on Vercel's Edge Runtime.
- **Fix**: **Configuration Splitting**. 
  - Created `auth.config.ts` with only Edge-compatible providers and logic.
  - Initialized `NextAuth(authConfig)` separately in the middleware/proxy to keep it lightweight.

### 7. "UnknownAction" & Host Mismatch
- **Issue**: `UnknownAction: Unsupported action` error in server logs.
- **Root Cause**: Vercel's proxy network caused a mismatch between the internal request URL and the external `AUTH_URL`.
- **Fix**: 
  - Added `trustHost: true` to the configuration.
  - Explicitly passed `secret: process.env.AUTH_SECRET`.
  - Used `redirectProxyUrl` in `auth.config.ts` to help Auth.js navigate the proxy headers.

### 8. Facebook/TikTok Native Flow
- **Issue**: Facebook login blocked due to "Embedded WebView" or "Redirect URI" errors.
- **Fix**: 
  - Expanded the **Native Browser** flow to all providers (Facebook, TikTok).
  - Added the explicit `/api/auth/callback/facebook` URI to the Facebook Developer Console.

---

## 📋 Final Native Auth Flow
1. **App**: User clicks "Login". App opens System Browser to `/login?bridge=true`.
2. **Browser**: Middleware sees `bridge=true`, stays on login page.
3. **Browser**: Client-side JS triggers `signIn('google')`.
4. **Google**: User authenticates.
5. **Browser**: Redirects to `/auth/success`.
6. **Browser**: Extracts JWT -> Redirects to `socialstudio://login-success?token=...`
7. **App**: Receives deep link -> Injects Cookie -> Reloads.
8. **App**: Dashboard loads successfully. ✅

---

## ⚠️ Important Maintenance Steps
If Deep Links stop working on a physical device:
1. **Sync**: Run `npm run cap:sync`.
2. **Reinstall**: You **must** delete the app from the phone and click **Run** in Android Studio to refresh the System Deep Link Registry.
3. **Redeploy**: Always click **Redeploy** in Vercel after changing any Environment Variables.
