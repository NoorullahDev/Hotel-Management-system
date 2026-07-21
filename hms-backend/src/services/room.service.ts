import prisma from '../prisma';
import { emitToHotel } from '../socket';

export const updateRoomStatus = async (id: string, status: any) => {
  const updatedRoom = await prisma.room.update({
    where: { id },
    data: { status },
    include: { roomType: true }
  });

  // Emit real-time event
  emitToHotel('main', 'room:status_changed', {
    roomId: id,
    newStatus: updatedRoom.status
  });

  return updatedRoom;
};

export const logRoomMaintenance = async (id: string, description: string) => {
  const result = await prisma.$transaction([
    prisma.roomMaintenance.create({
      data: {
        roomId: id,
        description,
        status: 'PENDING'
      }
    }),
    prisma.room.update({
      where: { id },
      data: { status: 'MAINTENANCE' },
      include: { roomType: true }
    })
  ]);

  // Emit real-time event for room status change
  emitToHotel('main', 'room:status_changed', {
    roomId: id,
    newStatus: 'MAINTENANCE'
  });

  return result;
};
