import Link from "next/link";
import { api } from '@/lib/api';

export default async function Home() {
  let healthStatus = "Loading...";
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api.get<any>('/api/health', { cache: 'no-store' } as any);
    healthStatus = JSON.stringify(data, null, 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    healthStatus = `Error: ${error.message}`;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Hotel Management System</h1>
        
        <div className="bg-card text-card-foreground border rounded-lg p-6 w-full max-w-md shadow-lg">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Backend Connection Status</h2>
          <pre className="bg-background p-4 rounded-md overflow-x-auto text-sm">
            {healthStatus}
          </pre>
        </div>
        
        <Link 
          href="/rooms" 
          className="mt-8 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow transition-colors active:scale-95 shadow-md"
        >
          Go to Room Management
        </Link>
      </div>
    </main>
  );
}
