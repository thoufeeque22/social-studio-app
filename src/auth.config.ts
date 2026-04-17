import type { NextAuthConfig } from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import TikTok from "next-auth/providers/tiktok";

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.upload",
          access_type: "offline",
          prompt: "select_account consent",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
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
    }),
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
        url: process.env.AUTH_URL + "/api/tiktok-proxy",
      },
      userinfo: {
        url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name",
      },
      checks: ["state"],
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnDashboard = nextUrl.pathname === "/";
      const isOnSettings = nextUrl.pathname.startsWith("/settings");
      
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
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
