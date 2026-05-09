# 📱 Social Studio Mobile Wrapper (Capacitor)

This document outlines the architecture and developer workflow for the native iOS and Android versions of Social Studio.

## 🏗️ Architecture: Remote Shell
Social Studio uses a **Remote Shell** approach. Instead of bundling all web assets locally, the native app acts as a high-performance wrapper that loads the live production dashboard. This allows for:
- **Instant Updates**: Changes to the web dashboard are reflected in the app immediately without a new App Store submission.
- **Full Backend Support**: Server Actions and API routes work seamlessly as they are executed on the live server.
- **Native Experience**: Native splash screens, status bar configurations, and viewport optimizations make it feel like a real app.

---

## 🛠️ Configuration
The core configuration is located in `capacitor.config.ts`.

### **Production Setup**
To point the app to your live site, ensure the `url` in `capacitor.config.ts` is set to your Vercel domain:
```typescript
server: {
  url: 'https://social-studio-app.vercel.app',
  cleartext: true,
  allowNavigation: ['*']
}
```

---

## 🚀 Developer Workflow

### **1. Syncing Changes**
Whenever you modify `capacitor.config.ts` or add new plugins, you must sync the native projects:
```bash
npm run cap:sync
```

### **2. Opening Native Projects**
To build, test, or archive your app for the store, use these scripts:
- **iOS (Xcode)**: `npm run cap:open:ios`
- **Android (Android Studio)**: `npm run cap:open:android`

### **3. Local Testing (The Tunnel)**
If you want to test local changes on your physical phone or simulator without deploying:
1. Start your tunnel: `npm run tunnel`
2. Copy the `.trycloudflare.com` URL.
3. Paste it into the `url` field in `capacitor.config.ts`.
4. Run `npm run cap:sync` and re-run the app in Xcode/Android Studio.

---

## 📱 Mobile Optimizations
The following optimizations have been applied to `src/app/layout.tsx`:
- **Viewport Lock**: Prevented user zooming for a more stable UI.
- **Safe Area Support**: Added `viewport-fit=cover` to ensure the app handles notches and home indicators correctly.
- **Translucent Status Bar**: Configured for iOS to blend with the dark theme.

---

## ⚠️ Troubleshooting Production
If you see a **"Server Error"** or **"404"** on the mobile app:

1. **Environment Variables**: Ensure your Vercel project has all secrets from `.env` (especially `AUTH_SECRET`, `GOOGLE_ID`, and `DATABASE_URL`).
2. **Database Connection**: Vercel requires a hosted database (like Neon/Supabase). Ensure you have run `npx prisma db push` against your live database URL.
3. **Re-sync**: Always run `npm run cap:sync` and click the **Play (▶️)** button in Xcode again after changing URLs or config files.
