'use client';

import { useEffect, useState } from 'react';
import { SettingsService } from '@/lib/settings';

export function SettingsForm() {
  const [settings, setSettings] = useState<{
    shopName: string;
    bwPaise: number;
    colorPaise: number;
    duplexDiscountPct: number;
    defaultPaperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
    acceptingJobs: boolean;
  }>({
    shopName: '',
    bwPaise: 0,
    colorPaise: 0,
    duplexDiscountPct: 0,
    defaultPaperSize: 'A4',
    acceptingJobs: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSettings();
      setSettings(data);
    } catch (err) {
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
      await SettingsService.updateSettings(settings);
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4">
          <p>{success}</p>
        </div>
      )}
      
      <div>
        <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
          Shop Name
        </label>
        <input
          id="shopName"
          type="text"
          value={settings.shopName}
          onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
          disabled={loading}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="bwPaise" className="block text-sm font-medium text-gray-700 mb-1">
            B/W Price (paise)
          </label>
          <input
            id="bwPaise"
            type="number"
            min="0"
            value={settings.bwPaise}
            onChange={(e) => setSettings({ ...settings, bwPaise: Number(e.target.value) || 0 })}
            disabled={loading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="colorPaise" className="block text-sm font-medium text-gray-700 mb-1">
            Color Price (paise)
          </label>
          <input
            id="colorPaise"
            type="number"
            min="0"
            value={settings.colorPaise}
            onChange={(e) => setSettings({ ...settings, colorPaise: Number(e.target.value) || 0 })}
            disabled={loading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="duplexDiscountPct" className="block text-sm font-medium text-gray-700 mb-1">
            Duplex Discount (%)
          </label>
          <input
            id="duplexDiscountPct"
            type="number"
            min="0"
            max="100"
            value={settings.duplexDiscountPct}
            onChange={(e) => setSettings({ ...settings, duplexDiscountPct: Number(e.target.value) || 0 })}
            disabled={loading}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="defaultPaperSize" className="block text-sm font-medium text-gray-700 mb-1">
            Default Paper Size
          </label>
            <select
              id="defaultPaperSize"
              value={settings.defaultPaperSize}
              onChange={(e) => setSettings({ ...settings, defaultPaperSize: e.target.value as 'A4' | 'A3' | 'LETTER' | 'LEGAL' })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="LETTER">LETTER</option>
            <option value="LEGAL">LEGAL</option>
          </select>
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          id="acceptingJobs"
          type="checkbox"
          checked={settings.acceptingJobs}
          onChange={(e) => setSettings({ ...settings, acceptingJobs: e.target.checked })}
          disabled={loading}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="acceptingJobs" className="ml-2 block text-sm font-medium text-gray-900">
          Accepting Jobs
        </label>
      </div>
      
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}