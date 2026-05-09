import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="text-[64px] font-normal text-[#202124]">404</h1>
      <h2 className="mt-2 text-[18px] font-medium text-[#202124]">Page not found</h2>
      <p className="mt-4 text-[14px] text-[#5f6368]">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 hover:shadow-md active:bg-brand-700"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
