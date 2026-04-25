# 🌍 3rd-Party Platform Integrations

This document details the configuration, credentials, and requirements for all external services integrated into **Social Studio**.

---

## 🔑 Core Authentication & Distribution

### 1. Google & YouTube
Used for unified login and native YouTube Shorts publishing.
- **Platform**: [Google Cloud Console](https://console.cloud.google.com/)
- **API Enabled**: YouTube Data API v3
- **Credentials**:
  - `AUTH_GOOGLE_ID`: Client ID
  - `AUTH_GOOGLE_SECRET`: Client Secret
- **Required Scopes**:
  - `openid`: For identity.
  - `email`: For account matching.
  - `profile`: For user details.
  - `https://www.googleapis.com/auth/youtube.upload`: **Critical** for direct video publishing.
- **Redirect URIs**:
  - `https://social-studio-app.vercel.app/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google` (Dev)

### 2. Facebook & Instagram
Used for Facebook Page posts and Instagram Reel distribution.
- **Platform**: [Meta for Developers](https://developers.facebook.com/)
- **Product**: Facebook Login, Graph API
- **Credentials**:
  - `AUTH_FACEBOOK_ID`: App ID
  - `AUTH_FACEBOOK_SECRET`: App Secret
- **Required Scopes**:
  - `email`, `public_profile`
  - `instagram_basic`, `instagram_content_publish`: For Reels.
  - `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`: For Page distribution.
- **Redirect URIs**:
  - `https://social-studio-app.vercel.app/api/auth/callback/facebook`
  - `http://localhost:3000/api/auth/callback/facebook` (Dev)

### 3. TikTok
Used for TikTok video publishing.
- **Platform**: [TikTok for Developers](https://developers.tiktok.com/)
- **Credentials**:
  - `AUTH_TIKTOK_ID`: Client Key
  - `AUTH_TIKTOK_SECRET`: Client Secret
- **Special Config**:
  - **Proxy**: TikTok requires a custom token exchange. We use `/api/tiktok-proxy` to handle the `client_secret_post` auth method.
- **Required Scopes**:
  - `user.info.basic`
  - `video.upload`, `video.publish`
- **Redirect URIs**:
  - `https://social-studio-app.vercel.app/api/auth/callback/tiktok`

---

## 🏗️ Infrastructure & DevOps

### 4. Vercel (Hosting)
- **Role**: Primary hosting provider for the Next.js frontend and serverless API.
- **Critical Settings**:
  - `AUTH_SECRET`: Used to encrypt sessions.
  - `AUTH_TRUST_HOST`: Must be `true`.
  - `VERCEL_ANALYZE_BUILD_OUTPUT`: Set to `1` to debug large bundle sizes (over 300MB).
- **Exclusions**: The `src/tmp` and `.next/cache` folders are excluded via `.vercelignore` to stay under the 2GB upload limit.

### 5. Neon (Database)
- **Role**: Serverless PostgreSQL provider.
- **Details**:
  - `DATABASE_URL`: Connection string (uses connection pooling).
  - `DATABASE_URL_UNPOOLED`: Direct connection for migrations.
- **Requirement**: Prisma schema must use `provider = "postgresql"` and `sslmode=require`.

### 6. Sentry (Observability)
- **Role**: Error tracking and performance monitoring.
- **Configuration**:
  - `SENTRY_DSN`: Found in `sentry.server.config.ts`.
  - `SKIP_SENTRY_BUILD`: Can be set to `true` to speed up Vercel builds or save memory.

### 7. Cloudflare / Ngrok (Local Dev)
- **Role**: Tunnels to allow webhooks (like TikTok/Facebook) to reach your local machine.
- **Config**: Defined in `CLOUDFLARE_TUNNEL_SETUP.md`.

---

## 📱 Mobile Wrapper (Capacitor)
- **Scheme**: `socialstudio://`
- **User-Agent**: `SocialStudioApp` (Used to trigger native browser redirects).
- **Plugins**: `@capacitor/browser` for secure OAuth.
