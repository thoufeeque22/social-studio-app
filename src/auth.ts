import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/core/prisma";
import authConfig from "./auth.config";
import { extractAccountName } from "@/lib/utils/utils";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  ...authConfig,
  providers: [
    ...authConfig.providers,
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
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ account, profile }) {
      const accountName = extractAccountName(profile);
      
      if (accountName) {
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: { accountName },
        });
      }
    },
  },
  debug: process.env.NODE_ENV !== 'production',
});
