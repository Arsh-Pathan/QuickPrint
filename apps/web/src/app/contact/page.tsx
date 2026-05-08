import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-12 sm:px-6 sm:py-16 text-[#3c4043]">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50 px-3 py-1.5 -ml-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        
        <div className="google-card !p-8 sm:!p-10">
          <h1 className="mb-8 text-[28px] font-normal text-[#202124]">Contact Us</h1>
          
          <div className="space-y-10">
            <p className="text-[15px] leading-relaxed text-[#3c4043]">
              Have questions or need help? Reach out to the Automation by AI & ML Club or the shop management.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#dadce0] p-6 transition-all duration-200 hover:bg-[#f8f9fa] hover:shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="text-[15px] font-medium text-[#202124]">Email</h2>
                <p className="mt-1 text-sm text-[#70757a]">support@quickprint.club</p>
              </div>

              <div className="rounded-xl border border-[#dadce0] p-6 transition-all duration-200 hover:bg-[#f8f9fa] hover:shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h2 className="text-[15px] font-medium text-[#202124]">WhatsApp</h2>
                <p className="mt-1 text-sm text-[#70757a]">+91 98765 43210</p>
              </div>
            </div>

            <section className="rounded-xl bg-[#f8f9fa] p-6 sm:p-8 border border-[#dadce0]">
              <h2 className="text-lg font-medium text-[#202124] mb-3">About the Club</h2>
              <p className="leading-relaxed text-[14px] text-[#5f6368]">
                The <strong className="text-[#202124]">Automation by AI & ML Club</strong> focuses on building real-world solutions that streamline campus life. QuickPrint is one of our flagship projects, aimed at eliminating queues and making resource management autonomous and efficient.
              </p>
            </section>
          </div>

          <footer className="mt-10 pt-6 border-t border-[#dadce0] text-xs text-[#70757a]">
            © 2026 Automation by AI & ML Club · Dhole Patil Education Society
          </footer>
        </div>
      </div>
    </main>
  );
}
