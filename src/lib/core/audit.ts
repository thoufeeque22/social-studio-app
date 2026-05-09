import { prisma } from "./prisma";

export type TokenAction = "ACCESS" | "REFRESH" | "REVOKE" | "CREATE";

interface LogTokenEventParams {
  userId: string;
  accountId?: string;
  action: TokenAction;
  provider?: string;
  reason?: string;
}

/**
 * Logs a token-related event to the database for security auditing.
 */
export async function logTokenEvent({
  userId,
  accountId,
  action,
  provider,
  reason,
}: LogTokenEventParams) {
  try {
    await prisma.tokenAuditLog.create({
      data: {
        userId,
        accountId,
        action,
        provider,
        reason,
      },
    });
    console.log(`📜 [AUDIT] Token ${action} logged for User: ${userId}${provider ? ` (Provider: ${provider})` : ""}`);
  } catch (error) {
    console.error("❌ [AUDIT] Failed to log token event:", error);
    // We don't throw here to avoid breaking the main flow if auditing fails
  }
}
