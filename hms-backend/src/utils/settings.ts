import prisma from '../prisma';

// ─── Tax Settings ────────────────────────────────────────────────────────────

export interface TaxSettings {
  enabled: boolean;
  rate: number;   // decimal e.g. 0.10 for 10%
  pct: number;    // percentage e.g. 10
  name: string;   // e.g. "GST"
}

interface TaxCache {
  value: TaxSettings;
  expiresAt: number;
}

let _taxCache: TaxCache | null = null;
const TAX_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Fetch and parse the tax settings from the Setting table.
 * Results are cached for 60 seconds to avoid repeat DB hits on every invoice/folio call.
 */
export async function getTaxSettings(): Promise<TaxSettings> {
  const now = Date.now();
  if (_taxCache && _taxCache.expiresAt > now) {
    return _taxCache.value;
  }

  const rows = await prisma.setting.findMany({ where: { category: 'tax' } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

  const enabled = map['enabled'] !== false;
  const rate = enabled ? parseFloat((map['rate'] as string) || '10') / 100 : 0;
  const name = (map['name'] as string) || 'Tax';

  const value: TaxSettings = { enabled, rate, pct: rate * 100, name };
  _taxCache = { value, expiresAt: now + TAX_CACHE_TTL_MS };
  return value;
}

/**
 * Invalidate the tax cache. Call this after any tax settings write
 * so the next request fetches fresh data from the DB.
 */
export function invalidateTaxCache(): void {
  _taxCache = null;
}

// ─── Public Settings ─────────────────────────────────────────────────────────

export interface PublicSettings {
  hotelName: string;
  hotelLogo: string | null;
  hotelBanner: string | null;
  loginHeadingMain: string;
  loginHeadingHighlight: string;
  loginSubheading: string;
  hotelAddress: string | null;
  contactNumber: string | null;
  email: string | null;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  currencySymbol: string;
  timeZone: string;
  taxRate: number;
  taxName: string;
  localIp?: string;
}

interface PublicSettingsCache {
  value: PublicSettings;
  expiresAt: number;
}

let _publicCache: PublicSettingsCache | null = null;
const PUBLIC_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Fetch all public-facing settings in a single DB query.
 * Falls back to HotelSettings (legacy model) for any missing keys.
 * Cached for 60 seconds to improve performance.
 */
export async function getPublicSettingsData(): Promise<PublicSettings> {
  const now = Date.now();
  if (_publicCache && _publicCache.expiresAt > now) {
    return _publicCache.value;
  }

  // Single query — the Setting table is tiny
  const [allSettings, legacySettings] = await Promise.all([
    prisma.setting.findMany(),
    prisma.hotelSettings.findFirst(),
  ]);

  const parseVal = (val: unknown): unknown => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  };

  // Build one flat map keyed by setting key
  const settingMap = Object.fromEntries(
    allSettings.map(s => [s.key, parseVal(s.value)])
  );

  const taxEnabled = settingMap['enabled'] !== false;
  const taxRate = taxEnabled
    ? parseFloat((settingMap['rate'] as string) || legacySettings?.taxRate?.toString() || '0')
    : 0;

  const value: PublicSettings = {
    hotelName:              (settingMap['hotelName'] as string)              || legacySettings?.name        || 'Your Hotel Name',
    hotelLogo:              (settingMap['hotelLogo'] as string)              || null,
    hotelBanner:            (settingMap['hotelBanner'] as string)            || null,
    loginHeadingMain:       (settingMap['loginHeadingMain'] as string)       || 'Smart Hotel Management',
    loginHeadingHighlight:  (settingMap['loginHeadingHighlight'] as string)  || 'Simplified.',
    loginSubheading:        (settingMap['loginSubheading'] as string)        || 'Manage bookings, guests, staff, and operations seamlessly with our all-in-one hotel management solution.',
    hotelAddress:           (settingMap['hotelAddress'] as string)           || null,
    contactNumber:          (settingMap['contactNumber'] as string)          || null,
    email:                  (settingMap['email'] as string)                  || null,
    checkInTime:            (settingMap['checkInTime'] as string)            || legacySettings?.defaultCheckIn  || '14:00',
    checkOutTime:           (settingMap['checkOutTime'] as string)           || legacySettings?.defaultCheckOut || '12:00',
    currency:               (settingMap['currency'] as string)               || legacySettings?.currency        || 'PKR',
    currencySymbol:         (settingMap['currencySymbol'] as string)         || 'Rs.',
    timeZone:               (settingMap['timeZone'] as string)               || 'Asia/Karachi',
    taxRate,
    taxName:                (settingMap['name'] as string)                   || 'GST',
    localIp:                getSmarterLocalIp(),
  };

  _publicCache = { value, expiresAt: now + PUBLIC_CACHE_TTL_MS };
  return value;
}

/**
 * Invalidate the public settings cache. Call this after settings are updated.
 */
export function invalidatePublicSettingsCache(): void {
  _publicCache = null;
}

function getSmarterLocalIp(): string {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  // Prefer Wi-Fi interface
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wlan')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
  }
  // Skip VirtualBox (192.168.56.x) addresses
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.56.')) continue;
        return iface.address;
      }
    }
  }
  // Fallback to anything
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}
