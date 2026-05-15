import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'tester@socialstudio.ai';

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User ${email} not found. Please run seed-e2e-user.ts first.`);
    process.exit(1);
  }

  console.log(`Seeding search data for user: ${user.id}`);

  // Clear existing history and gallery for a clean test state
  await prisma.postHistory.deleteMany({ where: { userId: user.id } });
  await prisma.galleryAsset.deleteMany({ where: { userId: user.id } });

  // 1. Seed Post History
  await prisma.postHistory.createMany({
    data: [
      {
        userId: user.id,
        title: 'Exploring the Grand Canyon',
        description: 'A beautiful sunset at the South Rim.',
        isPublished: true,
        createdAt: new Date(),
      },
      {
        userId: user.id,
        title: 'Cooking Italian Pasta',
        description: 'Authentic carbonara recipe step by step.',
        isPublished: true,
        createdAt: new Date(Date.now() - 10000),
      },
      {
        userId: user.id,
        title: 'Tech Review: New Smartphone',
        description: 'Testing the camera and performance.',
        isPublished: true,
        createdAt: new Date(Date.now() - 20000),
      },
      {
        userId: user.id,
        title: 'Morning Yoga Routine',
        description: '15 minutes of stretching for beginners.',
        isPublished: true,
        createdAt: new Date(Date.now() - 30000),
      },
    ],
  });

  // 2. Seed Media Gallery
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  await prisma.galleryAsset.createMany({
    data: [
      {
        userId: user.id,
        fileId: 'e2e-video-1',
        fileName: 'grand_canyon_vlog.mp4',
        fileSize: 5000000n,
        mimeType: 'video/mp4',
        expiresAt: futureDate,
        createdAt: new Date(),
      },
      {
        userId: user.id,
        fileId: 'e2e-video-2',
        fileName: 'pasta_tutorial.mov',
        fileSize: 12000000n,
        mimeType: 'video/quicktime',
        expiresAt: futureDate,
        createdAt: new Date(Date.now() - 10000),
      },
      {
        userId: user.id,
        fileId: 'e2e-video-3',
        fileName: 'smartphone_unboxing.mp4',
        fileSize: 8000000n,
        mimeType: 'video/mp4',
        expiresAt: futureDate,
        createdAt: new Date(Date.now() - 20000),
      },
    ],
  });

  console.log('Successfully seeded search data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
