import { StatCard } from '@/components/stat-card';
import { Banknote, FileText, Printer, Clock, Activity } from 'lucide-react';

export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Overview</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">Welcome back to QuickPrint Admin Console</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Earnings Today" 
          value="₹0.00" 
          hint="Calculated from captured payments" 
          icon={<Banknote className="h-4 w-4" />} 
        />
        <StatCard 
          label="Jobs Completed" 
          value="0" 
          hint="Successfully printed today" 
          icon={<FileText className="h-4 w-4" />} 
        />
        <StatCard 
          label="Queue Length" 
          value="0" 
          hint="Jobs waiting to be processed" 
          icon={<Clock className="h-4 w-4" />} 
        />
        <StatCard 
          label="Printers Online" 
          value="0" 
          hint="Healthy printers in the shop" 
          icon={<Printer className="h-4 w-4" />} 
        />
      </div>

      {/* Activity feed placeholder */}
      <div className="google-card border-dashed !border-2">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4]">
            <Activity className="h-6 w-6 text-[#bdc1c6]" />
          </div>
          <h2 className="text-[16px] font-medium text-[#202124]">No recent activity</h2>
          <p className="mt-1.5 max-w-sm text-[13px] text-[#5f6368]">
            Activity logs and system events will appear here in real-time once the system is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
