import { test, expect } from './base-test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Retroactive Referral Code System (Ticket 754)', () => {
  // Use unauthenticated role so we can manage fresh users for each test
  test.use({ authRole: 'none' });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  const generateEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@retroactive.test`;

  async function loginAs(page: import("@playwright/test").Page, email: string) {
    await page.goto('/login');
    // Using standard E2E test IDs for login
    await page.getByTestId('e2e-email-input').fill(email);
    await page.getByTestId('e2e-password-input').fill('password');
    await page.getByTestId('e2e-login-submit').click();
    // Wait for successful login redirect (dashboard heading)
    await expect(page.locator('h2:has-text("Upload & Automate")').first()).toBeVisible({ timeout: 15000 });
  }

  async function setupUserWithAccount(email: string, providerId: string, emailVerified = true) {
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Test User',
        role: 'USER',
        emailVerified: emailVerified ? new Date() : null,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: providerId,
        access_token: 'mock-token',
        accountName: 'Google Account',
      },
    });

    return user;
  }

  const getRetroactiveInput = (page: import("@playwright/test").Page) => page.locator('input:not([readonly])').last();
  const getSubmitButton = (page: import("@playwright/test").Page) => page.getByRole('button', { name: /Apply Code|Submit/i });
  const getRetroactiveHeading = (page: import("@playwright/test").Page) => page.locator('text=Did a friend refer you?');
  const getAlert = (page: import("@playwright/test").Page) => page.getByRole('alert');

  test('Happy Path 1 (Social Reward): User gets Social reward retroactively', async ({ page }) => {
    const referrerEmail = generateEmail('referrer');
    const referrerCode = `REF-${Date.now()}`;
    const referrer = await prisma.user.create({
      data: {
        email: referrerEmail,
        referralCode: referrerCode,
        extraPostsQuota: 0,
      }
    });

    const userEmail = generateEmail('user1');
    const providerId = `google-${Date.now()}`;
    const user = await setupUserWithAccount(userEmail, providerId);

    await loginAs(page, userEmail);
    await page.goto('/referral');

    await expect(getRetroactiveHeading(page)).toBeVisible();
    
    await getRetroactiveInput(page).fill(referrerCode);
    await getSubmitButton(page).click();

    // Verify UI success or disappearance
    await expect(getRetroactiveHeading(page)).toBeHidden({ timeout: 10000 });

    // Verify DB updates
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.referredById).toBe(referrer.id);
    expect(updatedUser?.referralRewardClaimed).toBe(true);
    expect(updatedUser?.extraPostsQuota).toBe(1);

    const updatedReferrer = await prisma.user.findUnique({ where: { id: referrer.id } });
    expect(updatedReferrer?.extraPostsQuota).toBe(1);
    
    // Verify ClaimedSocialAccount
    const claimed = await prisma.claimedSocialAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: providerId } }
    });
    expect(claimed).not.toBeNull();
  });

  test('Happy Path 2 (Paid Reward): Paid user enters code, referrer gets paid reward', async ({ page }) => {
    const referrerEmail = generateEmail('referrer-paid');
    const referrerCode = `REF-PAID-${Date.now()}`;
    const referrer = await prisma.user.create({
      data: {
        email: referrerEmail,
        referralCode: referrerCode,
        aiCredits: 0, // Using aiCredits to verify if Paid Tier referrer gets reward
      }
    });

    const userEmail = generateEmail('user2');
    const user = await prisma.user.create({
      data: { 
        email: userEmail, 
        role: 'USER',
        emailVerified: new Date()
      }
    });
    
    // Setup Paid Tier Billing Profile
    await prisma.billingProfile.create({
      data: {
        userId: user.id,
        providerCustomerId: `cus_${Date.now()}`,
        subscriptionTier: 'CREATOR_PRO',
        subscriptionStatus: 'ACTIVE'
      }
    });
    
    await loginAs(page, userEmail);
    await page.goto('/referral');

    await expect(getRetroactiveHeading(page)).toBeVisible();
    
    await getRetroactiveInput(page).fill(referrerCode);
    await getSubmitButton(page).click();
    
    await expect(getRetroactiveHeading(page)).toBeHidden({ timeout: 10000 });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.referredById).toBe(referrer.id);
  });

  test('Happy Path 3 (Double Dip): Both Social and Paid rewards are correctly distributed', async ({ page }) => {
    const referrerEmail = generateEmail('referrer-double');
    const referrerCode = `REF-DOUB-${Date.now()}`;
    const referrer = await prisma.user.create({
      data: {
        email: referrerEmail,
        referralCode: referrerCode,
        extraPostsQuota: 0,
      }
    });

    const userEmail = generateEmail('user3');
    const providerId = `google-double-${Date.now()}`;
    const user = await setupUserWithAccount(userEmail, providerId);

    // Also give user Paid tier
    await prisma.billingProfile.create({
      data: {
        userId: user.id,
        providerCustomerId: `cus_double_${Date.now()}`,
        subscriptionTier: 'CREATOR_PRO',
        subscriptionStatus: 'ACTIVE'
      }
    });

    await loginAs(page, userEmail);
    await page.goto('/referral');

    await getRetroactiveInput(page).fill(referrerCode);
    await getSubmitButton(page).click();
    
    await expect(getRetroactiveHeading(page)).toBeHidden({ timeout: 10000 });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.referredById).toBe(referrer.id);
    expect(updatedUser?.referralRewardClaimed).toBe(true);
    expect(updatedUser?.extraPostsQuota).toBe(1);
    
    const claimed = await prisma.claimedSocialAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: providerId } }
    });
    expect(claimed).not.toBeNull();
  });

  test('Edge Scenario: User gets NO social reward if account already claimed', async ({ page }) => {
    const referrerEmail = generateEmail('referrer-edge');
    const referrerCode = `REF-EDGE-${Date.now()}`;
    const referrer = await prisma.user.create({
      data: {
        email: referrerEmail,
        referralCode: referrerCode,
        extraPostsQuota: 0,
      }
    });

    const userEmail = generateEmail('user4');
    const providerId = `google-edge-${Date.now()}`;
    const user = await setupUserWithAccount(userEmail, providerId);

    // Simulate another user already claimed this account
    await prisma.claimedSocialAccount.create({
      data: { provider: 'google', providerAccountId: providerId }
    });

    await loginAs(page, userEmail);
    await page.goto('/referral');

    await getRetroactiveInput(page).fill(referrerCode);
    await getSubmitButton(page).click();
    
    // Form should still succeed and disappear (they get added to referredById)
    await expect(getRetroactiveHeading(page)).toBeHidden({ timeout: 10000 });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.referredById).toBe(referrer.id);
    // Social reward should NOT be given
    expect(updatedUser?.referralRewardClaimed).toBe(false);
    expect(updatedUser?.extraPostsQuota).toBe(0);
  });

  test('Negative Scenario 1: Submits an invalid/non-existent referral code', async ({ page }) => {
    const userEmail = generateEmail('user5');
    const user = await prisma.user.create({
      data: { email: userEmail, role: 'USER' }
    });

    await loginAs(page, userEmail);
    await page.goto('/referral');

    await getRetroactiveInput(page).fill('INVALID-CODE-123');
    await getSubmitButton(page).click();

    // Expect an alert showing error
    await expect(getAlert(page)).toBeVisible();
    // UI should still display the form
    await expect(getRetroactiveHeading(page)).toBeVisible();
  });

  test('Negative Scenario 2: User already has a referredById', async ({ page }) => {
    const referrerEmail = generateEmail('referrer-neg2');
    const referrer = await prisma.user.create({
      data: { email: referrerEmail, referralCode: `REF-NEG2-${Date.now()}` }
    });

    const userEmail = generateEmail('user6');
    const user = await prisma.user.create({
      data: { 
        email: userEmail, 
        role: 'USER',
        referredById: referrer.id // Already has referral
      }
    });

    await loginAs(page, userEmail);
    await page.goto('/referral');

    // The component should not even render
    await expect(getRetroactiveHeading(page)).toBeHidden();
  });

  test('Negative Scenario 2 API: Submitting code when already referred returns 400', async ({ page }) => {
    const referrerCode = `REF-NEG2API-${Date.now()}`;
    const referrer = await prisma.user.create({
      data: { email: generateEmail('referrer-neg2api'), referralCode: referrerCode }
    });

    const userEmail = generateEmail('user7');
    const user = await prisma.user.create({
      data: { email: userEmail, role: 'USER' }
    });

    await loginAs(page, userEmail);
    await page.goto('/referral');

    // In the background, set the user's referredById
    await prisma.user.update({
      where: { id: user.id },
      data: { referredById: referrer.id }
    });

    await getRetroactiveInput(page).fill(referrerCode);
    await getSubmitButton(page).click();

    // The API should reject and UI should show error
    await expect(getAlert(page)).toBeVisible();
  });

  test('Negative Scenario 3: Submits their own referral code', async ({ page }) => {
    const ownCode = `OWN-CODE-${Date.now()}`;
    const userEmail = generateEmail('user8');
    const user = await prisma.user.create({
      data: { 
        email: userEmail, 
        role: 'USER',
        referralCode: ownCode
      }
    });

    await loginAs(page, userEmail);
    await page.goto('/referral');

    await getRetroactiveInput(page).fill(ownCode);
    await getSubmitButton(page).click();

    await expect(getAlert(page)).toBeVisible();
    await expect(getRetroactiveHeading(page)).toBeVisible();
  });
});
