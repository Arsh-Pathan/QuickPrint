'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/store';
import { Logo } from './Logo';
import { Container } from './Container';
import { useState, useEffect } from 'react';

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Upload', href: '/upload' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled 
          ? 'bg-m3-surface/80 backdrop-blur-md shadow-[--elev-1] py-2' 
          : 'bg-transparent py-4'
      )}
    >
      <Container className="flex items-center justify-between">
        <Logo size="md" />

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  active
                    ? 'bg-m3-primary-container text-m3-on-primary-container'
                    : 'text-m3-on-surface-variant hover:bg-m3-surface-container-high'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[13px] font-bold text-m3-ink leading-none">{user.name || 'Student'}</span>
                <span className="text-[11px] text-m3-ink-muted uppercase tracking-wider mt-0.5">{user.role}</span>
              </div>
              <div className="group relative">
                <button className="h-10 w-10 rounded-full bg-m3-surface-container-highest border border-m3-outline-variant flex items-center justify-center hover:bg-m3-surface-container-high transition-colors overflow-hidden">
                  {user.name ? (
                    <span className="text-sm font-bold text-m3-on-surface-container">{user.name[0]}</span>
                  ) : (
                    <User size={20} className="text-m3-ink-muted" />
                  )}
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-2xl bg-m3-surface p-2 shadow-[--elev-3] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-m3-red hover:bg-m3-red-container rounded-lg transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="m3-btn-filled"
            >
              Sign in
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
