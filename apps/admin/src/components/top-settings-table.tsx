'use client';

export function TopSettingsTable({ data }: { data: { settingName: string; usageCount: number; lastUsed: string }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] font-bold text-m3-ink-faint uppercase tracking-widest">No metadata available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-m3-surface-container/50 border-b border-m3-outline-variant/30">
          <tr className="text-m3-ink-muted text-[10px] font-extrabold uppercase tracking-widest">
            <th className="py-4 px-6">Configuration</th>
            <th className="py-4 px-6 text-center">Frequency</th>
            <th className="py-4 px-6 text-right">Most Recent</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-m3-outline-variant/20">
          {data.map((setting, index) => (
            <tr 
              key={index} 
              className="hover:bg-m3-surface-container-low transition-colors group"
            >
              <td className="py-4 px-6">
                <span className="text-[13px] font-bold text-m3-ink group-hover:text-m3-primary transition-colors">
                  {setting.settingName}
                </span>
              </td>
              <td className="py-4 px-6 text-center">
                <span className="inline-flex h-7 px-3 items-center justify-center rounded-full bg-m3-surface-container text-[11px] font-bold text-m3-ink tabular-nums">
                  {setting.usageCount}
                </span>
              </td>
              <td className="py-4 px-6 text-right">
                <div className="text-[11px] text-m3-ink-muted flex flex-col font-medium">
                  <span>{new Date(setting.lastUsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-[10px] text-m3-ink-faint">{new Date(setting.lastUsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}