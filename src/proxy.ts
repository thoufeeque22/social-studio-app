import { auth } from "@/auth";

export const proxy = auth;

export const config = {
  // Matcher allows proxy to run on all pages except static assets and specific API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
