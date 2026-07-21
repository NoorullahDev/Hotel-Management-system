import { test, expect, type Page } from '@playwright/test';

test.describe('Settings Module E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Login and navigate to Settings', async () => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@Noorhotel.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/dashboard');
    await page.goto('/settings');
    await expect(page.locator('h1', { hasText: 'General Settings' })).toBeVisible();
  });

  test('Update general settings', async () => {
    await page.goto('/settings');
    await page.click('button:has-text("General Settings")'); // Sidebar tab
    await page.fill('input[placeholder="Grand Park Hotel"]', 'Golden Horizon Resort');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Saved Successfully')).toBeVisible();
  });
});
