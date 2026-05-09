'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { AnalyticsService } from '@/lib/analytics';
import { DailyEarningsChart } from '@/components/daily-earnings-chart';
import { PeakHoursChart } from '@/components/peak-hours-chart';
import { TopSettingsTable } from '@/components/top-settings-table';
import { rupees } from '@/lib/format';

export default function AnalyticsPage() {
  const [dailyEarnings, setDailyEarnings] = useState<Array<{ date: string; earnings: number; jobCount: number }>>([]);
  const [peakHours, setPeakHours] = useState<Array<{ hour: number; jobCount: number; earnings: number }>>([]);
  const [topSettings, setTopSettings] = useState<Array<{ settingName: string; usageCount: number; lastUsed: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all analytics data in parallel
        const [earningsData, hoursData, settingsData] = await Promise.all([
          AnalyticsService.getDailyEarnings(7),
          AnalyticsService.getPeakHours(7),
          AnalyticsService.getTopSettings(7)
        ]);
        
        setDailyEarnings(earningsData);
        setPeakHours(hoursData);
        setTopSettings(settingsData);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error('Analytics loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
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
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-brand-600"></div>
            <p className="mt-4 text-[13px] text-[#5f6368]">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
            <div className="text-[13px] text-[#5f6368]">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Analytics</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">
          Daily earnings, peak hours, and top settings — from the audit log.
        </p>
      </header>

      {/* Daily Earnings Chart */}
      <div className="google-card">
        <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f4]">
            <BarChart3 className="h-6 w-6 text-[#5f6368]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#202124]">Daily Earnings (Last 7 Days)</h2>
        </div>
        <DailyEarningsChart data={dailyEarnings} />
      </div>

      {/* Peak Hours Chart */}
      <div className="google-card mt-6">
        <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f4]">
            <BarChart3 className="h-6 w-6 text-[#5f6368]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#202124]">Peak Hours (Last 7 Days)</h2>
        </div>
        <PeakHoursChart data={peakHours} />
      </div>

      {/* Top Settings Table */}
      <div className="google-card mt-6">
        <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f4]">
            <BarChart3 className="h-6 w-6 text-[#5f6368]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#202124]">Top Settings Usage</h2>
        </div>
        <TopSettingsTable data={topSettings} />
      </div>
    </div>
  );
}
