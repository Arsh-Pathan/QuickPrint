import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
type PrinterStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'PAPER_OUT' | 'TONER_LOW' | 'JAM' | 'ERROR';
const VALID_STATUSES = new Set(['ONLINE', 'OFFLINE', 'BUSY', 'PAPER_OUT', 'TONER_LOW', 'JAM', 'ERROR']);
const PrinterStatus = {
  ONLINE: 'ONLINE' as const,
  OFFLINE: 'OFFLINE' as const,
  BUSY: 'BUSY' as const,
  PAPER_OUT: 'PAPER_OUT' as const,
  TONER_LOW: 'TONER_LOW' as const,
  JAM: 'JAM' as const,
  ERROR: 'ERROR' as const,
};

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(shopId?: string) {
    return this.prisma.printer.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  recordHealth(printerId: string, snapshot: {
    status: PrinterStatus;
    paperLevel?: number;
    tonerLevel?: number;
    message?: string;
  }) {
    return this.prisma.$transaction([
      this.prisma.printerHealthSnapshot.create({
        data: { printerId, ...snapshot },
      }),
      this.prisma.printer.update({
        where: { id: printerId },
        data: { status: snapshot.status, lastSeenAt: new Date() },
      }),
    ]);
  }

  async syncFromHeartbeat(shopId: string, printers: any[]) {
    if (!printers || !Array.isArray(printers)) return;
    const now = new Date();

    try {
      await this.prisma.shop.upsert({
        where: { id: shopId },
        create: { id: shopId, name: 'Local Dev Shop' },
        update: {},
      });
    } catch (e) {
      this.logger.warn(`shop upsert failed for ${shopId}: ${(e as Error).message}`);
    }

    const statusMap = (raw: unknown): PrinterStatus => {
      const s = String(raw).toUpperCase();
      return VALID_STATUSES.has(s) ? (s as PrinterStatus) : PrinterStatus.ONLINE;
    };

    for (const p of printers) {
      const pid = String(p.id);
      const pname = String(p.name);
      const status = statusMap(p.status);
      const supportsColor = p.supportsColor !== undefined ? Boolean(p.supportsColor) : true;
      const supportsDuplex = p.supportsDuplex !== undefined ? Boolean(p.supportsDuplex) : true;

      try {
        // For new printers we seed capabilities from the agent's report,
        // but `enabled` stays false until the admin confirms setup.
        // For existing printers we only sync runtime fields (status, lastSeenAt, name);
        // capabilities + category + enabled are admin-controlled and must NOT be
        // overwritten by the agent's heartbeat.
        await this.prisma.printer.upsert({
          where: { id: pid },
          create: {
            id: pid,
            shopId,
            name: pname,
            supportsColor,
            supportsDuplex,
            enabled: false,
            category: 'GENERAL',
            status,
            lastSeenAt: now,
          },
          update: {
            name: pname,
            shopId,
            status,
            lastSeenAt: now,
          },
        });
      } catch (err) {
        this.logger.warn(`printer upsert failed for ${pid}: ${(err as Error).message}`);
      }
    }
  }

  async update(
    id: string,
    patch: {
      name?: string;
      supportsColor?: boolean;
      supportsDuplex?: boolean;
      enabled?: boolean;
      category?: 'GENERAL' | 'LONG' | 'SHORT' | 'COLOR';
      longPagesThreshold?: number;
    },
  ) {
    const existing = await this.prisma.printer.findUnique({ where: { id } });
    if (!existing) return null;

    return this.prisma.printer.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.supportsColor !== undefined ? { supportsColor: patch.supportsColor } : {}),
        ...(patch.supportsDuplex !== undefined ? { supportsDuplex: patch.supportsDuplex } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.longPagesThreshold !== undefined ? { longPagesThreshold: patch.longPagesThreshold } : {}),
      },
    });
  }
}

