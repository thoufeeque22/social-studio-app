import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RoadmapClient from "./RoadmapClient";

export default async function RoadmapPage() {
  const session = await auth();

  // Basic security: Check if user is logged in
  if (!session?.user) {
    redirect("/login");
  }

  return <RoadmapClient />;
}
