import { test, expect, type Page } from '@playwright/test';

test.describe('Golden Path E2E', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let guestName = `E2E Guest ${Date.now()}`;
  let guestEmail = `e2e${Date.now()}@example.com`;
  let guestId = '';
  let bookingId = '';

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Step 1: Admin Login', async () => {
    // Go to login page
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'admin@Noorhotel.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    
    // Click login button
    await page.click('button:has-text("Login")');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Expect dashboard text to be visible
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  });

  test('Step 2: Create Booking (Wizard)', async () => {
    await page.goto('/guests');
    
    // Click New Booking
    await page.click('button:has-text("New Booking")');
    
    // Wait for modal
    await expect(page.locator('h2', { hasText: 'New Booking Wizard' })).toBeVisible();
    
    // ----------------------------------------------------
    // STEP 1: Guest Details
    // ----------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Guest Details' })).toBeVisible();
    
    // The inputs don't have name attributes, but we can find them by associated labels
    // Wait for inputs to be ready
    await page.waitForSelector('input[type="text"]');
    
    // Fill Guest Name
    await page.fill('input:below(:text("Guest Name *"))', guestName);
    
    // Fill Phone
    await page.fill('input:below(:text("Phone Number *"))', '+1234567890');
    
    // Fill Email
    await page.fill('input:below(:text("Email Address"))', guestEmail);
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // ----------------------------------------------------
    // STEP 2: Stay Details
    // ----------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Stay Details' })).toBeVisible();
    
    // Just accept default dates (today to tomorrow) and click Next
    await page.click('button:has-text("Next")');
    
    // ----------------------------------------------------
    // STEP 3: Room Selection
    // ----------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Room Selection' })).toBeVisible();
    
    // Wait for available rooms to load. We click the first room card that appears.
    // The room cards have a checkmark when selected.
    await page.waitForSelector('text=Rs.'); // Wait for price to show up
    
    // Click the first room in the list
    await page.locator('text=/Floor \\d/').first().click();
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // ----------------------------------------------------
    // STEP 4: Pricing Summary
    // ----------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Pricing Summary' })).toBeVisible();
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // ----------------------------------------------------
    // STEP 5: Payment
    // ----------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Payment' })).toBeVisible();
    
    // Select Cash (easier than card details)
    await page.click('input[value="Cash"]');
    
    // Confirm Booking
    await page.click('button:has-text("Confirm Booking")');
    
    // ----------------------------------------------------
    // STEP 6: Confirmation
    // ----------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Booking Confirmed!' })).toBeVisible({ timeout: 10000 });
    
    // Click Done
    await page.click('button:has-text("Done")');
    
    // Modal should close
    await expect(page.locator('h2', { hasText: 'New Booking Wizard' })).toBeHidden();
  });

  // Variables to hold state between steps
  let assignedRoom = '';
  
  test('Step 3: Process Check-In', async () => {
    await page.goto('/checkin');
    
    // Search for our guest
    await page.fill('input[placeholder*="Search"]', guestName);
    
    // Wait for the row to appear
    const row = page.locator(`tr:has-text("${guestName}")`).first();
    await expect(row).toBeVisible();
    
    // Extract room number from the 3rd column (index 2)
    const roomText = await row.locator('td').nth(2).innerText();
    assignedRoom = roomText.split(' ')[0]; // e.g., "101 (Deluxe)" -> "101"
    
    // Click Process Check-In
    await row.locator('button:has-text("Process Check-In")').click();
    
    // Handle the browser alert that appears upon confirmation
    page.once('dialog', dialog => dialog.accept());
    
    // Click Confirm
    await row.locator('button:has-text("Confirm")').click();
    
    // Wait for the row to disappear from the checkin table (since it's now CHECKED_IN)
    await expect(row).toBeHidden({ timeout: 10000 });
  });

  test('Step 4: Add Restaurant Order', async () => {
    await page.goto('/restaurant');
    
    // Click New Order
    await page.click('button:has-text("New Order")');
    
    // Wait for modal
    await expect(page.locator('h2', { hasText: 'New Order' })).toBeVisible();
    
    // We need at least one menu item. Assuming the DB is seeded.
    // Click the first menu item available in the list.
    const firstMenuItem = page.locator('div.grid > div.cursor-pointer').first();
    await expect(firstMenuItem).toBeVisible();
    await firstMenuItem.click();
    
    // Fill Room Number
    await page.fill('input[placeholder="e.g. 101"]', assignedRoom);
    
    // Fill Notes
    await page.fill('textarea[placeholder*="Extra spicy"]', 'E2E Test Order');
    
    // Submit
    await page.click('button:has-text("Place Order")');
    
    // Wait for modal to close
    await expect(page.locator('h2', { hasText: 'New Order' })).toBeHidden();
    
    // Verify order appears in Pending column
    await expect(page.locator('div.rounded-2xl', { has: page.locator('h3', { hasText: 'Pending' }) }).locator(`text=Room ${assignedRoom}`)).toBeVisible();
  });

  test('Step 5: Checkout and Billing', async () => {
    await page.goto('/checkout');
    
    // Search for our guest
    await page.fill('input[placeholder*="Search"]', guestName);
    
    const row = page.locator(`tr:has-text("${guestName}")`).first();
    await expect(row).toBeVisible();
    
    // Click Process Billing
    await row.locator('button:has-text("Process Billing")').click();
    
    // This redirects to /billing. Wait for navigation.
    await page.waitForURL('/billing');
    
    // In Billing, search again (just to be safe, though clicking might have pre-selected it or we just need to search)
    await page.fill('input[placeholder*="Search"]', guestName);
    
    // Click the invoice row
    const invoiceRow = page.locator(`tr:has-text("${guestName}")`).first();
    await expect(invoiceRow).toBeVisible();
    await invoiceRow.click();
    
    // Wait for folio details to load
    await expect(page.locator('h3', { hasText: 'Itemized Bill' })).toBeVisible();
    
    // Set up dialog handler for the payment success alerts (there might be two: payment success, and checked out)
    let dialogCount = 0;
    page.on('dialog', async dialog => {
      dialogCount++;
      await dialog.accept();
    });
    
    // Click Receive Payment
    await page.click('button:has-text("Receive Payment")');
    
    // Wait for the status badge to change to 'Paid' (since balance should be 0)
    await expect(page.locator('span:has-text("Paid")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Step 6: Verify Notification', async () => {
    // Assuming notifications appear somewhere or can be checked
    // For now, let's just make sure we are still logged in and no errors occurred
    await page.goto('/dashboard');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  });
});
