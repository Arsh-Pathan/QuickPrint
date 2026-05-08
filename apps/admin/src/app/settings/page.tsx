export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Pricing, default printer, agent token</p>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-500">
          Pricing config (B/W ₹ paise, color ₹ paise, duplex discount) and agent provisioning UI go here.
        </p>
      </div>
    </div>
  );
}
