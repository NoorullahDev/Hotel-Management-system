import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Generates a stable Hardware ID using only network-independent identifiers.
 *
 * Identifiers used:
 *   - CPU model string  (never changes with network state)
 *   - Machine hostname  (stable, set by OS)
 *   - OS platform + architecture (stable)
 *
 * Previously this function used the MAC address of the first external network
 * adapter.  That caused the HWID to change whenever the Wi-Fi / Ethernet
 * adapter was disconnected (offline mode), making the stored license appear
 * "Invalid" even though no external server was involved.
 */
export function getHWID(): string {
  const cpus = os.cpus();

  let hwData = '';

  // CPU model — stable, physical, never changes with network state
  if (cpus && cpus.length > 0) {
    hwData += cpus[0].model;
  }

  // Machine hostname — set by the OS, stable across reboots
  hwData += os.hostname();

  // OS platform and architecture — constant for a given installation
  hwData += os.platform() + os.arch();

  // Safety net: should never be empty, but guard anyway
  if (!hwData) {
    hwData = 'FALLBACK-HMS-MACHINE';
  }

  const hash = crypto.createHash('sha256').update(hwData).digest('hex').toUpperCase();
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}

/**
 * Legacy HWID computation — preserved ONLY for one-time transparent migration.
 *
 * This was the original algorithm that relied on the MAC address of the first
 * active external network adapter, which changed when going offline.
 *
 * Used exclusively inside licenseController to detect licenses that were
 * activated under the old algorithm and silently migrate them to the new
 * stable HWID, so existing customers do not need to re-activate.
 *
 * DO NOT use this function for any new logic.
 */
export function getLegacyHWID(): string {
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  let hwData = '';

  if (cpus && cpus.length > 0) {
    hwData += cpus[0].model;
  }

  for (const key in networkInterfaces) {
    const iface = networkInterfaces[key];
    if (iface) {
      for (const alias of iface) {
        if (!alias.internal && alias.mac !== '00:00:00:00:00:00') {
          hwData += alias.mac;
          break;
        }
      }
    }
  }

  if (!hwData) {
    hwData = os.hostname() + os.platform() + os.arch();
  }

  const hash = crypto.createHash('sha256').update(hwData).digest('hex').toUpperCase();
  return `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}
