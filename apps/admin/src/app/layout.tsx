import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'QuickPrint Admin Console',
  description: 'Manage print queues, printers, and earnings for your print shop.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
