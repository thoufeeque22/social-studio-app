"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { v4 as uuidv4 } from "uuid";

export async function createSyncSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // Create a new session record in the database for the app to use
  const sessionToken = uuidv4();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      sessionToken,
      userId: session.user.id,
      expires,
    },
  });

  return { token: sessionToken };
}
