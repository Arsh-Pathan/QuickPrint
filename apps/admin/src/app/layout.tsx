import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'QuickPrint Admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-8 py-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
