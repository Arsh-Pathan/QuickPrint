'use client';

import { rupees } from '@/lib/format';

export function TopSettingsTable({ data }: { data: { settingName: string; usageCount: number; lastUsed: string }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-[#5f6368]">No settings data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8f9fa]">
              <th className="py-3 px-4 text-[11px] font-medium text-[#5f6368] left">Setting</th>
              <th className="py-3 px-4 text-[11px] font-medium text-[#5f6368] left">Usage Count</th>
              <th className="py-3 px-4 text-[11px] font-medium text-[#5f6368] left">Last Used</th>
            </tr>
          </thead>
          <tbody>
            {data.map((setting, index) => (
              <tr 
                key={index} 
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'} hover:bg-[#f0f0f0] transition-colors`}
              >
                <td className="py-3 px-4 text-[12px] font-medium text-[#202124]">{setting.settingName}</td>
                <td className="py-3 px-4 text-[12px] text-[#5f6368]">{setting.usageCount}</td>
                <td className="py-3 px-4 text-[12px] text-[#5f6368]">
                  {new Date(setting.lastUsed).toLocaleDateString()} 
                  {new Date(setting.lastUsed).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}