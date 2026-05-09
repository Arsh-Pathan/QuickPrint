'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListOrdered,
  Printer,
  BarChart3,
  Settings,
  LogOut,
  Users,
  ActivitySquare
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/queue', label: 'Queue', icon: ListOrdered },
  { href: '/printers', label: 'Printers', icon: Printer },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/users', label: 'Students', icon: Users },
  { href: '/audit', label: 'Audit Logs', icon: ActivitySquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuth((s) => s.logout);

  function onSignOut() {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-[#dadce0] flex flex-col">
      {/* Logo area */}
      <div className="px-6 py-6 border-b border-[#dadce0]">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/logo.svg" 
            alt="QuickPrint" 
            width={36} 
            height={36} 
            className="h-auto w-9"
          />
          <div>
            <p className="text-[15px] font-medium text-[#202124] leading-tight">QuickPrint</p>
            <p className="text-[11px] font-medium text-[#5f6368] tracking-wide">Admin Console</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-200',
                active
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]',
              )}
            >
              <Icon className={clsx('h-[18px] w-[18px]', active ? 'text-brand-600' : 'text-[#5f6368]')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: sign out + branding */}
      <div className="border-t border-[#dadce0] px-3 py-3">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[13px] font-medium text-[#3c4043] transition-colors hover:bg-[#f1f3f4]"
        >
          <LogOut className="h-[18px] w-[18px] text-[#5f6368]" />
          Sign out
        </button>
        <p className="mt-3 px-3 text-[10px] font-medium text-[#bdc1c6] tracking-wider uppercase">
          AI &amp; ML Club · DPES
        </p>
      </div>
    </aside>
  );
}
