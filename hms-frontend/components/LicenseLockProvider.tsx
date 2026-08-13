'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LicenseLockProvider({ children }: { children: React.ReactNode }) {
  const [isValidating, setIsValidating] = useState(true);
  const [hasLicense, setHasLicense] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Track consecutive background-check failures.
  // Transient network errors / DB slowness must NOT kick the user out.
  // We only lock the app after 3 consecutive failures (≥ 15 min of total outage).
  const failureCount = useRef(0);

  useEffect(() => {
    if (pathname === '/activate') {
      setIsValidating(false);
      setHasLicense(false);
      return;
    }

    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const checkLicense = async (isInitial = false) => {
      try {
        const data = await api.get<any>('/api/license/status');
        if (!isMounted) return;

        // Reset failure counter on every successful response
        failureCount.current = 0;

        const active = data.status === 'Active';
        setHasLicense(active);
        if (isInitial) setIsValidating(false);

      } catch (err) {
        if (!isMounted) return;

        // Network error / timeout:
        // - On the INITIAL check: set validating=false so the spinner clears.
        //   hasLicense stays false → redirect to /activate (correct for first boot).
        // - On BACKGROUND checks: keep existing hasLicense state intact.
        //   Only lock after 3 consecutive background failures.
        if (isInitial) {
          setHasLicense(false);
          setIsValidating(false);
        } else {
          failureCount.current += 1;
          if (failureCount.current >= 3) {
            // 3 consecutive 5-min failures = 15+ min of license server unreachable
            setHasLicense(false);
          }
          // Otherwise: leave hasLicense unchanged — app stays fully usable
        }
      }
    };

    const handleLicenseExpired = () => {
      if (!isMounted) return;
      setHasLicense(false);
      setIsValidating(false);
    };

    window.addEventListener('license-expired', handleLicenseExpired);
    checkLicense(true);

    // Periodically check license in background (every 5 mins)
    intervalId = setInterval(() => checkLicense(false), 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('license-expired', handleLicenseExpired);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!isValidating && !hasLicense && pathname !== '/activate') {
      router.replace('/activate');
    }
  }, [isValidating, hasLicense, pathname, router]);

  if (isValidating && pathname !== '/activate') {
    return (
      <div className="min-h-screen bg-theme-main flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-theme-muted font-medium">Validating license...</p>
      </div>
    );
  }

  if (!hasLicense && pathname !== '/activate') {
    return null;
  }

  return <>{children}</>;
}
