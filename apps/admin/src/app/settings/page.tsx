import { Settings as SettingsIcon } from 'lucide-react';
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Settings</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">Pricing, default printer, and agent configuration</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="google-card h-fit">
          <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f4]">
              <SettingsIcon className="h-4 w-4 text-[#5f6368]" />
            </div>
            <h2 className="text-[15px] font-medium text-[#202124]">General Configuration</h2>
          </div>
          <SettingsForm />
        </div>

        <div className="space-y-8">
          <div className="google-card">
            <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f0fe]">
                <SettingsIcon className="h-4 w-4 text-[#1a73e8]" />
              </div>
              <h2 className="text-[15px] font-medium text-[#202124]">Student Access & QR Code</h2>
            </div>
            <p className="mb-6 text-[13px] text-[#5f6368]">
              Configure your permanent public URL (from Cloudflare or Ngrok) to generate a static QR code for students.
            </p>
            <div className="flex justify-center py-4 bg-[#f8f9fa] rounded-xl border border-dashed border-[#dadce0]">
              <div id="qr-preview" className="bg-white p-4 rounded-lg shadow-sm">
                {/* QR Code will be rendered here by the form component or a dedicated poster view */}
                <div className="w-48 h-48 flex items-center justify-center text-[#bdc1c6] text-[11px] text-center px-4 uppercase tracking-wider">
                  Complete setup in configuration to generate QR
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
