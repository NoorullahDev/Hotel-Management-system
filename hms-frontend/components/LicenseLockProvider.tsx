'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LicenseLockProvider({ children }: { children: React.ReactNode }) {
  const [isValidating, setIsValidating] = useState(true);
  const [hasLicense, setHasLicense] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // We don't want to lock or redirect if we are already on the activate page
    if (pathname === '/activate') {
      setIsValidating(false);
      setHasLicense(false);
      return;
    }

    let intervalId: NodeJS.Timeout;

    const checkLicense = async () => {
      try {
        const data = await api.get<any>('/api/license/status');
        if (data.status !== 'Active') {
          setHasLicense(false);
          setIsValidating(false);
        } else {
          setHasLicense(true);
          setIsValidating(false);
        }
      } catch (err) {
        setHasLicense(false);
        setIsValidating(false);
      }
    };

    const handleLicenseExpired = () => {
      setHasLicense(false);
      setIsValidating(false);
    };

    window.addEventListener('license-expired', handleLicenseExpired);
    checkLicense();
    
    // Periodically check license in background (every 5 mins)
    intervalId = setInterval(checkLicense, 5 * 60 * 1000);

    return () => {
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
    // Full screen loading state while checking license
    return (
      <div className="min-h-screen bg-theme-main flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-theme-muted font-medium">Validating license...</p>
      </div>
    );
  }

  if (!hasLicense && pathname !== '/activate') {
    return null; // Return empty while redirecting
  }

  return <>{children}</>;
}
