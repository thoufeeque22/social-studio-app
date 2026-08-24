with open("src/lib/referral/retroactive.ts", "r") as f:
    content = f.read()

content = content.replace("import { Prisma } from '@prisma/client';", "import { prisma } from '@/lib/core/prisma';\ntype TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];")
content = content.replace("tx: Prisma.TransactionClient", "tx: TxClient")

with open("src/lib/referral/retroactive.ts", "w") as f:
    f.write(content)
