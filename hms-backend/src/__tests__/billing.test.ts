import { describe, it, expect } from 'vitest';

/**
 * Unit tests for billing / folio calculation logic.
 *
 * The billing logic lives in bookingController.ts (getFolio, checkoutBooking).
 * We extract and test the pure calculation functions here without needing
 * Prisma or HTTP mocking.
 *
 * Formulas:
 *   nights        = max(1, ceil((checkOut - checkIn) / msPerDay))
 *   roomCharges   = nights × roomRate
 *   foodCharges   = Σ(item.qty × item.price)
 *   subTotal      = roomCharges + foodCharges
 *   taxAmount     = subTotal × taxRate          (default 10%)
 *   totalAmount   = subTotal + taxAmount - discount
 *   balanceDue    = totalAmount - paidAmount
 */

// ── Pure billing helpers (extracted from controller logic) ────────────────────

function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay));
}

interface FoodItem {
  qty: number;
  price: number;
}

interface BillingInput {
  checkIn: Date;
  checkOut: Date;
  roomRate: number;
  foodItems: FoodItem[];
  taxRate: number;
  discount: number;
  paidAmount: number;
}

interface BillingResult {
  nights: number;
  roomCharges: number;
  foodCharges: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceDue: number;
}

function calculateBilling(input: BillingInput): BillingResult {
  const nights = calculateNights(input.checkIn, input.checkOut);
  const roomCharges = nights * input.roomRate;

  let foodCharges = 0;
  for (const item of input.foodItems) {
    foodCharges += item.qty * item.price;
  }

  const subTotal = roomCharges + foodCharges;
  const taxAmount = subTotal * input.taxRate;
  const totalAmount = subTotal + taxAmount - input.discount;
  const balanceDue = totalAmount - input.paidAmount;

  return { nights, roomCharges, foodCharges, subTotal, taxAmount, totalAmount, balanceDue };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('calculateNights', () => {
  it('should return correct nights for a multi-day stay', () => {
    const checkIn = new Date('2026-08-01');
    const checkOut = new Date('2026-08-05');
    expect(calculateNights(checkIn, checkOut)).toBe(4);
  });

  it('should return 1 night for same-day check-in and check-out', () => {
    const checkIn = new Date('2026-08-01');
    const checkOut = new Date('2026-08-01');
    expect(calculateNights(checkIn, checkOut)).toBe(1);
  });

  it('should return 1 night for a 1-day stay', () => {
    const checkIn = new Date('2026-08-01');
    const checkOut = new Date('2026-08-02');
    expect(calculateNights(checkIn, checkOut)).toBe(1);
  });

  it('should return 1 for negative date difference (clamp)', () => {
    const checkIn = new Date('2026-08-05');
    const checkOut = new Date('2026-08-01');
    expect(calculateNights(checkIn, checkOut)).toBe(1);
  });

  it('should handle a 30-day stay', () => {
    const checkIn = new Date('2026-08-01');
    const checkOut = new Date('2026-08-31');
    expect(calculateNights(checkIn, checkOut)).toBe(30);
  });
});

describe('calculateBilling — room charges only', () => {
  it('should calculate room charges correctly', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-04'), // 3 nights
      roomRate: 5000,
      foodItems: [],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 0,
    });

    expect(result.nights).toBe(3);
    expect(result.roomCharges).toBe(15000);
    expect(result.foodCharges).toBe(0);
    expect(result.subTotal).toBe(15000);
    expect(result.taxAmount).toBe(1500);
    expect(result.totalAmount).toBe(16500);
    expect(result.balanceDue).toBe(16500);
  });
});

describe('calculateBilling — room + food charges', () => {
  it('should sum food items correctly', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-03'), // 2 nights
      roomRate: 8000,
      foodItems: [
        { qty: 2, price: 500 },  // 1000
        { qty: 1, price: 1200 }, // 1200
        { qty: 3, price: 300 },  //  900
      ],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 0,
    });

    expect(result.nights).toBe(2);
    expect(result.roomCharges).toBe(16000);
    expect(result.foodCharges).toBe(3100);
    expect(result.subTotal).toBe(19100);
    expect(result.taxAmount).toBeCloseTo(1910, 2);
    expect(result.totalAmount).toBeCloseTo(21010, 2);
  });
});

