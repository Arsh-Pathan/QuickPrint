'use client';

import Link from 'next/link';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { Container } from './Container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-m3-ink text-white pt-16 pb-8 mt-auto rounded-t-[32px]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2">
            <Logo size="md" mono className="mb-6" />
            <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-6">
              Autonomous print-shop management for campus stationery. 
              Designed by students, for students. Skip the queue and print smart.
            </p>
            <div className="flex items-center gap-4">
              <a href="tel:+919175061818" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Phone size={18} />
              </a>
              <a href="mailto:mail.arsh.pathan@gmail.com" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Mail size={18} />
              </a>
              <a href="https://wa.me/919175061818" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6">Product</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/upload" className="text-sm text-white/70 hover:text-white transition-colors">Start Printing</Link></li>
              <li><Link href="/contact" className="text-sm text-white/70 hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/terms" className="text-sm text-white/70 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-m3-green animate-pulse" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">System Operational</span>
          </div>
          
          <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
              &copy; {currentYear} Arsh Pathan
            </p>
            <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest">
              Built with ❤️ for Campus Hustle
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
