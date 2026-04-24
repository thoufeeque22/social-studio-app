import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.postHistory.findMany({
    orderBy: { scheduledAt: 'desc' },
    take: 5,
    include: {
      platforms: true
    }
  });

  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
