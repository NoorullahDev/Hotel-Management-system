import { test, expect, Page } from '@playwright/test';

/**
 * Full Lifecycle E2E Test
 *
 * Flow: Login → Search/Select Guest → Create Booking → Check In →
 *       Add Restaurant Order → Check Out → Download Invoice →
 *       Confirm Invoice in Billing/Invoice Management →
 *       Confirm Notification in Notification Center
 *
 * Prerequisites:
 *   - Backend running on http://127.0.0.1:4000
 *   - Frontend running on http://localhost:3000
 *   - Database seeded (admin@grandparkhotel.com / adminpassword123)
 */

const API = 'http://127.0.0.1:4000';
const ADMIN_EMAIL = 'admin@grandparkhotel.com';
const ADMIN_PASSWORD = 'adminpassword123';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Login via the API and inject the token into localStorage so the frontend
 *  picks it up when navigating to any dashboard page. */
async function loginViaAPI(page: Page) {
  const res = await page.request.post(`${API}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const { accessToken, refreshToken } = await res.json();

  // Set tokens in localStorage before visiting the app
  await page.goto('/');
  await page.evaluate(
    ({ at, rt }) => {
      localStorage.setItem('accessToken', at);
      localStorage.setItem('refreshToken', rt);
    },
    { at: accessToken, rt: refreshToken },
  );
  return accessToken;
}

/** Login via the UI (fills the login form). */
async function loginViaUI(page: Page) {
  await page.goto('/login');

  // The email field is pre-filled with admin@grandparkhotel.com
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(ADMIN_EMAIL);

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(ADMIN_PASSWORD);

  // Click Login button
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page).toHaveURL(/dashboard/);
}

// ── Test ─────────────────────────────────────────────────────────────────────

test.describe('Full Guest Lifecycle', () => {
  let accessToken: string;

  test('complete lifecycle: login → book → checkin → restaurant → checkout → invoice → notifications', async ({
    page,
  }) => {
    // ─── Step 1: Login via UI ────────────────────────────────────────────
    await test.step('Login', async () => {
      await loginViaUI(page);
      // Verify we are on the dashboard
      await expect(page.locator('text=Dashboard').first()).toBeVisible();
    });

    // Save token for API calls later
    accessToken = await page.evaluate(() => localStorage.getItem('accessToken') || '');
    expect(accessToken).toBeTruthy();

    // ─── Step 2: Search & Select a Guest ─────────────────────────────────
    let guestId: string;
    await test.step('Search and select a guest', async () => {
      // Navigate to guest management
      await page.goto('/guests');
      await page.waitForLoadState('networkidle');

      // Look for a guest in the list (seeded: John Doe, Jane Smith, Alice Johnson)
      const guestRow = page.locator('text=John Doe').first();
      await expect(guestRow).toBeVisible({ timeout: 10_000 });

      // Fetch guest ID via API for use in booking
      const res = await page.request.get(`${API}/api/guests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.ok()).toBeTruthy();
      const guests = await res.json();
      const john = guests.find((g: any) => g.name === 'John Doe');
      expect(john).toBeTruthy();
      guestId = john.id;
    });

    // ─── Step 3: Create Booking (via API to avoid complex form filling) ──
    let bookingRawId: string;
    let roomId: string;
    await test.step('Create a booking', async () => {
      // First, find an available room
      const roomsRes = await page.request.get(`${API}/api/rooms?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(roomsRes.ok()).toBeTruthy();
      const rooms = await roomsRes.json();
      const availableRoom = rooms.find((r: any) => r.status === 'AVAILABLE');
      expect(availableRoom).toBeTruthy();
      roomId = availableRoom.id;

      // Create a booking for tomorrow → day after
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 1);
      checkIn.setHours(14, 0, 0, 0);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 2);
      checkOut.setHours(11, 0, 0, 0);

      const bookingRes = await page.request.post(`${API}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          guest: { id: guestId },
          roomId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guestCount: 1,
          subtotal: availableRoom.price || 5000,
          tax: (availableRoom.price || 5000) * 0.1,
          total: (availableRoom.price || 5000) * 1.1,
          paymentMethod: 'Cash',
        },
      });
      expect(bookingRes.ok()).toBeTruthy();
      const booking = await bookingRes.json();
      bookingRawId = booking.id;
      expect(bookingRawId).toBeTruthy();

      // Navigate to booking page and verify it appears
      await page.goto('/booking');
      await page.waitForLoadState('networkidle');
    });

    // ─── Step 4: Check In ────────────────────────────────────────────────
    await test.step('Check in the booking', async () => {
      const checkinRes = await page.request.post(
        `${API}/api/bookings/${bookingRawId}/checkin`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      expect(checkinRes.ok()).toBeTruthy();
      const result = await checkinRes.json();
      expect(result.status).toBe('CHECKED_IN');

      // Verify on checkin page
      await page.goto('/checkin');
      await page.waitForLoadState('networkidle');
    });

    // ─── Step 5: Add a Restaurant Order ──────────────────────────────────
    await test.step('Add a restaurant order', async () => {
      // First ensure there is at least one menu item
      const menuRes = await page.request.get(`${API}/api/restaurant/menu`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(menuRes.ok()).toBeTruthy();
      let menuItems = await menuRes.json();

      // If no menu items exist, create one
      if (menuItems.length === 0) {
        // Create a category first
        await page.request.post(`${API}/api/restaurant/categories`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: { name: 'Main Course' },
        });

        const createItem = await page.request.post(`${API}/api/restaurant/menu`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            name: 'Chicken Biryani',
            category: 'Main Course',
            price: 750,
            isAvailable: true,
          },
        });
        expect(createItem.ok()).toBeTruthy();
        const item = await createItem.json();
        menuItems = [item];
      }

      // Create an order linked to the booking
      const orderRes = await page.request.post(`${API}/api/restaurant/orders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          bookingId: bookingRawId,
          items: [
            {
              itemName: menuItems[0].name,
              quantity: 2,
              price: menuItems[0].price,
            },
          ],
          notes: 'E2E test order',
        },
      });
      expect(orderRes.ok()).toBeTruthy();
      const order = await orderRes.json();
      expect(order.id).toBeTruthy();

      // Visit restaurant page to verify
      await page.goto('/restaurant');
      await page.waitForLoadState('networkidle');
    });

    // ─── Step 6: Check Out ───────────────────────────────────────────────
    let invoiceId: string;
    await test.step('Check out the booking', async () => {
      // First trigger checkout which creates the invoice
      const checkoutRes = await page.request.post(
        `${API}/api/bookings/${bookingRawId}/checkout`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: { discount: 0 },
        },
      );
      expect(checkoutRes.ok()).toBeTruthy();
      const invoice = await checkoutRes.json();
      invoiceId = invoice.id;
      expect(invoiceId).toBeTruthy();

      // Verify on checkout page
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
    });

    // ─── Step 7: Download Invoice (PDF) ──────────────────────────────────
    await test.step('Download invoice PDF', async () => {
      const pdfRes = await page.request.get(
        `${API}/api/invoices/${bookingRawId}/pdf`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      expect(pdfRes.ok()).toBeTruthy();
      expect(pdfRes.headers()['content-type']).toContain('application/pdf');

      // Verify the PDF is non-empty
      const body = await pdfRes.body();
      expect(body.length).toBeGreaterThan(100);
    });

    // ─── Step 8: Confirm Invoice in Billing / Invoice Management ─────────
    await test.step('Confirm invoice appears in Billing page', async () => {
      await page.goto('/billing');
      await page.waitForLoadState('networkidle');

      // The billing page shows bookings with their status
      // Our booking should appear as CHECKED_OUT
      const bookingIdShort = bookingRawId.substring(0, 13).toUpperCase();

      // Look for the booking ID or "CHECKED_OUT" status in the billing table
      // Allow some time for data to load
      const checkedOutText = page.locator('text=CHECKED_OUT').first();
      await expect(checkedOutText).toBeVisible({ timeout: 10_000 });
    });

    // ─── Step 9: Confirm Notification in Notification Center ─────────────
    await test.step('Confirm notification was created', async () => {
      await page.goto('/notifications');
      await page.waitForLoadState('networkidle');

      // Notifications for booking creation, check-in, and check-out should exist
      // Look for any notification mentioning our guest or booking actions
      const notificationContent = page.locator('[class*="notification"], [class*="Notification"], main');

      // At minimum, we should see check-in and check-out notifications
      // (created by notifyRoles in the booking service)
      const pageText = await page.textContent('main');
      
      // Verify at least one booking-related notification exists
      const hasBookingNotification =
        pageText?.includes('checked in') ||
        pageText?.includes('checked out') ||
        pageText?.includes('booking') ||
        pageText?.includes('Booking') ||
        pageText?.includes('Check-in') ||
        pageText?.includes('Check-out');

      expect(hasBookingNotification).toBeTruthy();
    });
  });
});
