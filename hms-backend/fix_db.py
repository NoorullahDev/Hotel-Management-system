import sqlite3

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Set rooms with CONFIRMED bookings to RESERVED
cursor.execute('''
    UPDATE Room
    SET status = 'RESERVED'
    WHERE id IN (
        SELECT roomId FROM Booking WHERE status = 'CONFIRMED'
    ) AND status = 'AVAILABLE'
''')

# Set rooms with CHECKED_IN bookings to OCCUPIED
cursor.execute('''
    UPDATE Room
    SET status = 'OCCUPIED'
    WHERE id IN (
        SELECT roomId FROM Booking WHERE status = 'CHECKED_IN'
    ) AND status = 'AVAILABLE'
''')

conn.commit()
conn.close()
