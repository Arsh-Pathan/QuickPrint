import { useAuth } from './auth';
import { api } from './api';

export interface ShopSettings {
  shopName: string;
  bwPaise: number;
  colorPaise: number;
  duplexDiscountPct: number;
  defaultPaperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  acceptingJobs: boolean;
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
    try {
      const data = await api.post<ShopSettings>('/settings', patch);
      return data;
    } catch (error) {
      throw new Error('Failed to update settings');
    }
  }
}