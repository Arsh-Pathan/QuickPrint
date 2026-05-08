'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListOrdered, Printer, BarChart3, Settings } from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/queue', label: 'Queue', icon: ListOrdered },
  { href: '/printers', label: 'Printers', icon: Printer },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 px-4 py-6 dark:border-slate-800">
      <div className="mb-8 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
          <Printer className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">QuickPrint</p>
          <p className="text-xs text-slate-500">Admin</p>
        </div>
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active
                  ? 'bg-brand text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
