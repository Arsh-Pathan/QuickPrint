'use client';

import Link from 'next/link';
import { Home, MessageSquareShare, FileQuestion, ArrowLeft } from 'lucide-react';
import { Container } from '@/components/Container';

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-m3-surface flex items-center justify-center py-12">
      <Container size="sm">
        <div className="flex flex-col items-center text-center">
          {/* Visual empty state */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-m3-primary/10 blur-3xl rounded-full" />
            <span className="font-display font-black text-[100px] text-m3-primary/5 select-none leading-none">404</span>
          </div>

          <header className="mb-12">
            <h1 className="m3-display-s text-m3-ink mb-4">
              <span className="text-m3-ink-muted">Page not found.</span>
            </h1>
            <p className="text-m3-ink-muted max-w-xs mx-auto leading-relaxed">
              We couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
          </header>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <Link
              href="/"
              className="m3-btn-filled w-full h-14 text-base shadow-elev-2 hover:shadow-elev-3 transition-transform active:scale-95"
            >
              <Home size={20} />
              Return to Home
            </Link>
            
            <Link 
              href="/contact" 
              className="m3-btn-text w-full h-14 text-base text-m3-primary"
            >
              <MessageSquareShare size={20} />
              Report an issue
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
