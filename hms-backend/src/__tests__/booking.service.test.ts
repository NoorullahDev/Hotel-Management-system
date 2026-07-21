import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for booking.service.ts
 *
 * The booking service delegates overlap detection to a PostgreSQL exclusion
 * constraint. These tests verify the service layer properly:
 *   - Passes data to Prisma and returns the result
 *   - Handles overlap errors (P2004 / 'overlapping_bookings')
 *   - Runs check-in as a transaction (booking + room update)
 *   - Runs check-out as a transaction (booking + room + housekeeping)
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock Prisma client
const mockPrismaBookingCreate = vi.fn();
const mockPrismaBookingFindUnique = vi.fn();
const mockPrismaBookingFindFirst = vi.fn().mockResolvedValue(null);
const mockPrismaBookingUpdate = vi.fn();
const mockPrismaRoomUpdate = vi.fn();
const mockPrismaHousekeepingCreate = vi.fn();
const mockPrismaTransaction = vi.fn();

vi.mock('../prisma', () => ({
  default: {
    booking: {
      create: (...args: any[]) => mockPrismaBookingCreate(...args),
      findUnique: (...args: any[]) => mockPrismaBookingFindUnique(...args),
      update: (...args: any[]) => mockPrismaBookingUpdate(...args),
    },
    room: {
      update: (...args: any[]) => mockPrismaRoomUpdate(...args),
    },
    housekeepingTask: {
      create: (...args: any[]) => mockPrismaHousekeepingCreate(...args),
    },
    setting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    hotelSettings: {
      findFirst: vi.fn().mockResolvedValue({ currency: 'USD' }),
    },
    $transaction: async (arg: any, options: any) => {
      if (typeof arg === 'function') {
        return arg({
          booking: {
            create: mockPrismaBookingCreate,
            findUnique: mockPrismaBookingFindUnique,
            update: mockPrismaBookingUpdate,
            findFirst: mockPrismaBookingFindFirst,
          },
          room: {
            update: mockPrismaRoomUpdate,
          },
          housekeepingTask: {
            create: mockPrismaHousekeepingCreate,
          },
          invoice: {
            findUnique: vi.fn(),
            create: vi.fn(),
          },
          payment: {
            create: vi.fn(),
          }
        });
      }
      return mockPrismaTransaction(arg);
    },
  },
}));

// Mock socket
vi.mock('../socket', () => ({
  emitToHotel: vi.fn(),
}));

// Mock notification service
vi.mock('../services/notificationService', () => ({
  notifyRoles: vi.fn().mockResolvedValue(undefined),
}));

import {
  createBookingService,
  checkInBookingService,
  checkOutBookingService,
} from '../services/booking.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBookingResult(overrides: Partial<any> = {}) {
  return {
    id: 'booking-uuid-1234567890abc',
    checkIn: new Date('2026-08-01'),
    checkOut: new Date('2026-08-05'),
    status: 'CONFIRMED',
    total: { toNumber: () => 50000 },
    guest: { name: 'John Doe' },
    room: { number: '101', roomType: { name: 'Deluxe' } },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('booking.service — createBookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a booking and return the result', async () => {
    const bookingData = {
      guestId: 'guest-1',
      roomId: 'room-1',
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-05'),
      guestCount: 2,
      subtotal: 40000,
      tax: 4000,
      total: 44000,
      status: 'CONFIRMED',
    };

    const expectedResult = makeBookingResult();
    const roomResult = { id: 'room-1', status: 'RESERVED' };

    // The service calls prisma.$transaction(async (tx) => ...)
    // Our mock will execute the callback, calling mockPrismaBookingCreate and mockPrismaRoomUpdate
    mockPrismaBookingCreate.mockResolvedValue(expectedResult);
    mockPrismaRoomUpdate.mockResolvedValue(roomResult);

    const result = await createBookingService(bookingData);

    expect(mockPrismaBookingCreate).toHaveBeenCalledOnce();
    expect(mockPrismaRoomUpdate).toHaveBeenCalledOnce();
    expect(result).toBe(expectedResult);
  });

  it('should propagate overlap errors from the exclusion constraint', async () => {
    const bookingData = {
      guestId: 'guest-1',
      roomId: 'room-1',
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-05'),
    };

    mockPrismaBookingFindFirst.mockResolvedValue({ id: 'overlap-booking' });

    await expect(createBookingService(bookingData)).rejects.toThrow(
      'Room room-1 is already booked for an overlapping date range.'
    );
  });

  it('should propagate generic database errors', async () => {
    mockPrismaBookingFindFirst.mockResolvedValue(null);
    mockPrismaBookingCreate.mockRejectedValue(new Error('Connection refused'));

    await expect(
      createBookingService({ guestId: 'g', roomId: 'r' })
    ).rejects.toThrow('Connection refused');
  });
});

describe('booking.service — checkInBookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update booking to CHECKED_IN and room to OCCUPIED in a transaction', async () => {
    const txResult = [
      { id: 'booking-1', status: 'CHECKED_IN', guest: { name: 'John Doe' }, room: { number: '101' }, checkIn: new Date(), checkOut: new Date(), total: { toNumber: () => 100 } },
      { id: 'room-1', status: 'OCCUPIED' },
    ];
    mockPrismaTransaction.mockResolvedValue(txResult);
    mockPrismaBookingFindUnique.mockResolvedValue(
      makeBookingResult({ status: 'CHECKED_IN' })
    );

    const result = await checkInBookingService('booking-1', 'room-1');

    expect(mockPrismaTransaction).toHaveBeenCalledOnce();
    // Verify transaction was called with an array of two prisma calls
    const txArg = mockPrismaTransaction.mock.calls[0][0];
    expect(txArg).toHaveLength(2);
    expect(result).toEqual([txResult[0], null]);
  });
});

describe('booking.service — checkOutBookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update booking to CHECKED_OUT, room to CLEANING, and create a housekeeping task', async () => {
    const updatedBooking = { id: 'booking-1', status: 'CHECKED_OUT', guest: { name: 'John Doe' }, room: { number: '101' }, checkIn: new Date(), checkOut: new Date(), total: { toNumber: () => 100 } };
    mockPrismaBookingUpdate.mockResolvedValue(updatedBooking);

    const result = await checkOutBookingService('booking-1', 'room-1');

    expect(mockPrismaBookingUpdate).toHaveBeenCalledOnce();
    expect(mockPrismaRoomUpdate).toHaveBeenCalledOnce();
    expect(mockPrismaHousekeepingCreate).toHaveBeenCalledOnce();
    expect(result).toEqual([updatedBooking, null, null]);
  });
});
