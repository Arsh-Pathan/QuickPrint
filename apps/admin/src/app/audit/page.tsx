import { ActivitySquare } from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">System Audit Logs</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">
          Immutable security and configuration logs.
        </p>
      </header>

      <div className="google-card border-dashed !border-2">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4] mb-4">
            <ActivitySquare className="h-6 w-6 text-[#5f6368]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#202124]">Audit Logging Active</h2>
          <p className="mt-2 text-[13px] text-[#5f6368] max-w-md">
            System events are securely logged. A detailed query builder for audit events will be integrated in the next release to let you manually scan entity logs.
          </p>
        </div>
      </div>
    </div>
  );
}
