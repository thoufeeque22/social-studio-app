# Cloudflare Tunnel Setup Guide

Now that we've transitioned from Ngrok to **Cloudflare Tunnels**, you need to update your tunnel URL in several places to ensure webhooks and OAuth flows work correctly.

## 1. Local Environment (`.env`)
Update your `.env` file with the new URL provided by `npm run tunnel` (e.g., `https://xxxx-xxxx-xxxx.trycloudflare.com`):

```env
# Change from xxxx.ngrok-free.dev to your new Cloudflare URL
NEXTAUTH_URL="https://your-new-url.trycloudflare.com"
NEXT_PUBLIC_APP_URL="https://your-new-url.trycloudflare.com"
```

## 2. Meta Developer Dashboard (Facebook & Instagram)
Go to [Meta for Developers](https://developers.facebook.com/apps/):
- **App > App Settings > Basic**: Update "App Domains" and "Site URL".
- **Instagram Share (Webhooks)**: Update the Callback URL for your webhooks.
- **Facebook Login > Settings**: Update "Valid OAuth Redirect URIs".

https://developers.facebook.com/apps/989035463695018/settings/basic/?business_id=529711624411272

https://developers.facebook.com/apps/989035463695018/business-login/settings/?business_id=529711624411272

## 3. Google Developer Console (YouTube)
Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- **OAuth 2.0 Client IDs**: Update "Authorized redirect URIs" to:
  `https://your-new-url.trycloudflare.com/api/auth/callback/google`

https://console.cloud.google.com/auth/clients/670614339891-7b2okh8o95q7770nvi3tmst3jsi8kpbl.apps.googleusercontent.com?project=gen-lang-client-0812509069

## 4. TikTok Developer Portal
Go to the [TikTok for Developers](https://developers.tiktok.com/console/):
- **App Settings**: Update "Redirect URI" to:
  `https://your-new-url.trycloudflare.com/api/auth/callback/tiktok`

## 5. How to Launch
Instead of running ngrok, simply use:

```bash
npm run tunnel
```

Once the tunnel starts, look for the text:
`+  Your quick Tunnels are: `
`  https://xxxx-xxxx-xxxx.trycloudflare.com`

Copy that URL and apply it to the locations above!
