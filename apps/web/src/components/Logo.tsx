import Link from 'next/link';
import { clsx } from 'clsx';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  mono?: boolean;
  href?: string | null;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-7 w-7', icon: 14, gap: 'gap-2', text: 'text-[15px]' },
  md: { box: 'h-9 w-9', icon: 18, gap: 'gap-2.5', text: 'text-[17px]' },
  lg: { box: 'h-12 w-12', icon: 22, gap: 'gap-3', text: 'text-[22px]' },
} as const;

export function Logo({ size = 'md', mono = false, href = '/', className }: LogoProps) {
  const s = sizeMap[size];
  const inner = (
    <span className={clsx('inline-flex items-center', s.gap, className)}>
      <span
        className={clsx(
          'relative inline-flex items-center justify-center rounded-xl',
          s.box,
          mono ? 'bg-white text-m3-ink' : 'bg-m3-primary text-m3-on-primary',
        )}
        style={{ boxShadow: mono ? 'none' : 'var(--elev-1)' }}
      >
        {/* Custom geometric "Q" / paper-stack mark */}
        <svg
          viewBox="0 0 24 24"
          width={s.icon}
          height={s.icon}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="4" y="6" width="13" height="13" rx="2.5" />
          <path d="M9 6V4.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 19 4.5v9a1.5 1.5 0 0 1-1.5 1.5H17" />
          <circle cx="10.5" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span
        className={clsx(
          'font-display font-bold tracking-tight',
          s.text,
          mono ? 'text-white' : 'text-m3-ink',
        )}
      >
        QuickPrint
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex items-center rounded-full -m-1 p-1 transition-colors hover:opacity-90">
      {inner}
    </Link>
  );
}
