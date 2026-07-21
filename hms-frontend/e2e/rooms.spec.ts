import { test, expect, type Page } from '@playwright/test';

test.describe('Rooms Module E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Login and navigate to Rooms', async () => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@Noorhotel.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/dashboard');
    await page.goto('/rooms');
    await expect(page.locator('h1', { hasText: 'Room Management' })).toBeVisible();
  });

  test('Add a new room', async () => {
    await page.goto('/rooms');
    await page.click('button:has-text("Add Room")');
    await expect(page.locator('h2', { hasText: 'Add New Room' })).toBeVisible();
    
    await page.fill('input[placeholder="e.g. 101"]', '999');
    await page.selectOption('select:above(:text("Floor"))', { index: 1 });
    await page.click('button:has-text("Save Room")');
  });

  test('Filter rooms', async () => {
    await page.goto('/rooms');
    await page.selectOption('select:near(:text("Room Type"))', { index: 0 });
  });
});
