const fs = require('fs');
const path = require('path');

async function testBackupRestore() {
  console.log('Logging in as admin...');
  const loginRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hotel.com', password: 'password123' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed', await loginRes.text());
    return;
  }
  const { token } = await loginRes.json();
  
  console.log('Downloading backup...');
  const backupRes = await fetch('http://127.0.0.1:4000/api/settings/backup/download', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!backupRes.ok) {
    console.error('Download failed', await backupRes.text());
    return;
  }
  
  const buffer = await backupRes.arrayBuffer();
  const filePath = path.join(__dirname, 'test-backup.zip');
  fs.writeFileSync(filePath, Buffer.from(buffer));
  console.log(`Saved backup to ${filePath} (${buffer.byteLength} bytes)`);
  
  console.log('Restoring backup...');
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/zip' });
  formData.append('file', blob, 'test-backup.zip');
  
  const restoreRes = await fetch('http://127.0.0.1:4000/api/settings/restore', {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  
  if (!restoreRes.ok) {
    console.error('Restore failed', await restoreRes.text());
    return;
  }
  
  console.log('Restore successful!', await restoreRes.json());
  
  // Clean up
  fs.unlinkSync(filePath);
}

testBackupRestore().catch(console.error);
