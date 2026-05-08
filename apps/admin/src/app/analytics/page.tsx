import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Analytics</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">
          Daily earnings, peak hours, and top settings — from the audit log.
        </p>
      </header>
      <div className="google-card border-dashed !border-2">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4]">
            <BarChart3 className="h-6 w-6 text-[#bdc1c6]" />
          </div>
          <h2 className="text-[16px] font-medium text-[#202124]">Charts coming soon</h2>
          <p className="mt-1.5 max-w-sm text-[13px] text-[#5f6368]">
            Revenue charts, usage trends, and peak-hour analytics will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
