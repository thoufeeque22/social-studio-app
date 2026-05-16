import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { id: 'cmoywq8f900009br5nsfbwru2' } });
  console.log(user?.email);
}
main().finally(async () => await prisma.$disconnect());
