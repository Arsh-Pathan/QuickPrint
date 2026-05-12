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
    <div className="m3-card relative overflow-hidden group p-6 transition-all duration-500 hover:shadow-elev-4 hover:-translate-y-1">
      {/* Mesh Gradient background (subtle) */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-m3-primary/5 blur-[40px] rounded-full group-hover:bg-m3-primary/10 transition-colors" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.15em] text-m3-ink-faint group-hover:text-m3-primary/60 transition-colors">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <p className="font-display text-3xl font-extrabold text-m3-ink tabular-nums tracking-tight">
              {value}
            </p>
          </div>
        </div>
        
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m3-surface-container text-m3-ink-muted transition-all duration-500 group-hover:bg-m3-primary group-hover:text-m3-on-primary group-hover:rotate-6 group-hover:shadow-elev-2">
            {icon}
          </div>
        )}
      </div>

      {hint && (
        <div className="relative z-10 mt-6 flex items-center gap-2 pt-4 border-t border-m3-outline-variant/30">
          <div className="h-1.5 w-1.5 rounded-full bg-m3-primary/40" />
          <p className="text-[12px] font-bold text-m3-ink-muted leading-none tracking-tight">
            {hint}
          </p>
        </div>
      )}
    </div>
  );
}
