import { useAuth } from './auth';
import { api } from './api';

export interface ShopSettings {
  shopName: string;
  bwPaise: number;
  colorPaise: number;
  duplexDiscountPct: number;
  defaultPaperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  acceptingJobs: boolean;
  publicUrl?: string;
  cloudflareToken?: string;
}

export class SettingsService {
  static async getSettings(): Promise<ShopSettings> {
    try {
      const data = await api.get<ShopSettings>('/settings');
      return data;
    } catch (error) {
      throw new Error('Failed to fetch settings');
    }
  }

  static async updateSettings(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    const data = await api.put<ShopSettings>('/settings', patch);
    return data;
  }
}