import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

export function getHWID(): string {
  let hwData = '';

  try {
    if (os.platform() === 'win32') {
      hwData = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8' });
    } else if (os.platform() === 'linux') {
      hwData = execSync('cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || true', { encoding: 'utf8' });
    } else if (os.platform() === 'darwin') {
      hwData = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', { encoding: 'utf8' });
    }
  } catch (e) {
    // Ignore errors and use fallback
  }

  // Fallback if OS-level ID fails
  if (!hwData || hwData.trim() === '') {
    const cpus = os.cpus();
    if (cpus && cpus.length > 0) {
      hwData += cpus[0].model;
    }
    hwData += os.hostname() + os.platform() + os.arch();
  }

  const hash = crypto.createHash('sha256').update(hwData).digest('hex').toUpperCase();
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}
