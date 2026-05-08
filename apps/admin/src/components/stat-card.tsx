export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="google-card group" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-[#5f6368]">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f4] text-[#5f6368] transition-colors group-hover:bg-brand-50 group-hover:text-brand-500">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-[28px] font-bold text-[#202124] tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-[#70757a]">{hint}</p>}
    </div>
  );
}
