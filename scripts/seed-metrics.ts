import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMetrics() {
  console.log('Seeding System Metrics...');
  
  const metrics = [
    { name: 'active_users', value: 150 },
    { name: 'daily_posts', value: 45 },
    { name: 'api_latency_ms', value: 120 },
    { name: 'error_rate', value: 0.02 },
  ];

  for (const metric of metrics) {
    await prisma.systemMetric.create({
      data: metric,
    });
  }
  
  console.log('Metrics seeded successfully.');
}

seedMetrics()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
