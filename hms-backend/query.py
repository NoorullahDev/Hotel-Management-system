import sqlite3
import json

conn = sqlite3.connect('dev.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT status, count(*) as count FROM Room GROUP BY status")
print("Room statuses:")
for row in cursor.fetchall():
    print(dict(row))

cursor.execute("SELECT roomId, status, checkIn, checkOut FROM Booking")
print("Bookings:")
for row in cursor.fetchall():
    print(dict(row))

conn.close()
