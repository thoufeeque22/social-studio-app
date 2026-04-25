import NextAuth from "next-auth";
import authConfig from "./auth.config";

// This initializes Auth.js to handle session headers correctly
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Matcher allows auth to run on all pages except static assets and specific API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
