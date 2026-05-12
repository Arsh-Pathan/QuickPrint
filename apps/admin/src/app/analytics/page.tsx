'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock, Settings, Loader2, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { AnalyticsService } from '@/lib/analytics';
import { DailyEarningsChart } from '@/components/daily-earnings-chart';
import { PeakHoursChart } from '@/components/peak-hours-chart';
import { TopSettingsTable } from '@/components/top-settings-table';

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
        const [earningsData, hoursData, settingsData] = await Promise.all([
          AnalyticsService.getDailyEarnings(7),
          AnalyticsService.getPeakHours(7),
          AnalyticsService.getTopSettings(7)
        ]);
        setDailyEarnings(earningsData);
        setPeakHours(hoursData);
        setTopSettings(settingsData);
      } catch (err) {
        setError('Audit log aggregation failed due to stream timeout.');
        console.error('Analytics loading error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-12 py-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m3-primary-container/40 text-m3-primary text-[10px] font-bold uppercase tracking-widest border border-m3-primary/10">
            <ShieldCheck size={12} />
            Verified Audit Stream
          </div>
          <h1 className="m3-display-s text-m3-ink tracking-tight">Business Intelligence</h1>
          <p className="text-[15px] text-m3-ink-muted">
            Aggregated metrics derived from immutable system-level trace logs.
          </p>
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-m3-green-container/20 border border-m3-green/10 text-m3-green text-[11px] font-black uppercase tracking-widest">
            <div className="h-1.5 w-1.5 rounded-full bg-m3-green animate-pulse" />
            Live Sync: Healthy
          </div>
        )}
      </header>

      {loading ? (
        <div className="m3-card py-40 text-center bg-white/40 backdrop-blur-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-m3-primary/10 blur-[60px] rounded-full animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-m3-primary/30 mx-auto relative z-10" />
          </div>
          <p className="text-[11px] font-black text-m3-ink-faint uppercase tracking-[0.3em] animate-pulse">Scanning Audit Bus…</p>
        </div>
      ) : error ? (
        <div className="m3-card p-20 text-center bg-m3-red-container/5 border-m3-red/10">
          <div className="h-20 w-20 rounded-3xl bg-m3-red-container/30 flex items-center justify-center mx-auto mb-6 border border-m3-red/10">
            <AlertCircle className="h-10 w-10 text-m3-red opacity-40" />
          </div>
          <h3 className="m3-headline-s text-m3-ink font-black tracking-tight">Intelligence Fault</h3>
          <p className="text-[15px] text-m3-ink-muted max-w-xs mx-auto mb-10 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="m3-btn-filled h-14 px-12 font-black shadow-elev-2 hover:shadow-elev-4">
            Re-Establish Handshake
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10">
          {/* Daily Earnings Chart */}
          <div className="m3-card relative overflow-hidden bg-white shadow-elev-2 border-m3-outline-variant/30">
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-m3-primary/5 blur-[120px] rounded-full" />
            <div className="flex items-center gap-5 px-8 py-8 border-b border-m3-outline-variant/30 relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m3-surface-container text-m3-primary shadow-sm transition-transform hover:rotate-6">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-black text-m3-ink tracking-tight">Revenue Trajectory</h2>
                <p className="text-[12px] font-bold text-m3-ink-faint uppercase tracking-wider">7-Day Financial Performance</p>
              </div>
            </div>
            <div className="p-8 h-[380px] relative z-10">
              <DailyEarningsChart data={dailyEarnings} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Peak Hours Chart */}
            <div className="m3-card relative overflow-hidden bg-white shadow-elev-2 border-m3-outline-variant/30">
              <div className="flex items-center gap-5 px-8 py-8 border-b border-m3-outline-variant/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m3-surface-container text-m3-primary shadow-sm transition-transform hover:-rotate-6">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-[18px] font-black text-m3-ink tracking-tight">Demand Density</h2>
                  <p className="text-[12px] font-bold text-m3-ink-faint uppercase tracking-wider">Hourly Utilization Heatmap</p>
                </div>
              </div>
              <div className="p-8 h-[320px]">
                <PeakHoursChart data={peakHours} />
              </div>
            </div>

            {/* Top Settings Table */}
            <div className="m3-card relative overflow-hidden bg-white shadow-elev-2 border-m3-outline-variant/30">
              <div className="flex items-center gap-5 px-8 py-8 border-b border-m3-outline-variant/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m3-surface-container text-m3-primary shadow-sm transition-transform hover:scale-110">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-[18px] font-black text-m3-ink tracking-tight">Node Optimization</h2>
                  <p className="text-[12px] font-bold text-m3-ink-faint uppercase tracking-wider">High-Frequency User Preferences</p>
                </div>
              </div>
              <div className="p-0">
                <TopSettingsTable data={topSettings} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
