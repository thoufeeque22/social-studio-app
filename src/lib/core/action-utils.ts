import { auth } from "@/auth";
import { logger } from "./logger";
import { Session } from "next-auth";

/**
 * A wrapper for server actions that requires authentication.
 * Handles session verification and provides a consistent error format.
 */
export async function protectedAction<T>(
  action: (userId: string, session: Session) => Promise<T>
): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }

  try {
    return await action(session.user.id, session);
  } catch (error: unknown) {
    // Logger now automatically captures in Sentry
    logger.error("Server Action Error", error);
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred.");
  }
}

/**
 * Handles common path revalidations for the dashboard.
 */
export async function revalidateDashboard() {
  const { revalidatePath } = await import('next/cache');
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/history");
  revalidatePath("/schedule");
}
