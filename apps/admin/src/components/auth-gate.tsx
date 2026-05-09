'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const PUBLIC_PATHS = new Set(['/login']);

/**
 * Client-side auth boundary. Redirects to /login if unauthenticated.
 * Renders nothing until zustand has rehydrated from localStorage so
 * we don't briefly bounce a logged-in user to /login on refresh.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, hydrated } = useAuth();

  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !isPublic) {
      router.replace('/login');
    } else if (token && isPublic) {
      router.replace('/');
    }
  }, [hydrated, token, isPublic, router]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center text-[13px] text-[#5f6368]">
        Loading…
      </div>
    );
  }
  if (!token && !isPublic) return null;
  if (token && isPublic) return null;
  return <>{children}</>;
}
