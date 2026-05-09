'use client';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { AuthGate } from './auth-gate';
import { useShopSocket } from '@/lib/socket';

const FULL_BLEED = new Set(['/login']);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = FULL_BLEED.has(pathname);
  // Hook always called; internal effect bails out if no token.
  useShopSocket();

  return (
    <AuthGate>
      {fullBleed ? (
        <main className="min-h-screen">{children}</main>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
        </div>
      )}
    </AuthGate>
  );
}