describe('calculateBilling — tax calculation', () => {
  it('should apply 10% tax on subtotal', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'), // 1 night
      roomRate: 10000,
      foodItems: [],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 0,
    });

    expect(result.subTotal).toBe(10000);
    expect(result.taxAmount).toBe(1000);
    expect(result.totalAmount).toBe(11000);
  });

  it('should handle a different tax rate (15%)', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'),
      roomRate: 10000,
      foodItems: [],
      taxRate: 0.15,
      discount: 0,
      paidAmount: 0,
    });

    expect(result.taxAmount).toBe(1500);
    expect(result.totalAmount).toBe(11500);
  });

  it('should handle 0% tax rate', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'),
      roomRate: 10000,
      foodItems: [],
      taxRate: 0,
      discount: 0,
      paidAmount: 0,
    });

    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(10000);
  });
});

describe('calculateBilling — discount', () => {
  it('should subtract discount from the total', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-03'), // 2 nights
      roomRate: 5000,
      foodItems: [],
      taxRate: 0.10,
      discount: 2000,
      paidAmount: 0,
    });

    // subTotal = 10000, tax = 1000, total = 11000 - 2000 = 9000
    expect(result.subTotal).toBe(10000);
    expect(result.taxAmount).toBe(1000);
    expect(result.totalAmount).toBe(9000);
  });

  it('should handle zero discount', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'),
      roomRate: 5000,
      foodItems: [],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 0,
    });

    expect(result.totalAmount).toBe(5500);
  });

  it('should allow discount to exceed subtotal+tax (resulting in negative balance)', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'),
      roomRate: 1000,
      foodItems: [],
      taxRate: 0.10,
      discount: 5000,
      paidAmount: 0,
    });

    // subTotal=1000, tax=100, total=1100-5000=-3900
    expect(result.totalAmount).toBe(-3900);
  });
});

describe('calculateBilling — balance due', () => {
  it('should compute balance due as total minus paid amount', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-04'), // 3 nights
      roomRate: 5000,
      foodItems: [{ qty: 1, price: 500 }],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 10000,
    });

    // room=15000, food=500, sub=15500, tax=1550, total=17050
    // balance = 17050 - 10000 = 7050
    expect(result.totalAmount).toBeCloseTo(17050, 2);
    expect(result.balanceDue).toBeCloseTo(7050, 2);
  });

  it('should show zero balance when fully paid', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'),
      roomRate: 10000,
      foodItems: [],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 11000,
    });

    expect(result.balanceDue).toBe(0);
  });

  it('should show negative balance when overpaid', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-02'),
      roomRate: 10000,
      foodItems: [],
      taxRate: 0.10,
      discount: 0,
      paidAmount: 15000,
    });

    // total = 11000, balance = 11000 - 15000 = -4000
    expect(result.balanceDue).toBe(-4000);
  });
});

describe('calculateBilling — full scenario', () => {
  it('should calculate a complete billing with room, food, tax, discount, and partial payment', () => {
    const result = calculateBilling({
      checkIn: new Date('2026-08-01'),
      checkOut: new Date('2026-08-06'), // 5 nights
      roomRate: 8000,
      foodItems: [
        { qty: 2, price: 750 },   // 1500
        { qty: 1, price: 2000 },  // 2000
        { qty: 4, price: 250 },   // 1000
      ],
      taxRate: 0.10,
      discount: 3000,
      paidAmount: 40000,
    });

    // room = 5 × 8000 = 40000
    // food = 1500 + 2000 + 1000 = 4500
    // sub = 44500
    // tax = 4450
    // total = 44500 + 4450 - 3000 = 45950
    // balance = 45950 - 40000 = 5950
    expect(result.nights).toBe(5);
    expect(result.roomCharges).toBe(40000);
    expect(result.foodCharges).toBe(4500);
    expect(result.subTotal).toBe(44500);
    expect(result.taxAmount).toBeCloseTo(4450, 2);
    expect(result.totalAmount).toBeCloseTo(45950, 2);
    expect(result.balanceDue).toBeCloseTo(5950, 2);
  });
});
