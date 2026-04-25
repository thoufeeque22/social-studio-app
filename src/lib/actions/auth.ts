"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";

export async function createSyncSession() {
  const session = await auth();

  if (!session) {
    console.error("[Auth-Sync] No session found in browser context");
    return { error: "Not authenticated" };
  }

  const cookieStore = await cookies();

  // Get the actual encrypted JWT token from the browser's cookies
  // We check both the secure and non-secure versions
  const token = cookieStore.get("__Secure-authjs.session-token")?.value ||
                cookieStore.get("authjs.session-token")?.value ||
                cookieStore.get("next-auth.session-token")?.value;

  if (!token) {
    console.error("[Auth-Sync] Session exists but cookie token is missing");
    return { error: "Token not found" };
  }

  console.log("[Auth-Sync] Successfully extracted JWT for sync");
  return { token };
}
