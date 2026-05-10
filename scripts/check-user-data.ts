import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'tester@socialstudio.ai' },
    include: {
      accounts: true,
      metadataTemplates: true,
    },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User found:', user.email);
  console.log('Accounts count:', user.accounts.length);
  user.accounts.forEach(acc => {
    console.log(`- Account: ${acc.provider}, ID: ${acc.providerAccountId}, accountName: ${acc.accountName || 'N/A'}`);
  });

  console.log('MetadataTemplates count:', user.metadataTemplates.length);
  user.metadataTemplates.forEach(t => {
    console.log(`- Template: ${t.name}, Content: ${t.content?.substring(0, 20) || 'N/A'}...`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
