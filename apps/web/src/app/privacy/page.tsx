import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Clock, Trash2, CreditCard } from 'lucide-react';
import { Container } from '@/components/Container';

export default function PrivacyPage() {
  const sections = [
    {
      icon: ShieldCheck,
      title: "1. Information We Collect",
      content: "We collect your phone number for authentication and communication regarding your print jobs. We also store the documents you upload for the sole purpose of printing them."
    },
    {
      icon: Clock,
      title: "2. How We Use Your Information",
      content: "Your phone number is used to link you to your print jobs and to send status updates. Your documents are used only to fulfill your print request."
    },
    {
      icon: Trash2,
      title: "3. Data Retention & Deletion",
      content: "We implement security measures to protect your personal information and uploaded files. Documents are deleted immediately after a successful print or if a job is cancelled. We do not store your files longer than necessary."
    },
    {
      icon: CreditCard,
      title: "4. Third-Party Services",
      content: "We use Razorpay for payment processing. Their privacy policy governs the handling of your payment information. We do not store your credit card or UPI details on our servers."
    }
  ];

  return (
    <main className="min-h-screen bg-m3-surface pt-12 pb-24">
      <Container size="sm">
        <Link href="/" className="m3-btn-text -ml-4 mb-8">
          <ArrowLeft size={18} />
          Back
        </Link>
        
        <div className="mb-12">
          <h1 className="m3-display-s text-m3-ink mb-4">Privacy Policy</h1>
          <p className="text-m3-ink-muted leading-relaxed">
            QuickPrint is built with a "privacy-first" mindset. We only collect what's absolutely necessary to get your documents printed.
          </p>
        </div>

        <div className="m3-card overflow-hidden">
          <div className="bg-m3-surface-container-low p-8 border-b border-m3-outline-variant">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center text-m3-primary">
                   <ShieldCheck size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-m3-ink-muted">Official Policy</span>
             </div>
             <p className="text-sm text-m3-ink-muted">Last updated: May 8, 2026</p>
          </div>

          <div className="p-8 sm:p-10 divide-y divide-m3-outline-variant">
            {sections.map((s, i) => (
              <section key={i} className="py-8 first:pt-0 last:pb-0">
                <h2 className="m3-headline-s text-m3-ink mb-4 flex items-center gap-3">
                   <s.icon size={20} className="text-m3-primary" />
                   {s.title}
                </h2>
                <p className="text-[15px] leading-relaxed text-m3-on-surface-variant">
                  {s.content}
                </p>
              </section>
            ))}
          </div>
          
          <div className="bg-m3-surface-container-lowest p-8 border-t border-m3-outline-variant text-center">
             <p className="text-sm text-m3-ink-muted mb-4">Have questions about your data?</p>
             <Link href="/contact" className="m3-btn-outlined mx-auto">
               Contact Developer
             </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
