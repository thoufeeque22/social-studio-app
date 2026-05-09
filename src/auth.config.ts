import type { NextAuthConfig } from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import TikTok from "next-auth/providers/tiktok";
import Credentials from "next-auth/providers/credentials";

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET ? [
      Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET,
        authorization: {
          params: {
            scope: "email,public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts",
            auth_type: "reauthenticate",
          },
        },
        allowDangerousEmailAccountLinking: true,
      })
    ] : []),
    ...(process.env.AUTH_TIKTOK_ID && process.env.AUTH_TIKTOK_SECRET ? [
      TikTok({
        clientId: process.env.AUTH_TIKTOK_ID,
        clientSecret: process.env.AUTH_TIKTOK_SECRET,
        authorization: {
          params: {
            scope: "user.info.basic,video.upload,video.publish",
            prompt: "select_account",
          },
        },
        client: {
          token_endpoint_auth_method: "client_secret_post",
        },
        token: {
          url: (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://social-studio-app.vercel.app") + "/api/tiktok-proxy",
        },
        userinfo: {
          url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name",
        },
        checks: ["state"],
        allowDangerousEmailAccountLinking: true,
      })
    ] : []),
    ...(process.env.E2E === 'true' && process.env.NODE_ENV === 'development' ? [
      Credentials({
        name: "E2E Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          if (
            credentials?.email === "tester@socialstudio.ai" && 
            credentials?.password === process.env.E2E_TEST_PASSWORD &&
            process.env.E2E_TEST_PASSWORD
          ) {
            return {
              id: "e2e-test-user",
              name: "E2E Tester",
              email: "tester@socialstudio.ai"
            };
          }
          return null;
        }
      })
    ] : []),
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isBridge = nextUrl.searchParams.get("bridge") === "true";
      const isOnDashboard = nextUrl.pathname === "/";
      const isOnSettings = nextUrl.pathname.startsWith("/settings");
      
      if (isOnLogin) {
        // If we are already logged in in the browser but the app wants a 'bridge'
        // redirect them to the success page so it triggers the deep link back to the app
        if (isLoggedIn && isBridge) {
          return Response.redirect(new URL("/auth/success", nextUrl));
        }

        // Standard web login: redirect to dashboard if already logged in
        if (isLoggedIn && !isBridge) {
          return Response.redirect(new URL("/", nextUrl));
        }

        return true;
      }

      if (isOnDashboard || isOnSettings) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
