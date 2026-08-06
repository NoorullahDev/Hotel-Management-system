import prisma from '../prisma';
import { emitToHotel } from '../socket';
import { notifyRoles } from './notificationService';
import { getPublicSettingsData } from '../utils/settings';

export const createBookingService = async (bookingData: any) => {
  const newBooking = await prisma.$transaction(async (tx) => {
    // 1. Fetch room to check MAINTENANCE
    const roomInfo = await tx.room.findUnique({
      where: { id: bookingData.roomId }
    });

    if (roomInfo?.status === 'MAINTENANCE') {
      throw new Error(`Room ${bookingData.roomId} is currently in maintenance and cannot be booked.`);
    }

    // 2. Write to room early to acquire write lock, preventing concurrent overlap race conditions
    await tx.room.update({
      where: { id: bookingData.roomId },
      data: { status: 'OCCUPIED' }
    });

    // 3. Check for overlapping bookings
    const overlap = await tx.booking.findFirst({
      where: {
        roomId: bookingData.roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: bookingData.checkOut },
        checkOut: { gt: bookingData.checkIn },
      },
      select: { id: true },
    });

    if (overlap) {
      throw new Error(`Room ${bookingData.roomId} is already booked for an overlapping date range.`);
    }

    const booking = await tx.booking.create({
      data: bookingData,
      include: {
        guest: true,
        room: { include: { roomType: true } }
      }
    });

    return booking;
  }, { isolationLevel: 'Serializable' });

  emitToHotel('main', 'room:status_changed', { roomId: bookingData.roomId, newStatus: 'OCCUPIED' });

  // Emit real-time event
  const checkInStr = newBooking.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const checkOutStr = newBooking.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  // Fetch currency symbol
  const settings = await getPublicSettingsData();
  const currencySymbol = settings.currencySymbol;

  const bookingSummary = {
    id: newBooking.id.substring(0, 13).toUpperCase(),
    rawId: newBooking.id,
    room: newBooking.room.number,
    roomType: newBooking.room.roomType.name,
    guest: newBooking.guest.name,
    dates: `${checkInStr} - ${checkOutStr}`,
    checkIn: newBooking.checkIn,
    checkOut: newBooking.checkOut,
    status: newBooking.status,
    amount: `${currencySymbol} ${newBooking.total.toNumber().toLocaleString()}`,
  };

  emitToHotel('main', 'booking:created', bookingSummary);

  await notifyRoles(
    ['Admin', 'Manager', 'Receptionist'],
    'Booking',
    'New booking created',
    `A new booking has been created by ${newBooking.guest.name} for Room ${newBooking.room.number}.`,
    newBooking.id,
    {
      "Booking ID": newBooking.id.substring(0, 13).toUpperCase(),
      "Guest Name": newBooking.guest.name,
      "Room Number": newBooking.room.number,
      "Check-in Date": newBooking.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      "Check-out Date": newBooking.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      "Total Amount": `${currencySymbol} ${newBooking.total.toNumber().toLocaleString()}`,
      "Created At": new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    }
  );

  return newBooking;
};

export const checkInBookingService = async (bookingId: string, roomId: string) => {
  const [updatedBooking] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CHECKED_IN' },
      include: { guest: true, room: true }
    }),
    prisma.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED' }
    })
  ]);

  emitToHotel('main', 'booking:checked_in', { bookingId });
  emitToHotel('main', 'room:status_changed', { roomId, newStatus: 'OCCUPIED' });

  const settings = await getPublicSettingsData();
  const currencySymbol = settings.currencySymbol;

  if (updatedBooking) {
    await notifyRoles(
      ['Admin', 'Manager', 'Receptionist'],
      'Check-in',
      'Guest checked in',
      `${updatedBooking.guest.name} has checked in to Room ${updatedBooking.room.number}.`,
      updatedBooking.id,
      {
        "Booking ID": updatedBooking.id.substring(0, 13).toUpperCase(),
        "Guest Name": updatedBooking.guest.name,
        "Room Number": updatedBooking.room.number,
        "Check-in Date": updatedBooking.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        "Check-out Date": updatedBooking.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        "Total Amount": `${currencySymbol} ${updatedBooking.total.toNumber().toLocaleString()}`,
        "Created At": new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      }
    );
  }

  return [updatedBooking, null]; // returning array to match original return shape for any potential consumers expecting array result
};

export const checkOutBookingServiceTx = async (tx: any, bookingId: string, roomId: string, finalTotal?: any) => {
  const data: any = { 
    status: 'CHECKED_OUT',
    checkOut: new Date()
  };
  if (finalTotal !== undefined) {
    data.total = finalTotal;
  }
  const updatedBooking = await tx.booking.update({
    where: { id: bookingId },
    data,
    include: { guest: true, room: true }
  });
  await tx.room.update({
    where: { id: roomId },
    data: { status: 'AVAILABLE' }
  });
  await tx.housekeepingTask.create({
    data: {
      roomId: roomId,
      status: 'PENDING'
    }
  });
  return updatedBooking;
};

export const checkOutBookingService = async (bookingId: string, roomId: string) => {
  const updatedBooking = await prisma.$transaction(async (tx) => {
    return checkOutBookingServiceTx(tx, bookingId, roomId);
  });

  emitToHotel('main', 'booking:checked_out', { bookingId });
  emitToHotel('main', 'room:status_changed', { roomId, newStatus: 'AVAILABLE' });

  const settings = await getPublicSettingsData();
  const currencySymbol = settings.currencySymbol;

  if (updatedBooking) {
    await notifyRoles(
      ['Admin', 'Manager', 'Receptionist'],
      'Check-out',
      'Guest checked out',
      `${updatedBooking.guest.name} has checked out of Room ${updatedBooking.room.number}.`,
      updatedBooking.id,
      {
        "Booking ID": updatedBooking.id.substring(0, 13).toUpperCase(),
        "Guest Name": updatedBooking.guest.name,
        "Room Number": updatedBooking.room.number,
        "Check-in Date": updatedBooking.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        "Check-out Date": updatedBooking.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        "Total Amount": `${currencySymbol} ${updatedBooking.total.toNumber().toLocaleString()}`,
        "Created At": new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      }
    );
  }

  return [updatedBooking, null, null];
};
