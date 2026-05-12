'use client';

import { useEffect, useState } from 'react';
import { SettingsService, ShopSecrets, ShopSettings } from '@/lib/settings';

const SECRET_FIELDS: Array<{
  key: keyof ShopSecrets;
  label: string;
  isPassword: boolean;
  warn?: string;
}> = [
  { key: 'razorpayKeyId', label: 'Razorpay Key ID', isPassword: false },
  { key: 'razorpayKeySecret', label: 'Razorpay Key Secret', isPassword: true },
  { key: 'razorpayWebhookSecret', label: 'Razorpay Webhook Secret', isPassword: true },
  { key: 'jwtSecret', label: 'JWT Secret', isPassword: true, warn: 'Changing this signs out all users.' },
  { key: 'agentTokenSecret', label: 'Agent Token Secret', isPassword: true, warn: 'Active print agents must be re-issued tokens.' },
  { key: 'adminPassword', label: 'Admin Password', isPassword: true },
];

export function SettingsForm() {
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: '',
    bwPaise: 0,
    colorPaise: 0,
    duplexDiscountPct: 0,
    defaultPaperSize: 'A4',
    acceptingJobs: true,
    publicUrl: '',
    cloudflareToken: '',
    secrets: {},
  });

  // Masked tails shown as placeholders (e.g. ••••••••XYZ4)
  const [masks, setMasks] = useState<ShopSecrets>({});
  // Pending overwrites — only non-empty strings are sent
  const [secretInputs, setSecretInputs] = useState<ShopSecrets>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showSecrets, setShowSecrets] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [restartPrompt, setRestartPrompt] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSettings();
      setSettings({ ...data, secrets: {} });
      setMasks(data.secrets ?? {});
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Non-secret fields
      const { secrets: _drop, ...nonSecret } = settings;

      // Only send secret fields the admin actually typed into
      const secretsPatch: ShopSecrets = {};
      for (const [k, v] of Object.entries(secretInputs)) {
        if (typeof v === 'string' && v.length > 0) {
          (secretsPatch as any)[k] = v;
        }
      }
      const hasSecretChange = Object.keys(secretsPatch).length > 0;

      const result = await SettingsService.updateSettings({
        ...nonSecret,
        secrets: hasSecretChange ? secretsPatch : undefined,
      });

      setSuccess('Settings saved.');
      setSecretInputs({});
      setRevealed({});

      // Refresh masks from server response
      if (result.secrets) setMasks(result.secrets as ShopSecrets);

      if (hasSecretChange || result.restartRequired) {
        setRestartPrompt(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const onRestartNow = async () => {
    try {
      setRestarting(true);
      await SettingsService.restartBackend();
      // Backend exits 0; Electron launcher relaunches it. Poll readyz to know when it's back.
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const res = await fetch('/api/readyz', { cache: 'no-store' });
          if (res.ok) {
            setRestarting(false);
            setRestartPrompt(false);
            setSuccess('Backend restarted. New settings are live.');
            return;
          }
        } catch {
          // backend is still restarting
        }
      }
      setRestarting(false);
      setError('Restart taking longer than expected — try refreshing the page.');
    } catch (err: any) {
      setRestarting(false);
      setError(err.message || 'Restart failed');
    }
  };

  useEffect(() => { loadSettings(); }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-[#d93025]">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide">Shop Name</label>
          <input type="text" value={settings.shopName} onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} disabled={loading} className="google-input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide">B/W (paise)</label>
            <input type="number" min="0" value={settings.bwPaise} onChange={(e) => setSettings({ ...settings, bwPaise: Number(e.target.value) || 0 })} disabled={loading} className="google-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide">Color (paise)</label>
            <input type="number" min="0" value={settings.colorPaise} onChange={(e) => setSettings({ ...settings, colorPaise: Number(e.target.value) || 0 })} disabled={loading} className="google-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide">Duplex Discount (%)</label>
            <input type="number" min="0" max="100" value={settings.duplexDiscountPct} onChange={(e) => setSettings({ ...settings, duplexDiscountPct: Number(e.target.value) || 0 })} disabled={loading} className="google-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide">Default Paper Size</label>
            <select value={settings.defaultPaperSize} onChange={(e) => setSettings({ ...settings, defaultPaperSize: e.target.value as any })} disabled={loading} className="google-input">
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="LETTER">LETTER</option>
              <option value="LEGAL">LEGAL</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSettings({ ...settings, acceptingJobs: !settings.acceptingJobs })}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 ${settings.acceptingJobs ? 'bg-brand-500' : 'bg-[#bdc1c6]'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-all duration-300 ease-in-out ${settings.acceptingJobs ? 'translate-x-[22px]' : 'translate-x-[2px]'} mt-[2px]`} />
          </button>
          <span className="text-sm font-medium text-[#3c4043]">Accepting Jobs</span>
        </div>
      </div>

      <div className="border-t border-[#dadce0] pt-6 space-y-5">
        <h3 className="text-[13px] font-semibold text-[#202124] uppercase tracking-wider">Public Access</h3>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368]">Student Web Public URL</label>
          <input type="url" placeholder="https://..." value={settings.publicUrl || ''} onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })} disabled={loading} className="google-input" />
          <p className="mt-1 text-[11px] text-[#5f6368]">Points your student QR code to this address.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368]">Cloudflare Tunnel Token</label>
          <input type="password" placeholder="Your long tunnel token..." value={settings.cloudflareToken || ''} onChange={(e) => setSettings({ ...settings, cloudflareToken: e.target.value })} disabled={loading} className="google-input" />
          <p className="mt-1 text-[11px] text-[#5f6368]">If provided, the desktop app will try to start the tunnel automatically.</p>
        </div>
      </div>

      <div className="border-t border-[#dadce0] pt-6">
        <button
          type="button"
          onClick={() => setShowSecrets((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="text-[13px] font-semibold text-[#202124] uppercase tracking-wider">Environment &amp; Secrets</h3>
          <span className="text-[11px] text-[#5f6368]">{showSecrets ? 'Hide' : 'Show'}</span>
        </button>

        {showSecrets && (
          <div className="mt-4 space-y-4 rounded-lg bg-[#fafafa] p-4">
            <p className="text-[11px] text-[#5f6368]">
              Leave a field blank to keep the existing value. Saved values display only the last 4 characters.
            </p>
            {SECRET_FIELDS.map((field) => {
              const mask = (masks as any)[field.key] as string | undefined;
              const value = (secretInputs as any)[field.key] ?? '';
              const isRevealed = !!revealed[field.key as string];
              const inputType = field.isPassword && !isRevealed ? 'password' : 'text';
              return (
                <div key={field.key as string}>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#5f6368]">
                    {field.label}
                    {mask ? <span className="ml-2 font-mono text-[#9aa0a6]">current: {mask}</span> : <span className="ml-2 text-[#d93025]">not set</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={inputType}
                      value={value}
                      onChange={(e) => setSecretInputs({ ...secretInputs, [field.key]: e.target.value })}
                      disabled={loading}
                      placeholder={mask ? 'Enter new value to overwrite' : 'Enter value'}
                      className="google-input flex-1"
                      autoComplete="off"
                    />
                    {field.isPassword && (
                      <button
                        type="button"
                        onClick={() => setRevealed({ ...revealed, [field.key as string]: !isRevealed })}
                        className="rounded-md border border-[#dadce0] px-3 text-[11px] font-medium text-[#5f6368] hover:bg-white"
                      >
                        {isRevealed ? 'Hide' : 'Show'}
                      </button>
                    )}
                  </div>
                  {field.warn && (
                    <p className="mt-1 text-[11px] text-amber-700">⚠ {field.warn}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end pt-2">
        <button type="submit" disabled={loading} className="google-button-primary">
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {typeof window !== 'undefined' && settings.publicUrl && <SyncQRPreview url={settings.publicUrl} />}

      {restartPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-base font-semibold text-[#202124]">Restart required</h4>
            <p className="mt-2 text-sm text-[#5f6368]">
              Secret or environment values changed. The backend must restart to apply them. Restart now?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestartPrompt(false)}
                disabled={restarting}
                className="rounded-md border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#3c4043] hover:bg-[#f8f9fa] disabled:opacity-50"
              >
                Later
              </button>
              <button
                type="button"
                onClick={onRestartNow}
                disabled={restarting}
                className="google-button-primary"
              >
                {restarting ? 'Restarting…' : 'Restart now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function SyncQRPreview({ url }: { url: string }) {
  useEffect(() => {
    const preview = document.getElementById('qr-preview');
    if (preview && url) {
      preview.innerHTML = `
        <div class="flex flex-col items-center gap-3 animate-in fade-in duration-500">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" alt="QR Code" class="w-48 h-48 rounded shadow-sm border border-[#dadce0]" />
          <span class="text-[11px] text-brand-600 font-medium truncate max-w-[200px] bg-brand-50 px-2 py-0.5 rounded-full">${url}</span>
        </div>
      `;
    }
  }, [url]);
  return null;
}
