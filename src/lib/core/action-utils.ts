import { auth } from "@/auth";

/**
 * A wrapper for server actions that requires authentication.
 * Handles session verification and provides a consistent error format.
 */
export async function protectedAction<T>(
  action: (userId: string, session: any) => Promise<T>
): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }

  try {
    return await action(session.user.id, session);
  } catch (error: any) {
    console.error("Server Action Error:", error);
    throw new Error(error.message || "An unexpected error occurred.");
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
