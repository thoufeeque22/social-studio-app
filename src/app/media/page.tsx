import React from 'react';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/media/MediaLibrary";

export default async function MediaPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div style={{ padding: '2rem' }}>
      <MediaLibrary />
    </div>
  );
}
