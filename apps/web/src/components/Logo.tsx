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
          'relative',
          s.box,
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="QuickPrint">
          <title>QuickPrint</title>

          <defs>
            <linearGradient id="qpGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0B5FFF" />
              <stop offset="100%" stop-color="#4D8BFF" />
            </linearGradient>
          </defs>

          <g transform="translate(20,20)">
            <rect x="-4" y="60" width="14" height="6" rx="3" fill="#4D8BFF" opacity="0.85" />
            <rect x="-14" y="76" width="24" height="6" rx="3" fill="#4D8BFF" opacity="0.6" />
            <rect x="-4" y="92" width="14" height="6" rx="3" fill="#4D8BFF" opacity="0.4" />

            <rect x="35" y="24" width="90" height="38" rx="6" ry="6" fill="#e9e9e9ff" />

            <rect x="10" y="44" width="140" height="80" rx="14" ry="14" fill="url(#qpGrad)" />

            <rect x="35" y="85" width="90" height="58" rx="4" ry="4" fill="#e9e9e9ff" />

            <rect x="48" y="94" width="64" height="6" rx="2" fill="#0B5FFF" />
            <rect x="48" y="108" width="50" height="6" rx="2" fill="#4D8BFF" />
            <rect x="48" y="122" width="40" height="6" rx="2" fill="#4D8BFF" />

            <circle cx="132" cy="76" r="5" fill="#ffffff" />
          </g>

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
