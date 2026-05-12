'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { 
  LayoutDashboard, 
  ListOrdered, 
  Printer, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';
import { Logo } from './Logo';
import { Container } from './Container';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuth((s) => s.logout);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Queue', href: '/queue', icon: ListOrdered },
    { label: 'Printers', href: '/printers', icon: Printer },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  function onSignOut() {
    logout();
    router.replace('/login');
  }

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled 
          ? 'bg-white/90 backdrop-blur-md shadow-elev-1 py-2' 
          : 'bg-m3-surface py-4'
      )}
    >
      <Container size="xl" className="flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Logo size="md" />
          
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all duration-200',
                    active
                      ? 'bg-m3-primary text-m3-on-primary shadow-elev-2'
                      : 'text-m3-ink-muted hover:bg-m3-surface-container-high'
                  )}
                >
                  <Icon size={16} className={clsx('transition-colors', active ? 'text-m3-on-primary' : 'text-m3-ink-faint')} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Profile Dropdown */}
          <div className="group relative">
            <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-m3-surface-container border border-m3-outline-variant hover:bg-m3-surface-container-high transition-colors">
              <div className="h-8 w-8 rounded-full bg-m3-primary text-m3-on-primary flex items-center justify-center">
                <UserIcon size={16} />
              </div>
              <span className="text-[13px] font-bold text-m3-ink hidden sm:inline">Admin Console</span>
              <ChevronDown size={14} className="text-m3-ink-faint mr-1" />
            </button>
            
            <div className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-3xl bg-white p-2 shadow-elev-5 border border-m3-outline-variant/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <div className="px-4 py-3 mb-2 bg-m3-surface-container-low rounded-2xl">
                <p className="text-[10px] font-extrabold text-m3-ink-faint uppercase tracking-widest mb-0.5">Signed in as</p>
                <p className="text-[14px] font-bold text-m3-ink truncate">Shop Administrator</p>
              </div>
              <div className="h-px bg-m3-outline-variant/30 my-1 mx-2" />
              <button
                onClick={onSignOut}
                className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-bold text-m3-red hover:bg-m3-red-container rounded-2xl transition-colors"
              >
                <LogOut size={16} />
                Sign out of Console
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-full bg-m3-surface-container-high text-m3-ink"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </Container>

      {/* Mobile Navigation Drawer */}
      <div className={clsx(
        'lg:hidden fixed inset-0 top-[72px] bg-white z-[60] transition-all duration-300',
        mobileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-4'
      )}>
        <Container className="py-8 space-y-6">
          <div className="grid grid-cols-1 gap-2">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold transition-all',
                    active
                      ? 'bg-m3-primary text-m3-on-primary shadow-elev-3'
                      : 'text-m3-ink-muted hover:bg-m3-surface-container'
                  )}
                >
                  <Icon size={20} className={active ? 'text-m3-on-primary' : 'text-m3-ink-faint'} />
                  {link.label}
                </Link>
              );
            })}
          </div>
          
          <div className="pt-6 border-t border-m3-outline-variant/30">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold text-m3-red hover:bg-m3-red-container transition-colors"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </Container>
      </div>
    </header>
  );
}
