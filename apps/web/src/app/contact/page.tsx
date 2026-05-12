'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Phone, ExternalLink, MessageCircle, User } from 'lucide-react';
import { Container } from '@/components/Container';

export default function ContactPage() {
  const contacts = [
    {
      role: "Shop Owner Support",
      name: "Maddy Shop",
      description: "For payment issues, cash refunds, or if the printer tray is stuck.",
      phone: "+91 91750 61818",
      email: null,
      color: "var(--m3-primary)",
      container: "var(--m3-primary-container)",
      onContainer: "var(--m3-on-primary-container)"
    },
    {
      role: "System Developer",
      name: "Arsh Pathan",
      description: "For technical bugs, website issues, or feature suggestions.",
      phone: null,
      email: "mail.arsh.pathan@gmail.com",
      color: "var(--m3-green)",
      container: "var(--m3-green-container)",
      onContainer: "#00210b"
    }
  ];

  return (
    <main className="min-h-screen bg-m3-surface pt-12 pb-24">
      <Container size="sm">
        <Link href="/" className="m3-btn-text -ml-4 mb-8">
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="text-center mb-16">
          <h1 className="m3-display-s text-m3-ink mb-4">Support & Help</h1>
          <p className="text-m3-ink-muted max-w-sm mx-auto">
            Need help with your print job? Connect with the right person below.
          </p>
        </div>

        <div className="space-y-6">
          {contacts.map((c, i) => (
            <div key={i} className="m3-card p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div 
                  className="h-16 w-16 rounded-full flex items-center justify-center shrink-0 shadow-elev-1"
                  style={{ backgroundColor: c.container }}
                >
                  <User size={32} style={{ color: c.color }} />
                </div>
                
                <div className="flex-1">
                  <span className="m3-section-eyebrow mb-1 block" style={{ color: c.color }}>{c.role}</span>
                  <h2 className="m3-headline-m text-m3-ink mb-2">{c.name}</h2>
                  <p className="text-m3-ink-muted text-[15px] leading-relaxed mb-6">
                    {c.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {c.phone && (
                      <>
                        <a 
                          href={`tel:${c.phone}`}
                          className="m3-chip m3-chip-active hover:brightness-95"
                          style={{ backgroundColor: c.container, color: c.onContainer }}
                        >
                          <Phone size={16} />
                          Call Now
                        </a>
                        <a 
                          href={`https://wa.me/${c.phone.replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="m3-chip hover:bg-m3-surface-container"
                        >
                          <MessageCircle size={16} className="text-m3-green" />
                          WhatsApp
                        </a>
                      </>
                    )}
                    {c.email && (
                      <a 
                        href={`mailto:${c.email}`}
                        className="m3-chip m3-chip-active hover:brightness-95"
                        style={{ backgroundColor: c.container, color: c.onContainer }}
                      >
                        <Mail size={16} />
                        Email Developer
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 m3-card-flat p-8 text-center">
          <h3 className="m3-headline-s mb-2">Frequently Asked</h3>
          <p className="text-sm text-m3-ink-muted mb-6">
            Quick answers for common campus printing questions.
          </p>
          <div className="flex flex-col gap-2">
            {[
              'Wait, I paid but it didn\'t print!',
              'Can I print in color?',
              'How long is my file stored?',
            ].map((q, i) => (
              <button key={i} className="text-sm font-medium text-m3-primary hover:underline py-2">
                {q}
              </button>
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
