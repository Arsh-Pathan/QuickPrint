'use client';
import { usePathname } from 'next/navigation';
import { AdminHeader } from './AdminHeader';
import { AuthGate } from './auth-gate';
import { useShopSocket } from '@/lib/socket';
import { Container } from './Container';

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
        <div className="flex flex-col min-h-screen">
          <AdminHeader />
          <main className="flex-1 py-8">
            <Container size="xl">
              {children}
            </Container>
          </main>
        </div>
      )}
    </AuthGate>
  );
}
