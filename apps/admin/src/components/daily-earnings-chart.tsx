'use client';

'use client';

import { rupees } from '@/lib/format';

export function DailyEarningsChart({ data }: { data: { date: string; earnings: number; jobCount: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-[#5f6368]">No earnings data available</p>
      </div>
    );
  }

  // Find max earnings for scaling
  const maxEarnings = Math.max(...data.map(d => d.earnings));
  const barHeight = 20; // Fixed height for each bar
  const gap = 4; // Gap between bars
  const totalHeight = (barHeight + gap) * data.length - gap;

  return (
    <div className="space-y-4">
      <div className="flex items-end h-[200px] w-full bg-[#f8f9fa] rounded-lg p-4 relative">
        {data.map((day, index) => {
          const heightPercent = (day.earnings / maxEarnings) * 100;
          const barHeightPx = (heightPercent / 100) * 150; // 150px max height for chart
          
          return (
            <div key={day.date} className="flex items-end">
              <div className="flex-1 flex items-end justify-center">
                <div 
                  className={`w-[20px] bg-brand-600 rounded-t-lg transition-all duration-300`}
                  style={{ height: `${barHeightPx}px` }}
                  title={`${rupees(day.earnings)} (${day.jobCount} jobs)`}
                />
              </div>
              <div className="text-[10px] text-[#5f6368] w-[20px] text-center mt-1">
                {day.date.split('-').reverse().join('-')} {/* DD-MM-YY */}
              </div>
            </div>
          );
        })}
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-end w-12">
          <div className="text-[10px] text-[#5f6368]">₹{maxEarnings.toFixed(0)}</div>
          <div className="text-[10px] text-[#5f6368]">₹0</div>
        </div>
      </div>
      
      <div className="space-y-2">
        {data.map((day) => (
          <div key={day.date} className="flex items-center space-x-2">
            <div className="w-[10px] h-[10px] bg-brand-600 rounded-full"></div>
            <span className="text-[12px]">{day.date.split('-').reverse().join('-')}</span>
            <span className="ml-auto text-[12px] text-[#5f6368]">{rupees(day.earnings)} ({day.jobCount})</span>
          </div>
        ))}
      </div>
    </div>
  );
}