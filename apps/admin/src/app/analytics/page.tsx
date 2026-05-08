export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500">
          Daily earnings, peak hours, top settings — populated from the audit log.
        </p>
      </header>
      <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white py-24 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
        Charts arrive in a follow-up commit.
      </div>
    </div>
  );
}
