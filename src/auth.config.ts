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
    ...(process.env.NEXT_PUBLIC_E2E === 'true' && process.env.NODE_ENV === 'development' ? [
      Credentials({
        name: "E2E Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          const expectedPassword = process.env.E2E_TEST_PASSWORD || 'social-studio-e2e-secret';
          
          if (
            credentials?.email === "tester@socialstudio.ai" && 
            credentials?.password === expectedPassword
          ) {
            // Dynamic import to avoid edge runtime issues in middleware
            const { prisma } = await import("@/lib/core/prisma");
            const user = await prisma.user.findFirst({
              where: { email: "tester@socialstudio.ai" }
            });

            if (user) {
              return {
                id: user.id,
                name: user.name || "E2E Tester",
                email: user.email,
                role: user.role
              };
            }
          }
          return null;
        }
      })
    ] : []),
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    authorized({ auth, request: { nextUrl } }) {
      console.log('Authorized callback - auth object:', auth);
      console.log('Authorized callback - isLoggedIn:', !!auth?.user);
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true; // Allow login page if not logged in
      }

      const isOnDashboard = nextUrl.pathname === "/";
      const isOnSettings = nextUrl.pathname.startsWith("/settings");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      // For admin routes, check if user is logged in and is an ADMIN
      if (isOnAdmin) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
        // Note: role is expected to be present in auth.user if correctly passed from JWT
        if ((auth?.user as any)?.role !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // For dashboard and settings, allow access if logged in, otherwise redirect to login
      if (isOnDashboard || isOnSettings) {
        return isLoggedIn ? true : Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
