import Link from 'next/link';
import { ArrowLeft, BookOpen, UserCheck, AlertCircle, RefreshCcw, Scale } from 'lucide-react';
import { Container } from '@/components/Container';

export default function TermsPage() {
  const sections = [
    {
      icon: UserCheck,
      title: "1. Acceptance of Terms",
      content: "By using QuickPrint, provided by the Automation by AI & ML Club, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service."
    },
    {
      icon: BookOpen,
      title: "2. Description of Service",
      content: "QuickPrint is an autonomous printing management system. Users can upload documents, pay for printing services, and track the status of their print jobs."
    },
    {
      icon: AlertCircle,
      title: "3. User Responsibilities",
      content: "Users are responsible for the content they upload. You must not upload any material that is illegal, offensive, or violates intellectual property rights. You agree that your files are your own responsibility."
    },
    {
      icon: RefreshCcw,
      title: "4. Payments and Refunds",
      content: "Payments are processed via Razorpay. All transactions are final. Refunds are only initiated in case of hardware failure or systemic errors, at the discretion of the shop management."
    },
    {
      icon: Scale,
      title: "5. Limitation of Liability",
      content: "The Automation by AI & ML Club and the print shop management are not liable for any delays, failed prints, or loss of data resulting from the use of this service."
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
          <h1 className="m3-display-s text-m3-ink mb-4">Terms of Service</h1>
          <p className="text-m3-ink-muted leading-relaxed">
            Please read these terms carefully before using the QuickPrint service.
          </p>
        </div>

        <div className="m3-card overflow-hidden">
          <div className="bg-m3-surface-container-low p-8 border-b border-m3-outline-variant">
             <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center text-m3-primary">
                   <BookOpen size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-m3-ink-muted">Service Agreement</span>
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
          
          <div className="bg-m3-surface-container-lowest p-8 border-t border-m3-outline-variant text-center text-[12px] text-m3-ink-faint italic">
            QuickPrint is a project of the Automation by AI & ML Club.
          </div>
        </div>
      </Container>
    </main>
  );
}
