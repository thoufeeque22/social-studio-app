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

  console.log(`Seeding schedule data for user: ${user.id}`);

  // Clear existing scheduled posts for a clean test state
  await prisma.postHistory.deleteMany({ 
    where: { 
      userId: user.id,
      isPublished: false
    } 
  });

  // Seed Scheduled Posts
  const now = new Date();
  
  // Post 1: Scheduled in 1 hour
  const scheduled1 = new Date(now.getTime() + 60 * 60 * 1000);
  // Post 2: Scheduled in 2 hours
  const scheduled2 = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  // Post 3: Scheduled in 3 hours
  const scheduled3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  await prisma.postHistory.create({
    data: {
      id: 'e2e-post-1',
      userId: user.id,
      title: 'Scheduled Post 1',
      description: 'First scheduled post for E2E testing',
      scheduledAt: scheduled1,
      isPublished: false,
    }
  });

  await prisma.postHistory.create({
    data: {
      id: 'e2e-post-2',
      userId: user.id,
      title: 'Scheduled Post 2',
      description: 'Second scheduled post for E2E testing',
      scheduledAt: scheduled2,
      isPublished: false,
    }
  });

  await prisma.postHistory.create({
    data: {
      id: 'e2e-post-3',
      userId: user.id,
      title: 'Scheduled Post 3',
      description: 'Third scheduled post for E2E testing',
      scheduledAt: scheduled3,
      isPublished: false,
    }
  });

  console.log('Successfully seeded schedule data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
