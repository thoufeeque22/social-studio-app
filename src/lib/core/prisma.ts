import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./encryption";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
  });

export const prisma = basePrisma.$extends({
  query: {
    account: {
      async create({ args, query }) {
        if (args.data.access_token) args.data.access_token = encrypt(args.data.access_token);
        if (args.data.refresh_token) args.data.refresh_token = encrypt(args.data.refresh_token);
        if (args.data.id_token) args.data.id_token = encrypt(args.data.id_token);
        
        const result = await query(args);
        
        // Log creation
        if (result && result.userId) {
          await basePrisma.tokenAuditLog.create({
            data: {
              userId: result.userId,
              accountId: result.id,
              action: "CREATE",
              provider: result.provider,
              reason: "Account linked/created"
            }
          }).catch(err => console.error("Audit log failed:", err));
        }
        
        return result;
      },
      async update({ args, query }) {
        const data = args.data as any;
        const isTokenUpdate = !!(data.access_token || data.refresh_token);
        
        if (data.access_token) data.access_token = encrypt(data.access_token);
        if (data.refresh_token) data.refresh_token = encrypt(data.refresh_token);
        if (data.id_token) data.id_token = encrypt(data.id_token);
        
        const result = await query(args);
        
        if (isTokenUpdate && result && result.userId) {
          await basePrisma.tokenAuditLog.create({
            data: {
              userId: result.userId,
              accountId: result.id,
              action: "REFRESH",
              provider: result.provider,
              reason: "Token updated in database"
            }
          }).catch(err => console.error("Audit log failed:", err));
        }
        
        return result;
      },
      async upsert({ args, query }) {
        if (args.create.access_token) args.create.access_token = encrypt(args.create.access_token);
        if (args.create.refresh_token) args.create.refresh_token = encrypt(args.create.refresh_token);
        if (args.create.id_token) args.create.id_token = encrypt(args.create.id_token);
        
        if (args.update.access_token) args.update.access_token = encrypt(args.update.access_token as string);
        if (args.update.refresh_token) args.update.refresh_token = encrypt(args.update.refresh_token as string);
        if (args.update.id_token) args.update.id_token = encrypt(args.update.id_token as string);
        
        const result = await query(args);

        if (result && result.userId) {
          const isTokenUpdate = !!(args.update.access_token || args.update.refresh_token);
          await basePrisma.tokenAuditLog.create({
            data: {
              userId: result.userId,
              accountId: result.id,
              action: isTokenUpdate ? "REFRESH" : "CREATE",
              provider: result.provider,
              reason: isTokenUpdate ? "Token updated via upsert" : "Account created/linked via upsert"
                }
          }).catch(err => console.error("Audit log failed:", err));
        }
        
        return result;
      }
    }
  },
  result: {
    account: {
      access_token: {
        needs: { access_token: true },
        compute(account) {
          return account.access_token ? decrypt(account.access_token) : null;
        }
      },
      refresh_token: {
        needs: { refresh_token: true },
        compute(account) {
          return account.refresh_token ? decrypt(account.refresh_token) : null;
        }
      },
      id_token: {
        needs: { id_token: true },
        compute(account) {
          return account.id_token ? decrypt(account.id_token) : null;
        }
      }
    }
  }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
