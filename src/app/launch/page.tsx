import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LaunchClient from "./LaunchClient";

export default async function LaunchPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <LaunchClient />;
}
