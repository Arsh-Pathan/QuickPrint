import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <Link href="/" className="mb-8">
        <Image src="/logo.svg" alt="QuickPrint" width={48} height={48} />
      </Link>
      <h1 className="text-[64px] font-normal text-[#202124]">404</h1>
      <h2 className="mt-2 text-[18px] font-medium text-[#202124]">Page not found</h2>
      <p className="mt-4 text-[14px] text-[#5f6368]">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-[#f8f9fa] border border-[#dadce0] px-6 py-2.5 text-sm font-medium text-[#3c4043] transition-all hover:bg-white hover:shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
      >
        Go back home
      </Link>
    </div>
  );
}
