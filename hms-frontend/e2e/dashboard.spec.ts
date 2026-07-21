import { test, expect, type Page } from '@playwright/test';

test.describe('Dashboard Module E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Login and navigate to Dashboard', async () => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@Noorhotel.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/dashboard');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  });

  test('Stat cards and charts load', async () => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Revenue Trend')).toBeVisible();
    await expect(page.locator('text=Occupancy Rate')).toBeVisible();
  });
});
