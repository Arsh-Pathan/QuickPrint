import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ErrorBoundary } from '@/components/error-boundary';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'QuickPrint — Skip the Queue',
  description: 'Upload your document, pay online, and pick up your prints. No waiting in line.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a73e8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      </head>
      <body className="antialiased bg-m3-surface text-m3-ink" suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
