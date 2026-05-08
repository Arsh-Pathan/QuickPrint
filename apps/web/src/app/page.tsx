import Link from 'next/link';
import { Printer, Zap, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <header className="mb-10 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
          <Printer className="h-5 w-5" />
        </div>
        <span className="text-xl font-semibold">QuickPrint</span>
      </header>

      <section className="space-y-3">
        <h1 className="text-3xl font-bold leading-tight">
          Skip the queue. Print from your phone.
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Upload your file, pay with UPI, and pick up your prints when they're ready.
          We'll text you.
        </p>
      </section>

      <Link
        href="/upload"
        className="mt-10 block rounded-xl bg-brand py-4 text-center font-semibold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98]"
      >
        Start printing
      </Link>

      <ul className="mt-12 space-y-4 text-sm">
        <Feature icon={<Zap className="h-4 w-4" />} title="3-click flow">
          Upload, confirm, pay. Done.
        </Feature>
        <Feature icon={<Printer className="h-4 w-4" />} title="Live queue">
          See your spot in line in real time.
        </Feature>
        <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Secure">
          Files auto-delete after printing.
        </Feature>
      </ul>
    </main>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-slate-600 dark:text-slate-400">{children}</p>
      </div>
    </li>
  );
}
