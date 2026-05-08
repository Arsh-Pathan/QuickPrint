import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          <h1 className="mb-8 text-[28px] font-normal text-[#202124]">Privacy Policy</h1>
          
          <div className="space-y-8 text-[14px] leading-relaxed text-[#5f6368]">
            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">1. Information We Collect</h2>
              <p>
                We collect your phone number for authentication and communication regarding your print jobs. We also store the documents you upload for the sole purpose of printing them.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">2. How We Use Your Information</h2>
              <p>
                Your phone number is used to link you to your print jobs and to send status updates. Your documents are used only to fulfill your print request.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">3. Data Security</h2>
              <p>
                We implement security measures to protect your personal information and uploaded files. Documents are deleted immediately after a successful print or when a job is cancelled.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">4. Third-Party Services</h2>
              <p>
                We use Razorpay for payment processing. Their privacy policy governs the handling of your payment information.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-[#202124] mb-3">5. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
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
