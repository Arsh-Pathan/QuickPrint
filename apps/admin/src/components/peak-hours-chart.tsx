'use client';

import { rupees } from '@/lib/format';

export function PeakHoursChart({ data }: { data: { hour: number; jobCount: number; earnings: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-[#5f6368]">No peak hours data available</p>
      </div>
    );
  }

  // Find max values for scaling
  const maxJobCount = Math.max(...data.map(d => d.jobCount));
  const maxEarnings = Math.max(...data.map(d => d.earnings));
  const barHeight = 15; // Fixed height for each bar
  const gap = 3; // Gap between bars
  const totalHeight = (barHeight + gap) * data.length - gap;

  return (
    <div className="space-y-4">
      <div className="flex items-end h-[180px] w-full bg-[#f8f9fa] rounded-lg p-4 relative">
        {data.map((hourData, index) => {
          const heightPercentJob = (hourData.jobCount / maxJobCount) * 100;
          const heightPercentEarn = (hourData.earnings / maxEarnings) * 100;
          const barHeightJob = (heightPercentJob / 100) * 80; // 80px max height
          const barHeightEarn = (heightPercentEarn / 100) * 80; // 80px max height
          
          return (
            <div key={hourData.hour} className="flex items-end">
              <div className="flex-1 flex items-end justify-center">
                {/* Job count bar (background) */}
                <div 
                  className="w-[8px] bg-[#e0e0e0] rounded-t-lg"
                  style={{ height: '80px' }}
                />
                {/* Earnings bar (foreground) */}
                <div 
                  className="w-[8px] bg-brand-600 rounded-t-lg transition-all duration-300"
                  style={{ 
                    height: `${barHeightEarn}px`,
                    position: 'absolute',
                    bottom: '0'
                  }}
                  title={`${rupees(hourData.earnings)} (${hourData.jobCount} jobs)`}
                />
                
                {/* Hour label */}
                <div className="text-[9px] text-[#5f6368] w-[24px] text-center mt-1">
                  {hourData.hour}:00
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-end w-12">
          <div className="text-[9px] text-[#5f6368]">₹{maxEarnings.toFixed(0)}</div>
          <div className="text-[9px] text-[#5f6368]">₹0</div>
        </div>
      </div>
      
      <div className="space-y-1">
        {data.map((hourData) => (
          <div key={hourData.hour} className="flex items-center space-x-2">
            <div className="w-[6px] h-[6px] bg-brand-600 rounded-full"></div>
            <span className="text-[10px]">{hourData.hour}:00</span>
            <span className="ml-auto text-[10px] text-[#5f6368]">{rupees(hourData.earnings)} ({hourData.jobCount})</span>
          </div>
        ))}
      </div>
    </div>
  );
}