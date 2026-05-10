import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'tester@socialstudio.ai' },
  });
  console.log('User found:', user ? 'YES' : 'NO');
  if (user) {
    console.log('User ID:', user.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
