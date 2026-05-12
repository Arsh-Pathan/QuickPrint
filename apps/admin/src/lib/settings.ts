import { api } from './api';

export interface ShopSecrets {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  jwtSecret?: string;
  agentTokenSecret?: string;
  adminPassword?: string;
}

export interface ShopSettings {
  shopName: string;
  bwPaise: number;
  colorPaise: number;
  duplexDiscountPct: number;
  defaultPaperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  acceptingJobs: boolean;
  publicUrl?: string;
  cloudflareToken?: string;
  /** Masked values from server (e.g. ••••••••XYZ4) — never raw. */
  secrets?: ShopSecrets;
}

export interface UpdateSettingsResponse extends ShopSettings {
  restartRequired?: boolean;
}

export class SettingsService {
  static async getSettings(): Promise<ShopSettings> {
    try {
      return await api.get<ShopSettings>('/settings');
    } catch {
      throw new Error('Failed to load settings');
    }
  }

  static async updateSettings(patch: Partial<ShopSettings>): Promise<UpdateSettingsResponse> {
    return api.put<UpdateSettingsResponse>('/settings', patch);
  }

  static async updateSecrets(secrets: ShopSecrets): Promise<{ ok: boolean; restartRequired: boolean }> {
    return api.put('/settings/secrets', secrets);
  }

  static async restartBackend(): Promise<{ ok: boolean; restarting: boolean }> {
    return api.post('/admin/restart', {});
  }
}
