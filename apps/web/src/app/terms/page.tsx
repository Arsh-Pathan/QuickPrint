import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
          <h1 className="mb-8 text-[28px] font-normal text-[#202124]">Terms of Service</h1>
          
          <div className="space-y-8 text-[14px] leading-relaxed text-[#5f6368]">
            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">1. Acceptance of Terms</h2>
              <p>
                By using QuickPrint, provided by the Automation by AI & ML Club, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">2. Description of Service</h2>
              <p>
                QuickPrint is an autonomous printing management system. Users can upload documents, pay for printing services, and track the status of their print jobs.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">3. User Responsibilities</h2>
              <p>
                Users are responsible for the content they upload. You must not upload any material that is illegal, offensive, or violates intellectual property rights.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">4. Payments and Refunds</h2>
              <p>
                Payments are processed via Razorpay. All transactions are final. Refunds are only initiated in case of hardware failure or systemic errors, at the discretion of the shop management.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">5. Data Retention</h2>
              <p>
                Uploaded files are stored temporarily and are automatically deleted from the server and local print agent once the print job is completed or cancelled.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">6. Limitation of Liability</h2>
              <p>
                The Automation by AI & ML Club and the print shop management are not liable for any delays, failed prints, or loss of data resulting from the use of this service.
              </p>
            </section>
          </div>

          <footer className="mt-10 pt-6 border-t border-[#dadce0] text-xs text-[#70757a]">
            Last updated: May 8, 2026
          </footer>
        </div>
      </div>
    </main>
  );
}
