import NextAuth from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import TikTok from "next-auth/providers/tiktok";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.upload",
          access_type: "offline",
          prompt: "consent",
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
      // Disable PKCE for TikTok because they do not support `code_verifier` parameter
      checks: ["state"],
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async session({ session, user }) {
      return session;
    },
  },
  debug: true,
});
