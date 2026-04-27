import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RoadmapClient from "./RoadmapClient";

export default async function RoadmapPage() {
  const session = await auth();

  // Basic security: Check if user is logged in
  // Note: For strict developer-only access, compare session?.user?.email 
  // with an ADMIN_EMAIL environment variable.
  if (!session?.user) {
    redirect("/login");
  }

  return <RoadmapClient />;
}
