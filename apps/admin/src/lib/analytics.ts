import { useAuth } from './auth';
import { api } from './api';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyEarnings {
  date: string;
  earnings: number;
  jobCount: number;
}

export interface PeakHour {
  hour: number; // 0-23
  jobCount: number;
  earnings: number;
}

export interface TopSetting {
  settingName: string;
  usageCount: number;
  lastUsed: string;
}

export class AnalyticsService {
  static async getAuditLogs(options: {
    skip?: number;
    take?: number;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]> {
    try {
      const queryParams = new URLSearchParams();
      if (options.skip !== undefined) queryParams.append('skip', String(options.skip));
      if (options.take !== undefined) queryParams.append('take', String(options.take));
      if (options.entityType) queryParams.append('entityType', options.entityType);
      if (options.entityId) queryParams.append('entityId', options.entityId);
      if (options.actorId) queryParams.append('actorId', options.actorId);
      if (options.startDate) queryParams.append('startDate', options.startDate.toISOString());
      if (options.endDate) queryParams.append('endDate', options.endDate.toISOString());

      const queryString = queryParams.toString();
      const path = `/audit-log${queryString ? `?${queryString}` : ''}`;
      
      const data = await api.get<AuditLogEntry[]>(path);
      return data;
    } catch (error) {
      throw new Error('Failed to fetch audit logs');
    }
  }

  static async getDailyEarnings(days: number = 7): Promise<DailyEarnings[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      
      const auditLogs = await this.getAuditLogs({
        entityType: 'PrintJob',
        startDate,
        endDate,
      });

      // Group by date and calculate earnings
      const earningsMap = new Map<string, { earnings: number; jobCount: number }>();

      auditLogs.forEach(log => {
        if (log.action === 'payment.completed' || log.action === 'payment.captured') {
          const date = new Date(log.createdAt).toISOString().split('T')[0] ?? '';
          const amount = Number(log.after?.amountPaise ?? 0);
          
          const current = earningsMap.get(date) || { earnings: 0, jobCount: 0 };
          earningsMap.set(date, {
            earnings: current.earnings + amount,
            jobCount: current.jobCount + 1
          });
        }
      });

      // Convert to array and sort by date
      const result: DailyEarnings[] = Array.from(earningsMap.entries())
        .map(([date, { earnings, jobCount }]) => ({ date, earnings, jobCount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return result;
    } catch (error) {
      throw new Error('Failed to fetch daily earnings');
    }
  }

  static async getPeakHours(days: number = 7): Promise<PeakHour[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      
      const auditLogs = await this.getAuditLogs({
        entityType: 'PrintJob',
        startDate,
        endDate,
      });

      // Group by hour and calculate metrics
      const hoursMap = new Map<number, { jobCount: number; earnings: number }>();

      auditLogs.forEach(log => {
        if (log.action === 'payment.completed' || log.action === 'payment.captured') {
          const date = new Date(log.createdAt);
          const hour = date.getHours();
          const amount = Number(log.after?.amountPaise ?? 0);
          
          const current = hoursMap.get(hour) || { jobCount: 0, earnings: 0 };
          hoursMap.set(hour, {
            jobCount: current.jobCount + 1,
            earnings: current.earnings + amount
          });
        }
      });

      // Convert to array and sort by job count descending
      const result: PeakHour[] = Array.from(hoursMap.entries())
        .map(([hour, { jobCount, earnings }]) => ({ hour, jobCount, earnings }))
        .sort((a, b) => b.jobCount - a.jobCount);

      return result;
    } catch (error) {
      throw new Error('Failed to fetch peak hours');
    }
  }

  static async getTopSettings(days: number = 7): Promise<TopSetting[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      
      const auditLogs = await this.getAuditLogs({
        entityType: 'PrintJob',
        startDate,
        endDate,
      });

      // Count setting usage
      const settingsMap = new Map<string, { usageCount: number; lastUsed: string }>();

      auditLogs.forEach(log => {
        if (log.action.startsWith('print-job.updated')) {
          const settingName = String(log.after?.settingName ?? 'unknown');
          const lastUsed = log.createdAt;
          
          const current = settingsMap.get(settingName) || { usageCount: 0, lastUsed: '' };
          settingsMap.set(settingName, {
            usageCount: current.usageCount + 1,
            lastUsed: lastUsed > current.lastUsed ? lastUsed : current.lastUsed
          });
        }
      });

      // Convert to array and sort by usage count descending
      const result: TopSetting[] = Array.from(settingsMap.entries())
        .map(([settingName, { usageCount, lastUsed }]) => ({ settingName, usageCount, lastUsed }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5); // Top 5

      return result;
    } catch (error) {
      throw new Error('Failed to fetch top settings');
    }
  }
}