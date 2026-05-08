import Link from 'next/link';
import Image from 'next/image';
import { Printer, Upload, LogIn, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Top bar */}
      <nav className="flex items-center justify-end gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/contact"
          className="text-[13px] font-medium text-[#5f6368] hover:text-[#202124] transition-colors"
        >
          Contact
        </Link>
        <Link
          href="/login"
          className="google-button-primary !px-5 !py-2 text-[13px]"
        >
          Sign in
        </Link>
      </nav>

      {/* Center content — Google-style */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-10">
          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/logo.svg"
              alt="QuickPrint"
              width={100}
              height={100}
              priority
              className="h-auto w-[100px] drop-shadow-sm"
            />
            <h1 className="text-[34px] font-normal tracking-tight text-[#202124]">
              QuickPrint
            </h1>
          </div>

          {/* Search-bar style tagline */}
          <div className="group flex w-full items-center gap-3 rounded-full border border-[#dfe1e5] px-6 py-3.5 transition-all duration-300 hover:shadow-[0_1px_6px_rgba(32,33,36,0.28)] hover:border-transparent cursor-default select-none">
            <Printer className="h-5 w-5 text-[#9aa0a6] shrink-0" />
            <p className="text-base text-[#5f6368] leading-snug">
              Skip the queue. Print from your phone.
            </p>
          </div>

          {/* CTA Buttons — Google search buttons style */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f8f9fa] border border-transparent px-6 py-2.5 text-sm font-medium text-[#3c4043] transition-all duration-200 hover:bg-white hover:border-[#dadce0] hover:shadow-[0_1px_1px_rgba(0,0,0,0.1)] active:bg-[#f1f3f4]"
            >
              <Upload className="h-4 w-4" />
              Start Printing
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f8f9fa] border border-transparent px-6 py-2.5 text-sm font-medium text-[#3c4043] transition-all duration-200 hover:bg-white hover:border-[#dadce0] hover:shadow-[0_1px_1px_rgba(0,0,0,0.1)] active:bg-[#f1f3f4]"
            >
              <LogIn className="h-4 w-4" />
              Student Login
            </Link>
          </div>

          {/* Quick info cards */}
          <div className="mt-2 grid w-full grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-[#f8f9fa] p-4 transition-all duration-200 hover:bg-[#f1f3f4]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-brand-500">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-[#3c4043] text-center leading-tight">Upload File</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-[#f8f9fa] p-4 transition-all duration-200 hover:bg-[#f1f3f4]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#34a853]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-xs font-medium text-[#3c4043] text-center leading-tight">Pay Online</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-[#f8f9fa] p-4 transition-all duration-200 hover:bg-[#f1f3f4]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-[#ea8600]">
                <Printer className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-[#3c4043] text-center leading-tight">Pick Up</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom footer — Google style */}
      <footer className="border-t border-[#dadce0] bg-[#f2f2f2]">
        <div className="px-6 py-3">
          <p className="text-[13px] text-[#70757a]">
            Dhole Patil Education Society
          </p>
        </div>
        <div className="border-t border-[#dadce0] px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] font-medium tracking-wide text-[#70757a]">
            Automation by AI & ML Club
          </p>
          <div className="flex gap-6 text-[13px] text-[#70757a]">
            <Link href="/terms" className="hover:underline underline-offset-4 transition-colors hover:text-[#202124]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:underline underline-offset-4 transition-colors hover:text-[#202124]">
              Privacy
            </Link>
            <Link href="/contact" className="hover:underline underline-offset-4 transition-colors hover:text-[#202124]">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
