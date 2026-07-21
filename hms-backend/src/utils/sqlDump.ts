export function generateSqlDump(data: any): string {
  let sql = `-- Backup Generated on ${new Date().toISOString()}\n\n`;

  // Delete all tables in reverse dependency order
  sql += `-- DELETE ALL ROWS\n`;
  const tablesToDelete = [
    'AuditLog', 'NotificationPreference', 'Notification', 'Feedback',
    'OrderItem', 'FoodOrder', 'InvoiceItem', 'Invoice', 'Payment',
    'HousekeepingTask', 'RoomMaintenance', 'Booking', 'Room', 'Staff',
    'User', 'Guest', 'RoomType', 'MenuCategory', 'MenuItem',
    'HotelSettings', 'Setting', 'Role'
  ];

  for (const table of tablesToDelete) {
    sql += `DELETE FROM "${table}";\n`;
  }
  sql += '\n';

  // Format a plain SQL value
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'number') return String(val);
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') {
      // Handle Prisma Decimal type
      if (typeof val.toNumber === 'function' || ('d' in val && 'e' in val && 's' in val)) {
        return val.toString();
      }
      return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    }
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // jsonbCols: columns that are Json in the schema
  const generateInserts = (
    tableName: string,
    rows: any[],
    jsonbCols: string[] = []
  ) => {
    if (!rows || rows.length === 0) return '';
    let tableSql = `-- Table: ${tableName}\n`;

    const columns = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const columnsString = columns.map(c => `"${c}"`).join(', ');

    for (const row of rows) {
      const values = columns.map(c => {
        if (jsonbCols.includes(c)) {
          // JSON columns must be rigorously stringified to survive SQLite raw queries
          return `'${JSON.stringify(row[c]).replace(/'/g, "''")}'`;
        }
        return formatValue(row[c]);
      });
      tableSql += `INSERT INTO "${tableName}" (${columnsString}) VALUES (${values.join(', ')});\n`;
    }
    return tableSql + '\n';
  };

  // Insert in dependency order.
  sql += generateInserts('Role', data.roles);
  sql += generateInserts('Setting', data.settings, ['value']);
  sql += generateInserts('HotelSettings', data.hotelSettings);

  sql += generateInserts('MenuCategory', data.menuCategories);
  sql += generateInserts('MenuItem', data.menuItems);
  sql += generateInserts('RoomType', data.roomTypes);
  sql += generateInserts('Guest', data.guests);

  sql += generateInserts('User', data.users);
  sql += generateInserts('Staff', data.staff);
  sql += generateInserts('Room', data.rooms);

  sql += generateInserts('Booking', data.bookings);

  sql += generateInserts('RoomMaintenance', data.roomMaintenances);
  sql += generateInserts('HousekeepingTask', data.housekeepingTasks);

  sql += generateInserts('Payment', data.payments);
  sql += generateInserts('Invoice', data.invoices || data.invoice);
  sql += generateInserts('InvoiceItem', data.invoiceItems);

  sql += generateInserts('FoodOrder', data.foodOrders);
  sql += generateInserts('OrderItem', data.orderItems);

  sql += generateInserts('Feedback', data.feedbacks);
  sql += generateInserts('Notification', data.notifications, ['metadata']);
  sql += generateInserts('NotificationPreference', data.notificationPreferences);
  sql += generateInserts('AuditLog', data.auditLogs);

  return sql;
}
