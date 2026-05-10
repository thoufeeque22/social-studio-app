import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'tester@socialstudio.ai';

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Create the E2E test user
    user = await prisma.user.create({
      data: {
        email,
        name: 'E2E Tester',
      },
    });
    console.log(`Successfully created E2E test user with email: ${email}`);
  } else {
    console.log(`User with email ${email} already exists.`);
  }

  // Check if accounts already exist
  const existingAccounts = await prisma.account.findMany({
    where: { userId: user.id },
  });

  if (existingAccounts.length > 0) {
    console.log('User already has accounts. Skipping account creation.');
    return;
  }

  // Create accounts for the user
  await prisma.account.createMany({
    data: [
      {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'e2e-google-account',
        accountName: 'Tester Alpha',
      },
      {
        userId: user.id,
        type: 'oauth',
        provider: 'tiktok',
        providerAccountId: 'e2e-tiktok-account',
        accountName: 'Tester Beta',
      },
    ],
  });

  console.log('Successfully created accounts for the E2E test user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
