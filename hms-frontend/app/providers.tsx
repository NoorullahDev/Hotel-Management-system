'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 30 seconds — no refetch on page switch
        staleTime: 30_000,
        // Keep cached data in memory for 5 minutes — shows instantly on re-visit
        gcTime: 5 * 60_000,
        // Don't show loading if we already have cached data
        refetchOnWindowFocus: false,
        // Retry once on failure
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
