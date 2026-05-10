import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { Suspense } from "react";
import { 
  getUserAccounts, 
  getPlatformPreferences, 
  getAIStylePreference 
} from "@/app/actions/user";
import { AITier } from "@/lib/core/constants";

export default async function Home() {
  const session = await auth();

  // 1. Instant Server-Side Redirect
  if (!session) {
    redirect("/login");
  }

  // 2. Pre-fetch user data on the server for near-instant rendering
  const [
    accounts, 
    preferences, 
    aiStyle
  ] = await Promise.all([
    getUserAccounts(),
    getPlatformPreferences(),
    getAIStylePreference()
  ]);

  // 3. Render with pre-fetched session and data (no loading flash)
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading Dashboard...</div>}>
      <DashboardClient 
        session={session} 
        initialAccounts={accounts}
        initialPreferences={preferences}
        initialAIStyle="Smart"
        initialAITier={aiStyle as AITier}
      />
    </Suspense>
  );
}
