const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db');

// Ensure foreign keys are enabled so CASCADE works properly
db.pragma('foreign_keys = ON');

const usersToDelete = ['hkstaff', 'rectest'];

for (const username of usersToDelete) {
  const user = db.prepare('SELECT id FROM User WHERE username = ?').get(username);
  
  if (user) {
    console.log(`\nFound user: ${username} (ID: ${user.id})`);
    
    // Query related records count just to log them
    const staff = db.prepare('SELECT id FROM Staff WHERE userId = ?').get(user.id);
    console.log(`- Staff record: ${staff ? 'Yes' : 'No'}`);
    
    if (staff) {
        const hkTasksCount = db.prepare('SELECT COUNT(*) as count FROM HousekeepingTask WHERE staffId = ?').get(staff.id).count;
        console.log(`- Housekeeping Tasks: ${hkTasksCount}`);
    }
    
    const auditLogsCount = db.prepare('SELECT COUNT(*) as count FROM AuditLog WHERE userId = ?').get(user.id).count;
    console.log(`- Audit Logs: ${auditLogsCount}`);
    
    const notificationsCount = db.prepare('SELECT COUNT(*) as count FROM Notification WHERE userId = ?').get(user.id).count;
    console.log(`- Notifications: ${notificationsCount}`);
    
    const notificationPrefs = db.prepare('SELECT id FROM NotificationPreference WHERE userId = ?').get(user.id);
    console.log(`- Notification Preferences: ${notificationPrefs ? 'Yes' : 'No'}`);

    // Because of foreign key constraints with ON DELETE CASCADE in SQLite, deleting the user will automatically 
    // delete the staff, audit logs, notifications, preferences, and housekeeping tasks (via staff).
    db.prepare('DELETE FROM User WHERE id = ?').run(user.id);
    console.log(`=> Deleted user '${username}' and all associated cascaded records.`);
  } else {
    console.log(`\nUser '${username}' not found.`);
  }
}

console.log('\n--- Final Verification ---');
const remainingUsers = db.prepare('SELECT username FROM User').all();
console.log(`Total Users remaining in DB: ${remainingUsers.length}`);
remainingUsers.forEach(u => console.log(`- ${u.username}`));
