require('dotenv').config();
import prisma from './src/prisma';
const axios = {
  get: async (url: string, config?: any) => fetch(url, config).then(async r => { const data = await r.json(); if (!r.ok) throw { response: { status: r.status, data } }; return { data }; }),
  post: async (url: string, body: any, config?: any) => fetch(url, { ...config, method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...config?.headers } }).then(async r => { const data = await r.json(); if (!r.ok) throw { response: { status: r.status, data } }; return { data }; }),
  put: async (url: string, body: any, config?: any) => fetch(url, { ...config, method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...config?.headers } }).then(async r => { const data = await r.json(); if (!r.ok) throw { response: { status: r.status, data } }; return { data }; }),
  delete: async (url: string, config?: any) => fetch(url, { ...config, method: 'DELETE', headers: config?.headers }).then(async r => { const data = await r.json().catch(()=>({})); if (!r.ok) throw { response: { status: r.status, data } }; return { data }; })
};
import bcrypt from 'bcrypt';
const API_BASE = 'http://localhost:4000/api';

async function runTests() {
  console.log('--- STARTING STAFF TESTS ---');

  // 1. Get Admin Token
  let adminToken = '';
  try {
    const user = await prisma.user.findFirst({ where: { role: { name: 'Admin' } } });
    if (!user) {
      console.log('No Admin user found.');
      return;
    }
    console.log('Found Admin User:', user.email, 'Username:', user.username);
    
    const jwt = require('jsonwebtoken');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET missing');
    adminToken = jwt.sign({ userId: user.id, role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Admin login successful via dotenvx token.');
  } catch (e: any) {
    console.error('Failed to login admin:', e.response?.data || e.message);
    return;
  }

  // 2. Create Staff Test
  const newEmail = `staff_${Date.now()}@test.com`;
  let newStaffId = '';
  let newUserId = '';
  try {
    const res = await axios.post(`${API_BASE}/staff`, {
      name: 'Test Staff',
      email: newEmail,
      department: 'Housekeeping',
      role: 'Cleaner',
      status: 'Active'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    newStaffId = res.data.id;
    console.log('Test 1: Create staff successful.');
  } catch (e: any) {
    console.error('Test 1 Failed:', e.response?.data || e.message);
  }

  // Find the created user
  const createdStaff = await prisma.staff.findUnique({ where: { id: newStaffId }, include: { user: true } });
  if (createdStaff) {
    newUserId = createdStaff.userId;
    try {
      await axios.post(`${API_BASE}/auth/login`, { username: createdStaff.user.email, password: 'Password123!' });
      console.log('Test 1.1: Login as new staff successful.');
    } catch (e: any) {
      console.error('Test 1.1 Failed (Login as new staff):', e.response?.data || e.message);
    }
  }

  // 3. Create Duplicate Username Test
  try {
    await axios.post(`${API_BASE}/staff`, {
      name: 'Duplicate Staff',
      email: newEmail.toUpperCase(),
      department: 'Housekeeping',
      role: 'Cleaner',
      status: 'Active'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.error('Test 2 Failed: Duplicate creation SHOULD have been rejected.');
  } catch (e: any) {
    if (e.response?.status === 400) {
      console.log('Test 2: Duplicate creation rejected correctly.');
    } else {
      console.error('Test 2 Failed with wrong status:', e.response?.data || e.message);
    }
  }

  // 4. Update Role Test
  try {
    const res = await axios.put(`${API_BASE}/staff/${newStaffId}`, {
      role: 'Senior Cleaner',
      department: 'Housekeeping',
      status: 'Active',
      name: 'Test Staff Updated',
      email: newEmail
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Test 3: Update staff role successful.');
  } catch (e: any) {
    console.error('Test 3 Failed:', e.response?.data || e.message);
  }

  // 5. Deactivate Staff Test
  try {
    await axios.put(`${API_BASE}/staff/${newStaffId}`, {
      status: 'Inactive',
      department: 'Housekeeping',
      role: 'Senior Cleaner',
      name: 'Test Staff Updated',
      email: newEmail
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Test 4: Deactivate staff successful.');
    
    // Try to login
    try {
      await axios.post(`${API_BASE}/auth/login`, { username: newEmail, password: 'Password123!' });
      console.error('Test 4.1 Failed: Inactive staff SHOULD NOT be able to login.');
    } catch (e: any) {
      console.log('Test 4.1: Login rejected for inactive staff correctly.');
    }
  } catch (e: any) {
    console.error('Test 4 Failed:', e.response?.data || e.message);
  }

  // 6. Delete staff with history test
  // First, create history
  try {
    await prisma.housekeepingTask.create({
      data: {
        staffId: newStaffId,
        area: 'Test Area',
        priority: 'Medium',
        taskType: 'Cleaning',
        status: 'COMPLETED'
      }
    });
    
    // Now delete
    await axios.delete(`${API_BASE}/staff/${newStaffId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Test 5: Delete staff with history successful.');
    
    // Check if task exists but staff is null
    const task = await prisma.housekeepingTask.findFirst({ where: { area: 'Test Area' } });
    if (task && task.staffId === null) {
        console.log('Test 5.1: Task history intact, staffId set to null.');
    } else {
        console.log('Test 5.1: Task was deleted or staffId not null (CASCADE). Task:', task);
    }
  } catch (e: any) {
    console.error('Test 5 Failed:', e.response?.data || e.message);
  }

  // 7. Reset password as admin test
  // Will create another staff
  let anotherStaffId = '';
  try {
      const res2 = await axios.post(`${API_BASE}/staff`, {
        name: 'Another Staff',
        email: `another_${Date.now()}@test.com`,
        department: 'Reception',
        role: 'Clerk',
        status: 'Active'
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      anotherStaffId = res2.data.id;
      
      const created2 = await prisma.staff.findUnique({ where: { id: anotherStaffId }, include: { user: true } });
      
      // Assume there is a reset password endpoint. Wait, is there? 
      // I will check the routes next, but let's see if /auth/reset or /staff/:id/password exists
      console.log('Test 6: Need to check if password reset endpoint exists.');
  } catch (e: any) {
      console.error('Test 6 setup failed:', e.response?.data || e.message);
  }

  // 8. Non-Admin roles test
  try {
     const receptionist = await prisma.user.findFirst({ where: { role: { name: 'Receptionist' } } });
     if (receptionist) {
         await prisma.user.update({ where: { id: receptionist.id }, data: { passwordHash: await bcrypt.hash('Rec123!', await bcrypt.genSalt(10)) } });
         const recLogin = await axios.post(`${API_BASE}/auth/login`, { username: receptionist.email, password: 'Rec123!' });
         const recToken = recLogin.data.accessToken;
         
         await axios.get(`${API_BASE}/staff`, { headers: { Authorization: `Bearer ${recToken}` } });
         console.error('Test 7 Failed: Receptionist SHOULD NOT access staff management.');
     } else {
         console.log('No receptionist found for Test 7.');
     }
  } catch (e: any) {
      if (e.response?.status === 403) {
          console.log('Test 7: Receptionist access denied correctly.');
      } else {
          console.error('Test 7 Failed with wrong status:', e.response?.data || e.message);
      }
  }

}

runTests().then(() => console.log('Done')).catch(console.error);
