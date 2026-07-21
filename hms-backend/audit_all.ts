/**
 * Full system audit script — tests every major API endpoint
 * Run with: npx ts-node audit_all.ts
 */
import 'dotenv/config';

const BASE = 'http://127.0.0.1:4000';
let token = '';
let passed = 0;
let failed = 0;
const issues: string[] = [];

async function req(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data: any = {};
  try { data = await res.json(); } catch { }
  return { status: res.status, data };
}

function check(name: string, status: number, expectedStatus: number, data: any, checks?: (d: any) => string | null) {
  const statusOk = status === expectedStatus;
  const extraCheck = checks ? checks(data) : null;
  if (statusOk && !extraCheck) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    const reason = !statusOk ? `Expected ${expectedStatus} got ${status}` : extraCheck;
    console.log(`  ❌ ${name} — ${reason}`);
    console.log(`     data: ${JSON.stringify(data).substring(0, 150)}`);
    issues.push(`${name}: ${reason}`);
    failed++;
  }
}

async function main() {
  console.log('\n🔑 AUTH TESTS');
  const loginRes = await req('POST', '/api/auth/login', { email: 'Noorullah', password: 'Noor123' });
  check('Login', loginRes.status, 200, loginRes.data, d => d.accessToken ? null : 'No accessToken');
  token = loginRes.data.accessToken || '';

  if (!token) { console.log('Cannot continue without token'); return; }

  console.log('\n📊 DASHBOARD TESTS');
  const summaryRes = await req('GET', '/api/dashboard/summary');
  check('Dashboard Summary', summaryRes.status, 200, summaryRes.data, d =>
    typeof d.checkIns === 'object' ? null : 'Missing checkIns'
  );

  const roomsStatusRes = await req('GET', '/api/dashboard/rooms-status');
  check('Dashboard Rooms Status', roomsStatusRes.status, 200, roomsStatusRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n🛏️ ROOMS TESTS');
  const roomsRes = await req('GET', '/api/rooms?limit=10');
  check('Get Rooms', roomsRes.status, 200, roomsRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  const roomTypesRes = await req('GET', '/api/rooms/types');
  check('Get Room Types', roomTypesRes.status, 200, roomTypesRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n📅 BOOKINGS TESTS');
  const bookingsRes = await req('GET', '/api/bookings?limit=10');
  check('Get All Bookings', bookingsRes.status, 200, bookingsRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  const foreignRes = await req('GET', '/api/bookings?bookingType=FOREIGN&limit=10');
  check('Get Foreign Bookings', foreignRes.status, 200, foreignRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  console.log('\n👥 GUESTS TESTS');
  const guestsRes = await req('GET', '/api/guests?limit=10');
  check('Get Guests', guestsRes.status, 200, guestsRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  console.log('\n✅ CHECK-IN TESTS');
  const checkinBookingsRes = await req('GET', '/api/bookings?status=CONFIRMED&limit=10');
  check('Get Confirmed Bookings (for check-in)', checkinBookingsRes.status, 200, checkinBookingsRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  console.log('\n🚪 CHECK-OUT TESTS');
  const checkedInRes = await req('GET', '/api/bookings?status=CHECKED_IN&limit=10');
  check('Get Checked-In Bookings (for checkout)', checkedInRes.status, 200, checkedInRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  console.log('\n💰 BILLING TESTS');
  const billingRes = await req('GET', '/api/bookings?limit=50');
  check('Billing - Get Bookings', billingRes.status, 200, billingRes.data, d =>
    d.data && Array.isArray(d.data) ? null : 'Missing data array'
  );

  // Test folio for first booking if any
  if (billingRes.data.data && billingRes.data.data.length > 0) {
    const firstBookingRawId = billingRes.data.data[0].rawId;
    const folioRes = await req('GET', `/api/bookings/${firstBookingRawId}/folio`);
    check('Booking Folio', folioRes.status, 200, folioRes.data, d =>
      typeof d.subTotal === 'number' ? null : 'Missing subTotal'
    );

    // Test PDF
    const pdfRes = await fetch(`${BASE}/api/invoices/${firstBookingRawId}/pdf?token=${token}`);
    check('Invoice PDF (by bookingId)', pdfRes.status, 200, {}, () =>
      pdfRes.headers.get('content-type')?.includes('pdf') ? null : `Wrong content-type: ${pdfRes.headers.get('content-type')}`
    );
  }

  console.log('\n🍽️ RESTAURANT TESTS');
  const menuRes = await req('GET', '/api/restaurant/menu');
  check('Get Menu Items', menuRes.status, 200, menuRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  const catRes = await req('GET', '/api/restaurant/categories');
  check('Get Menu Categories', catRes.status, 200, catRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  const ordersRes = await req('GET', '/api/restaurant/orders');
  check('Get Restaurant Orders', ordersRes.status, 200, ordersRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n🧹 HOUSEKEEPING TESTS');
  const hkRes = await req('GET', '/api/housekeeping');
  check('Get Housekeeping Tasks', hkRes.status, 200, hkRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n👨‍💼 STAFF TESTS');
  const staffRes = await req('GET', '/api/staff');
  check('Get Staff', staffRes.status, 200, staffRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n📈 REPORTS TESTS');
  const revenueRes = await req('GET', '/api/reports/revenue');
  check('Revenue Report', revenueRes.status, 200, revenueRes.data, d =>
    d && typeof d === 'object' ? null : 'Empty response'
  );

  const occupancyRes = await req('GET', '/api/reports/occupancy');
  check('Occupancy Report', occupancyRes.status, 200, occupancyRes.data, d =>
    d && typeof d === 'object' ? null : 'Empty response'
  );

  console.log('\n🔔 NOTIFICATIONS TESTS');
  const notifRes = await req('GET', '/api/notifications');
  check('Get Notifications', notifRes.status, 200, notifRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n⚙️ SETTINGS TESTS');
  const settingsRes = await req('GET', '/api/settings');
  check('Get Settings', settingsRes.status, 200, settingsRes.data, d =>
    d && typeof d === 'object' ? null : 'Empty response'
  );

  const rolesRes = await req('GET', '/api/roles');
  check('Get Roles', rolesRes.status, 200, rolesRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  const auditRes = await req('GET', '/api/audit-logs?limit=10');
  check('Get Audit Logs', auditRes.status, 200, auditRes.data, d =>
    d && (Array.isArray(d) || Array.isArray(d.data)) ? null : 'Empty response'
  );

  console.log('\n📋 PAYMENTS TESTS');
  const paymentsRes = await req('GET', '/api/payments');
  check('Get Payments', paymentsRes.status, 200, paymentsRes.data, d =>
    Array.isArray(d) ? null : 'Not an array'
  );

  console.log('\n════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (issues.length > 0) {
    console.log('\n⚠️ Issues Found:');
    issues.forEach(i => console.log(`  - ${i}`));
  } else {
    console.log('🎉 All tests passed!');
  }
}

main().catch(err => console.error('Audit crashed:', err));
