import * as os from 'os';
import * as crypto from 'crypto';

export function getHWID(): string {
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
          break; // Use the first external MAC address
        }
      }
    }
  }

  // Fallback if no network or cpu info
  if (!hwData) {
    hwData = os.hostname() + os.platform() + os.arch();
  }

  const hash = crypto.createHash('sha256').update(hwData).digest('hex').toUpperCase();
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}
