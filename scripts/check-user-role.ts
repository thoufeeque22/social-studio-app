import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const email = process.argv[2];
  const user = await prisma.user.findFirst({ where: { email } });
  console.log(user);
}
main().finally(async () => await prisma.$disconnect());
