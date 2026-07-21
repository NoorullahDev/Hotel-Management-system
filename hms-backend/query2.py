import sqlite3

conn = sqlite3.connect('dev.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT roomId, status, bookingType, checkIn, checkOut FROM Booking")
print("Bookings:")
for row in cursor.fetchall():
    print(dict(row))

conn.close()
