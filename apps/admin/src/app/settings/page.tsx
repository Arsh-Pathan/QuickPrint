'use client';
import { Settings as SettingsIcon, QrCode, Globe, ShieldCheck, Zap, Cog, Info } from 'lucide-react';
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
  return (
    <div className="space-y-12 py-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m3-surface-container text-m3-primary text-[10px] font-bold uppercase tracking-widest border border-m3-outline-variant/30">
            <Cog size={12} className="text-m3-primary" />
            System Protocol
          </div>
          <h1 className="m3-display-s text-m3-ink tracking-tight">Shop Settings</h1>
          <p className="text-[15px] text-m3-ink-muted">
            Configure financial parameters, network tunnels, and security credentials.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-m3-primary-container/20 border border-m3-primary/10 text-m3-primary text-[11px] font-black uppercase tracking-widest">
          <Zap size={14} className="animate-pulse" />
          Settings Sync: Online
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="m3-card relative overflow-hidden bg-white shadow-elev-2 border-m3-outline-variant/30 h-fit">
            <div className="absolute top-0 left-0 -ml-24 -mt-24 w-96 h-96 bg-m3-primary/5 blur-[120px] rounded-full" />
            <div className="flex items-center gap-5 px-8 py-8 border-b border-m3-outline-variant/30 relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m3-surface-container text-m3-primary shadow-sm transition-transform hover:rotate-6">
                <SettingsIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-black text-m3-ink tracking-tight">Core Configuration</h2>
                <p className="text-[12px] font-bold text-m3-ink-faint uppercase tracking-wider">Pricing & Operation Parameters</p>
              </div>
            </div>
            <div className="p-8 relative z-10">
              <SettingsForm />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          {/* Public Access Card */}
          <div className="m3-card relative overflow-hidden p-8 bg-m3-surface-container-low border-m3-outline-variant/30 shadow-elev-1">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-m3-primary/10 blur-[40px] rounded-full" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-m3-primary text-m3-on-primary shadow-elev-2">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[16px] font-black text-m3-ink tracking-tight">Public Gateway</h2>
                <p className="text-[10px] font-extrabold text-m3-primary uppercase tracking-widest leading-none mt-1">Student Entrypoint</p>
              </div>
            </div>
            
            <p className="mb-8 text-[13px] text-m3-ink-muted leading-relaxed font-medium">
              Establish a public tunnel (Cloudflare/Ngrok) to generate a dynamic QR code for shop-floor customer acquisition.
            </p>

            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-m3-outline-variant shadow-sm transition-all hover:border-m3-primary/30 group">
              <div id="qr-preview" className="relative">
                <div className="w-48 h-48 flex flex-col items-center justify-center text-m3-ink-faint text-center gap-4 px-6 opacity-40 group-hover:opacity-100 transition-opacity">
                  <QrCode size={40} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                    Awaiting URL Bind
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center gap-3 text-m3-ink-faint">
              <Info className="h-4 w-4" />
              <span className="text-[11px] font-black uppercase tracking-widest">Global Handshake Active</span>
            </div>
          </div>

          {/* Security Integrity Card */}
          <div className="m3-card relative overflow-hidden p-8 bg-m3-ink text-m3-surface shadow-elev-3">
            <div className="absolute bottom-0 right-0 -mr-12 -mb-12 w-48 h-48 bg-white/5 blur-[40px] rounded-full" />
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-m3-green">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-[14px] font-black tracking-tight uppercase tracking-[0.1em]">Security Protocol</h3>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed font-medium">
              Administrative credentials and API secrets are stored using AES-256 encryption. Changes to critical tokens will force-restart all synchronized backend nodes to ensure immediate cache invalidation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
