import { prisma } from '../src/lib/core/prisma';

async function check() {
  const count = await prisma.roadmapTask.count();
  console.log(`📊 Current RoadmapTask count: ${count}`);
  
  if (count > 0) {
    const sample = await prisma.roadmapTask.findFirst();
    console.log(`🔍 Sample Task: ${sample?.title}`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
