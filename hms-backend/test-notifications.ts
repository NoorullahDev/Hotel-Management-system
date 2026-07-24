import prisma from './src/prisma';
import { getIO } from './src/socket';
import { notifyRoles } from './src/services/notificationService';

const axios = {
  get: async (url: string, config?: any) => fetch(url, config).then(async r => { const data = await r.json(); if (!r.ok) throw { response: { status: r.status, data } }; return { data }; }),
  post: async (url: string, data: any, config?: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...config?.headers }, body: JSON.stringify(data) }).then(async r => { const d = await r.json(); if (!r.ok) throw { response: { status: r.status, data: d } }; return { data: d }; }),
  patch: async (url: string, data: any, config?: any) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...config?.headers }, body: JSON.stringify(data) }).then(async r => { const d = await r.json(); if (!r.ok) throw { response: { status: r.status, data: d } }; return { data: d }; }),
  delete: async (url: string, config?: any) => fetch(url, { method: 'DELETE', headers: config?.headers }).then(async r => { const d = await r.json(); if (!r.ok) throw { response: { status: r.status, data: d } }; return { data: d }; })
};

// Setup mock axios to fetch directly from backend process running or we can just test functions directly using Prisma if the backend server is running.
const PORT = 4000;
const API_BASE = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log('--- STARTING NOTIFICATION TESTS ---');

  // 1. Get an Admin and a Receptionist
  let admin = await prisma.user.findFirst({ where: { role: { name: 'Admin' } }, include: { role: true } });
  let receptionist = await prisma.user.findFirst({ where: { role: { name: 'Receptionist' } }, include: { role: true } });

  if (!receptionist) {
    const role = await prisma.role.findFirst({ where: { name: 'Receptionist' } });
    if (role) {
      receptionist = await prisma.user.create({
        data: { username: 'rectest', email: 'rectest@test.com', name: 'Rec Test', passwordHash: '123', roleId: role.id },
        include: { role: true }
      });
    }
  }

  if (!admin || !receptionist) {
    console.error('Missing Admin or Receptionist');
    return;
  }

  // Login to get tokens
  const adminLogin = await axios.post(`${API_BASE}/auth/login`, { identifier: 'admin', password: 'Password123!' });
  const adminToken = adminLogin.data.token;
  
  const recLogin = await axios.post(`${API_BASE}/auth/login`, { identifier: receptionist.username, password: '123' });
  const recToken = recLogin.data.token;

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const recHeaders = { Authorization: `Bearer ${recToken}` };

  try {
    // 6. Test with 0 notifications (clean state)
    console.log('Test 6: 0 Notifications');
    await prisma.notification.deleteMany({ where: { userId: admin.id } });
    const res0 = await axios.get(`${API_BASE}/notifications`, { headers: adminHeaders });
    if (res0.data.data.length !== 0) throw new Error('Expected 0 notifications');
    console.log('Test 6 Passed');

    // 1. Trigger notification
    console.log('Test 1: Trigger Event & Scope');
    // Call the service directly to trigger
    await notifyRoles(['Admin'], 'System', 'Admin Test', 'Only Admin should see this');
    await notifyRoles(['Receptionist'], 'Booking', 'Booking Test', 'Only Receptionist should see this');
    
    // Check scopes
    const adminRes1 = await axios.get(`${API_BASE}/notifications`, { headers: adminHeaders });
    const recRes1 = await axios.get(`${API_BASE}/notifications`, { headers: recHeaders });
    
    if (!adminRes1.data.data.some((n: any) => n.title === 'Admin Test')) throw new Error('Admin did not receive admin notification');
    if (adminRes1.data.data.some((n: any) => n.title === 'Booking Test')) throw new Error('Admin improperly received receptionist notification');
    
    if (!recRes1.data.data.some((n: any) => n.title === 'Booking Test')) throw new Error('Receptionist did not receive booking notification');
    if (recRes1.data.data.some((n: any) => n.title === 'Admin Test')) throw new Error('Receptionist improperly received admin notification');
    console.log('Test 1 & Scope Passed');

    // 2. Mark as read
    console.log('Test 2: Mark as read');
    const targetNotif = adminRes1.data.data[0];
    await axios.patch(`${API_BASE}/notifications/${targetNotif.id}/read`, {}, { headers: adminHeaders });
    const adminRes2 = await axios.get(`${API_BASE}/notifications`, { headers: adminHeaders });
    const updatedNotif = adminRes2.data.data.find((n: any) => n.id === targetNotif.id);
    if (!updatedNotif.isRead) throw new Error('Notification not marked as read');
    console.log('Test 2 Passed');

    // 3. Mark all as read
    console.log('Test 3: Mark all as read');
    await notifyRoles(['Admin'], 'System', 'Admin Test 2', 'Unread');
    await axios.patch(`${API_BASE}/notifications/read-all`, {}, { headers: adminHeaders });
    const adminRes3 = await axios.get(`${API_BASE}/notifications`, { headers: adminHeaders });
    if (adminRes3.data.data.some((n: any) => !n.isRead)) throw new Error('Not all marked as read');
    console.log('Test 3 Passed');

    // 4. Delete notification
    console.log('Test 4: Delete notification');
    const toDelete = adminRes3.data.data[0];
    await axios.delete(`${API_BASE}/notifications/${toDelete.id}`, { headers: adminHeaders });
    const adminRes4 = await axios.get(`${API_BASE}/notifications`, { headers: adminHeaders });
    if (adminRes4.data.data.some((n: any) => n.id === toDelete.id)) throw new Error('Notification not deleted');
    console.log('Test 4 Passed');

    // 7. Test with 100+ notifications
    console.log('Test 7: 100+ notifications');
    // Bulk create 105 notifications
    const bulkData = Array.from({ length: 105 }).map((_, i) => ({
      userId: admin.id,
      title: `Bulk ${i}`,
      message: 'Bulk',
      type: 'System',
      isRead: false
    }));
    await prisma.notification.createMany({ data: bulkData });
    const adminRes7 = await axios.get(`${API_BASE}/notifications?page=2&limit=50`, { headers: adminHeaders });
    if (adminRes7.data.data.length !== 50) throw new Error('Pagination limit failed');
    if (adminRes7.data.stats.unread < 105) throw new Error('Unread count is inaccurate');
    console.log('Test 7 Passed');

    console.log('--- ALL TESTS PASSED ---');
  } catch (err: any) {
    console.error('Test Failed:', err.message || err.response?.data);
  } finally {
    // Cleanup
    await prisma.notification.deleteMany({ where: { title: { startsWith: 'Bulk' } } });
  }
}

runTests();
