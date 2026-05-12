import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Status = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'PAPER_OUT' | 'TONER_LOW' | 'JAM' | 'ERROR';
const VALID_STATUSES = new Set(['ONLINE', 'OFFLINE', 'BUSY', 'PAPER_OUT', 'TONER_LOW', 'JAM', 'ERROR']);

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
    status: Status;
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

    const statusMap = (raw: unknown): string => {
      const s = String(raw).toUpperCase();
      return VALID_STATUSES.has(s) ? s : 'ONLINE';
    };

    for (const p of printers) {
      const pid = String(p.id);
      const pname = String(p.name);
      const status = statusMap(p.status);
      const supportsColor = p.supportsColor !== undefined ? Boolean(p.supportsColor) : true;
      const supportsDuplex = p.supportsDuplex !== undefined ? Boolean(p.supportsDuplex) : true;

      try {
        await this.prisma.printer.upsert({
          where: { id: pid },
          create: {
            id: pid,
            shopId,
            name: pname,
            supportsColor,
            supportsDuplex,
            status,
            lastSeenAt: now,
          },
          update: {
            name: pname,
            shopId,
            supportsColor,
            supportsDuplex,
            status,
            lastSeenAt: now,
          },
        });
      } catch (err) {
        this.logger.warn(`printer upsert failed for ${pid}: ${(err as Error).message}`);
      }
    }
  }
}

