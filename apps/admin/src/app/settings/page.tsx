import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Settings</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">Pricing, default printer, and agent configuration</p>
      </header>

      <div className="google-card">
        <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f4]">
            <SettingsIcon className="h-4 w-4 text-[#5f6368]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#202124]">General Configuration</h2>
        </div>
        <p className="text-[13px] text-[#5f6368] leading-relaxed">
          Pricing configuration (B/W paise, color paise, duplex discount) and agent provisioning UI will be available here.
        </p>
      </div>
    </div>
  );
}
