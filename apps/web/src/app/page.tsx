'use client';

import Link from 'next/link';
import { Printer, Upload, Smartphone, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Container } from '@/components/Container';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="absolute top-0 left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:top-[-100px]">
          <div className="absolute inset-0 bg-gradient-to-tr from-m3-primary-container/20 to-m3-surface-container blur-3xl opacity-50" />
        </div>

        <Container className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-m3-primary-container px-4 py-1.5 text-sm font-medium text-m3-on-primary-container mb-8 animate-fade-in">
            <Zap size={14} className="fill-current" />
            <span>Now faster than ever with UPI checkout</span>
          </div>
          
          <h1 className="m3-display-l mb-6 text-m3-ink tracking-tight">
            Printing for Students,<br /> 
            <span className="text-m3-primary">Refined for Speed.</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-m3-ink-muted leading-relaxed mb-12">
            The smartest way to print on campus. Upload any document, pay instantly via UPI, and pick up your prints in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload" className="m3-btn-filled h-14 px-10 text-base shadow-elev-3 hover:shadow-elev-4">
              <Upload size={20} />
              Start Printing
            </Link>
            <Link href="/login" className="m3-btn-outlined h-14 px-10 text-base">
              Student Login
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 grayscale opacity-50 select-none">
            <Logo size="sm" href={null} className="!gap-1.5 opacity-80" />
            <div className="h-4 w-px bg-m3-outline-variant" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">Trusted by Campus Stationery</span>
          </div>
        </Container>
      </section>

      {/* 3-Step Flow */}
      <section className="bg-m3-surface-container-low py-24">
        <Container>
          <div className="text-center mb-16">
            <span className="m3-section-eyebrow mb-3 block">Simple Workflow</span>
            <h2 className="m3-display-s text-m3-ink">How it works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="m3-card p-8 relative z-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-primary text-white shadow-elev-2">
                <Upload size={28} />
              </div>
              <h3 className="m3-headline-s mb-3">1. Upload</h3>
              <p className="text-m3-ink-muted leading-relaxed">
                Choose your PDF, DOCX, or Image. Our system automatically calculates the price based on pages.
              </p>
              <div className="absolute top-4 right-4 h-12 w-12 flex items-center justify-center rounded-full bg-m3-primary-container/30 text-m3-primary font-display font-bold text-xl opacity-20">01</div>
            </div>

            {/* Step 2 */}
            <div className="m3-card p-8 relative z-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-green text-white shadow-elev-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <h3 className="m3-headline-s mb-3">2. Pay</h3>
              <p className="text-m3-ink-muted leading-relaxed">
                Scan the UPI QR or use any payment app. Secure and instant confirmation via Razorpay.
              </p>
              <div className="absolute top-4 right-4 h-12 w-12 flex items-center justify-center rounded-full bg-m3-green-container/30 text-m3-green font-display font-bold text-xl opacity-20">02</div>
            </div>

            {/* Step 3 */}
            <div className="m3-card p-8 relative z-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-yellow text-white shadow-elev-2">
                <Printer size={28} />
              </div>
              <h3 className="m3-headline-s mb-3">3. Pick Up</h3>
              <p className="text-m3-ink-muted leading-relaxed">
                Head to the shop counter. Your prints are already in the queue or ready to collect.
              </p>
              <div className="absolute top-4 right-4 h-12 w-12 flex items-center justify-center rounded-full bg-m3-yellow-container/30 text-m3-yellow font-display font-bold text-xl opacity-20">03</div>
            </div>

            {/* Connector Lines (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-m3-outline-variant -z-0 -translate-y-1/2" />
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-m3-outline-variant">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="m3-section-eyebrow mb-3 block">Why QuickPrint</span>
              <h2 className="m3-display-m mb-8 text-m3-ink leading-tight">Built for the campus hustle.</h2>
              
              <div className="space-y-8">
                {[
                  { icon: Smartphone, title: 'Mobile First', desc: 'No computer needed. Upload and pay directly from your smartphone.' },
                  { icon: Zap, title: 'Zero Wait Time', desc: 'Skip the line at the counter. Your document is processed the moment you pay.' },
                  { icon: ShieldCheck, title: 'Secure Handling', desc: 'Your files are encrypted and automatically deleted after printing.' },
                ].map((f, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-m3-surface-container-high text-m3-primary">
                      <f.icon size={24} />
                    </div>
                    <div>
                      <h4 className="m3-headline-s mb-1">{f.title}</h4>
                      <p className="text-m3-ink-muted">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-m3-surface-container shadow-elev-1 overflow-hidden">
                {/* Mock UI illustration / Image */}
                <div className="absolute inset-0 bg-gradient-to-br from-m3-primary/10 to-m3-primary-container/40 p-12">
                   <div className="h-full w-full rounded-2xl bg-white shadow-elev-4 p-6 border border-m3-outline-variant">
                      <div className="flex items-center justify-between mb-8">
                        <div className="h-6 w-32 bg-m3-surface-container rounded-full" />
                        <div className="h-10 w-10 rounded-full bg-m3-primary-container" />
                      </div>
                      <div className="space-y-4">
                        <div className="h-32 w-full bg-m3-surface-container-low rounded-xl border border-dashed border-m3-outline" />
                        <div className="h-4 w-2/3 bg-m3-surface-container rounded-full" />
                        <div className="h-4 w-full bg-m3-surface-container-low rounded-full" />
                        <div className="mt-8 h-12 w-full bg-m3-primary rounded-full shadow-elev-2" />
                      </div>
                   </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-m3-yellow/20 blur-2xl" />
              <div className="absolute -top-6 -left-6 h-32 w-32 rounded-full bg-m3-primary/10 blur-3xl" />
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="pb-24">
        <Container>
          <div className="m3-card bg-m3-ink text-white p-12 sm:p-20 text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="m3-display-m mb-6 tracking-tight">Ready to print your notes?</h2>
              <p className="text-white/60 text-lg mb-12 max-w-xl mx-auto">
                Join hundreds of students who save time every day. No more waiting, just fast and easy campus printing.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/upload" className="m3-btn-filled bg-white text-m3-ink hover:bg-m3-surface-container-high h-14 px-12 text-base">
                  Go to Upload
                </Link>
                <Link href="/contact" className="m3-btn-text text-white hover:bg-white/10 h-14 px-10 text-base">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
