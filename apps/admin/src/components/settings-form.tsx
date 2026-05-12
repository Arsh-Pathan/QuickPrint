'use client';

import { useEffect, useState } from 'react';
import { SettingsService, ShopSecrets, ShopSettings } from '@/lib/settings';
import { 
  Shield, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  RefreshCcw,
  Store,
  DollarSign,
  Cloud
} from 'lucide-react';

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
  { key: 'agentTokenSecret', label: 'Agent Token Secret', isPassword: true, warn: 'Agents must be re-authenticated.' },
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

  const [masks, setMasks] = useState<ShopSecrets>({});
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
      setError('Failed to load configuration');
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

      const { secrets: _drop, ...nonSecret } = settings;
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

      setSuccess('Configuration synchronized successfully');
      setSecretInputs({});
      setRevealed({});

      if (result.secrets) setMasks(result.secrets as ShopSecrets);
      if (hasSecretChange || result.restartRequired) {
        setRestartPrompt(true);
      }
    } catch (err: any) {
      setError(err.message || 'Synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  const onRestartNow = async () => {
    try {
      setRestarting(true);
      await SettingsService.restartBackend();
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const res = await fetch('/api/readyz', { cache: 'no-store' });
          if (res.ok) {
            setRestarting(false);
            setRestartPrompt(false);
            setSuccess('Backend online. New settings are active.');
            return;
          }
        } catch { }
      }
      setRestarting(false);
      setError('Restart timeout — please check the console');
    } catch (err: any) {
      setRestarting(false);
      setError(err.message || 'Restart failure');
    }
  };

  useEffect(() => { loadSettings(); }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Feedback Notifications */}
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-3 rounded-2xl bg-m3-red-container/30 border border-m3-red/10 px-5 py-4 text-[13px] font-medium text-m3-red animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl bg-m3-green-container/30 border border-m3-green/10 px-5 py-4 text-[13px] font-medium text-m3-green animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* Basic Shop Info */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-2">
          <Store className="h-5 w-5 text-m3-primary" />
          <h3 className="m3-title-l text-m3-ink">Shop Details</h3>
        </div>
        
        <div className="m3-field">
          <input 
            type="text" 
            placeholder=" "
            value={settings.shopName} 
            onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} 
            disabled={loading} 
            className="m3-input" 
          />
          <label>Shop Name</label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="m3-field">
            <input 
              type="number" 
              placeholder=" "
              value={settings.bwPaise} 
              onChange={(e) => setSettings({ ...settings, bwPaise: Number(e.target.value) || 0 })} 
              disabled={loading} 
              className="m3-input" 
            />
            <label>B/W Rate (paise)</label>
          </div>
          <div className="m3-field">
            <input 
              type="number" 
              placeholder=" "
              value={settings.colorPaise} 
              onChange={(e) => setSettings({ ...settings, colorPaise: Number(e.target.value) || 0 })} 
              disabled={loading} 
              className="m3-input" 
            />
            <label>Color Rate (paise)</label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="m3-field">
            <input 
              type="number" 
              placeholder=" "
              value={settings.duplexDiscountPct} 
              onChange={(e) => setSettings({ ...settings, duplexDiscountPct: Number(e.target.value) || 0 })} 
              disabled={loading} 
              className="m3-input" 
            />
            <label>Duplex Discount (%)</label>
          </div>
          <div className="m3-field">
            <select 
              value={settings.defaultPaperSize} 
              onChange={(e) => setSettings({ ...settings, defaultPaperSize: e.target.value as any })} 
              disabled={loading} 
              className="m3-input appearance-none"
            >
              <option value="A4">A4 Standard</option>
              <option value="A3">A3 Large</option>
              <option value="LETTER">Letter</option>
              <option value="LEGAL">Legal</option>
            </select>
            <label>Default Paper</label>
            <ChevronDown className="absolute right-4 top-5 h-5 w-5 text-m3-ink-faint pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant/30 group">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${settings.acceptingJobs ? 'bg-m3-green shadow-[0_0_8px_rgba(52,168,83,0.5)]' : 'bg-m3-outline'}`} />
            <span className="text-sm font-bold text-m3-ink">Accepting New Print Orders</span>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, acceptingJobs: !settings.acceptingJobs })}
            disabled={loading}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-emphasized focus:outline-none ${settings.acceptingJobs ? 'bg-m3-primary' : 'bg-m3-outline'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-elev-2 ring-0 transition-all duration-300 ease-emphasized ${settings.acceptingJobs ? 'translate-x-[24px]' : 'translate-x-[4px]'} mt-[4px]`} />
          </button>
        </div>
      </div>

      {/* Network & Cloud */}
      <div className="space-y-8 pt-8 border-t border-m3-outline-variant/50">
        <div className="flex items-center gap-3 mb-2">
          <Cloud className="h-5 w-5 text-m3-primary" />
          <h3 className="m3-title-l text-m3-ink">Network Configuration</h3>
        </div>

        <div className="m3-field">
          <input 
            type="url" 
            placeholder=" " 
            value={settings.publicUrl || ''} 
            onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })} 
            disabled={loading} 
            className="m3-input" 
          />
          <label>Public Web URL</label>
          <p className="absolute -bottom-6 left-1 text-[10px] font-bold text-m3-ink-faint uppercase tracking-widest">Points QR code to this address</p>
        </div>

        <div className="m3-field pt-2">
          <input 
            type="password" 
            placeholder=" " 
            value={settings.cloudflareToken || ''} 
            onChange={(e) => setSettings({ ...settings, cloudflareToken: e.target.value })} 
            disabled={loading} 
            className="m3-input" 
          />
          <label>Cloudflare Tunnel Token</label>
          <p className="absolute -bottom-6 left-1 text-[10px] font-bold text-m3-ink-faint uppercase tracking-widest">Optional auto-tunnel startup</p>
        </div>
      </div>

      {/* Advanced Secrets */}
      <div className="pt-8 border-t border-m3-outline-variant/50">
        <button
          type="button"
          onClick={() => setShowSecrets((v) => !v)}
          className="flex w-full items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-m3-ink-muted group-hover:text-m3-primary transition-colors" />
            <h3 className="m3-title-l text-m3-ink">Security & API Credentials</h3>
          </div>
          <div className="flex items-center gap-2 text-m3-primary font-bold text-[11px] uppercase tracking-widest">
            {showSecrets ? 'Collapse' : 'Manage Keys'}
            {showSecrets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showSecrets && (
          <div className="mt-8 space-y-6 rounded-3xl bg-m3-surface-container-lowest p-8 border border-m3-outline-variant/30 animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-[12px] text-m3-ink-muted leading-relaxed">
              For security, existing values are masked. Type into a field only if you wish to overwrite the current key.
            </p>
            
            <div className="grid grid-cols-1 gap-8">
              {SECRET_FIELDS.map((field) => {
                const mask = (masks as any)[field.key] as string | undefined;
                const value = (secretInputs as any)[field.key] ?? '';
                const isRevealed = !!revealed[field.key as string];
                const inputType = field.isPassword && !isRevealed ? 'password' : 'text';
                
                return (
                  <div key={field.key as string} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[12px] font-bold text-m3-ink uppercase tracking-wider">{field.label}</label>
                      {mask ? (
                        <span className="text-[10px] font-mono text-m3-primary bg-m3-primary-container/30 px-2 py-0.5 rounded-full">active: {mask}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-m3-red uppercase tracking-widest">Unconfigured</span>
                      )}
                    </div>
                    <div className="relative group">
                      <input
                        type={inputType}
                        value={value}
                        onChange={(e) => setSecretInputs({ ...secretInputs, [field.key]: e.target.value })}
                        disabled={loading}
                        placeholder={mask ? '••••••••••••••••' : 'Enter new key'}
                        className="m3-input !pt-3 !pb-3 !h-12 !rounded-2xl"
                        autoComplete="off"
                      />
                      {field.isPassword && (
                        <button
                          type="button"
                          onClick={() => setRevealed({ ...revealed, [field.key as string]: !isRevealed })}
                          className="absolute right-3 top-3 h-6 w-6 flex items-center justify-center text-m3-ink-faint hover:text-m3-primary transition-colors"
                        >
                          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {field.warn && (
                      <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-m3-yellow uppercase tracking-widest leading-none">
                        <AlertCircle className="h-3 w-3" />
                        {field.warn}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 pt-6 pb-2 bg-gradient-to-t from-white via-white to-transparent">
        <button 
          type="submit" 
          disabled={loading} 
          className="m3-btn-filled w-full h-14 text-base font-bold shadow-elev-2 hover:shadow-elev-4 transition-all"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Synchronizing Settings…</span>
            </div>
          ) : (
            'Commit All Changes'
          )}
        </button>
      </div>

      {typeof window !== 'undefined' && settings.publicUrl && <SyncQRPreview url={settings.publicUrl} />}

      {/* Restart Dialog */}
      {restartPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-m3-on-surface/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md m3-card bg-white p-8 shadow-elev-5 animate-in scale-in-95 duration-300">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-primary-container text-m3-on-primary-container mb-6">
              <RefreshCcw className={`h-7 w-7 ${restarting ? 'animate-spin' : ''}`} />
            </div>
            <h4 className="m3-headline-s text-m3-ink">System Restart Required</h4>
            <p className="mt-3 text-[14px] text-m3-ink-muted leading-relaxed">
              Environment credentials or API secrets have been modified. The backend services must restart to authenticate with the new parameters.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setRestartPrompt(false)}
                disabled={restarting}
                className="m3-btn-text h-12"
              >
                Later
              </button>
              <button
                type="button"
                onClick={onRestartNow}
                disabled={restarting}
                className="m3-btn-filled h-12 px-8 flex-1 sm:flex-none"
              >
                {restarting ? 'Restarting…' : 'Restart Now'}
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
        <div class="flex flex-col items-center gap-4 animate-in zoom-in-95 fade-in duration-500">
          <div class="p-2 bg-white rounded-2xl shadow-elev-1 border border-m3-outline-variant/30">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" alt="QR Code" class="w-48 h-48 rounded-xl" />
          </div>
          <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-m3-primary-container/20 border border-m3-primary/10">
            <div class="h-1.5 w-1.5 rounded-full bg-m3-primary animate-pulse" />
            <span class="text-[11px] font-bold text-m3-primary truncate max-w-[200px] tracking-tight">${url.replace(/^https?:\/\//, '')}</span>
          </div>
        </div>
      `;
    }
  }, [url]);
  return null;
}
