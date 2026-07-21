import { test, expect, type Page } from '@playwright/test';

test.describe('Guests Module E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Login and navigate to Guests', async () => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@Noorhotel.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/dashboard');
    await page.goto('/guests');
    await expect(page.locator('h1', { hasText: 'Guest Management System' })).toBeVisible();
  });

  test('Filter guests', async () => {
    await page.goto('/guests');
    await page.fill('input[placeholder*="Search"]', 'John');
    // Verify filtering updates table
  });
});
