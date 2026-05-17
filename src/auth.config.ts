import type { NextAuthConfig } from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import TikTok from "next-auth/providers/tiktok";

export default {
  providers: [
    Google({
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
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        console.log('JWT callback - new user sign-in, token.role set to:', token.role);
      } else {
        console.log('JWT callback - existing user, current token.role:', token.role);
      }
      return token;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
        const role = auth?.user?.role;
        if (role !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      const isOnDashboard = nextUrl.pathname === "/";
      const isOnSettings = nextUrl.pathname.startsWith("/settings");

      if (isOnDashboard || isOnSettings) {
        return isLoggedIn ? true : Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
