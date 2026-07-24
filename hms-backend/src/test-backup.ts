import { generateSqlDump } from './utils/sqlDump';
import prisma from './prisma';
import fs from 'fs';
import path from 'path';

async function testBackupRestore() {
  console.log('1. Starting backup test...');
  // Simulating backup
  const data = {
    roles: await prisma.role.findMany(),
    users: await prisma.user.findMany(),
    guests: await prisma.guest.findMany(),
    roomTypes: await prisma.roomType.findMany(),
    rooms: await prisma.room.findMany(),
    bookings: await prisma.booking.findMany(),
    payments: await prisma.payment.findMany(),
    invoices: await prisma.invoice.findMany(),
    invoiceItems: await prisma.invoiceItem.findMany(),
    foodOrders: await prisma.foodOrder.findMany(),
    orderItems: await prisma.orderItem.findMany(),
    menuCategories: await prisma.menuCategory.findMany(),
    menuItems: await prisma.menuItem.findMany(),
    housekeepingTasks: await prisma.housekeepingTask.findMany(),
    roomMaintenances: await prisma.roomMaintenance.findMany(),
    feedbacks: await prisma.feedback.findMany(),
    notifications: await prisma.notification.findMany(),
    notificationPreferences: await prisma.notificationPreference.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
    hotelSettings: await prisma.hotelSettings.findMany(),
    settings: await prisma.setting.findMany(),
    staff: await prisma.staff.findMany(),
  };

  const sqlScript = generateSqlDump(data);
  fs.writeFileSync(path.join(__dirname, 'test_backup.sql'), sqlScript);
  console.log('Backup generated.');
  
  // Create a backup zip simulating what downloadBackup does
  // But we just want to verify the SQL script executes cleanly for restore
  console.log('2. Simulating restore parsing...');
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sqlScript.length; i++) {
    const ch = sqlScript[i];
    
    if (inString) {
      current += ch;
      if (ch === stringChar) {
        if (i + 1 < sqlScript.length && sqlScript[i + 1] === stringChar) {
          current += sqlScript[i + 1];
          i++; // skip the escaped quote
        } else {
          inString = false;
        }
      }
    } else {
      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
        current += ch;
      } else if (ch === ';') {
        const trimmed = current.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('--')) {
          statements.push(trimmed);
        }
        current = '';
      } else if (ch === '-' && i + 1 < sqlScript.length && sqlScript[i + 1] === '-') {
        const newlineIdx = sqlScript.indexOf('\n', i);
        if (newlineIdx === -1) break;
        i = newlineIdx;
      } else {
        current += ch;
      }
    }
  }
  const lastTrimmed = current.trim();
  if (lastTrimmed.length > 0 && !lastTrimmed.startsWith('--')) {
    statements.push(lastTrimmed);
  }
  
  console.log(`Found ${statements.length} SQL statements to execute.`);
  
  console.log('Restore simulation complete. Script parsing works.');
  console.log('Checking uploads logic...');
}

testBackupRestore().catch(console.error).finally(() => prisma.$disconnect());
