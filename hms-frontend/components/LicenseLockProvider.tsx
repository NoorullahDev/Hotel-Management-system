'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LicenseLockProvider({ children }: { children: React.ReactNode }) {
  const [isValidating, setIsValidating] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // We don't want to lock or redirect if we are already on the activate page
    if (pathname === '/activate') {
      setIsValidating(false);
      return;
    }

    let intervalId: NodeJS.Timeout;

    const checkLicense = async () => {
      try {
        const data = await api.get<any>('/api/license/status');
        if (data.status !== 'Active') {
          window.location.href = '/activate';
        } else {
          setIsValidating(false);
        }
      } catch (err) {
        // If API fails (e.g. 402), the api.ts interceptor will handle it, but we can also fallback here
        window.location.href = '/activate';
      }
    };

    checkLicense();
    
    // Periodically check license in background (every 5 mins)
    intervalId = setInterval(checkLicense, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [pathname, router]);

  if (isValidating && pathname !== '/activate') {
    // Full screen loading state while checking license
    return (
      <div className="min-h-screen bg-theme-main flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-theme-muted font-medium">Validating license...</p>
      </div>
    );
  }

  return <>{children}</>;
}
