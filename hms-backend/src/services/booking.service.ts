import prisma from '../prisma';
import { emitToHotel } from '../socket';
import { notifyRoles } from './notificationService';
import { getPublicSettingsData } from '../utils/settings';

export const createBookingService = async (bookingData: any) => {
  const [newBooking] = await prisma.$transaction([
    prisma.booking.create({
      data: bookingData,
      include: {
        guest: true,
        room: { include: { roomType: true } }
      }
    }),
    prisma.room.update({
      where: { id: bookingData.roomId },
      data: { status: 'RESERVED' }
    })
  ]);

  emitToHotel('main', 'room:status_changed', { roomId: bookingData.roomId, newStatus: 'RESERVED' });

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

export const checkOutBookingService = async (bookingId: string, roomId: string) => {
  const [updatedBooking] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CHECKED_OUT' },
      include: { guest: true, room: true }
    }),
    prisma.room.update({
      where: { id: roomId },
      data: { status: 'CLEANING' }
    }),
    prisma.housekeepingTask.create({
      data: {
        roomId: roomId,
        status: 'PENDING'
      }
    })
  ]);

  emitToHotel('main', 'booking:checked_out', { bookingId });
  emitToHotel('main', 'room:status_changed', { roomId, newStatus: 'CLEANING' });

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
