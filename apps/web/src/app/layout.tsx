import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

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
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
