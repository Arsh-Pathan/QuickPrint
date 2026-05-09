import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Status = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'PAPER_OUT' | 'TONER_LOW' | 'JAM' | 'ERROR';

@Injectable()
export class PrintersService {
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

    // Ensure the Shop exists to prevent Postgres foreign key constraint errors
    try {
      await this.prisma.shop.upsert({
        where: { id: shopId },
        create: { id: shopId, name: 'Local Dev Shop' },
        update: {},
      });
    } catch (e) {
      // safe to ignore if shop already exists
    }

    for (const p of printers) {
      const pid = String(p.id);
      const pname = String(p.name);
      
      try {
        const existing = await this.prisma.printer.findUnique({ where: { id: pid } });
        if (existing) {
          await this.prisma.printer.update({
            where: { id: pid },
            data: {
              name: pname,
              // Only update status if provided, otherwise keep current
              ...(p.status ? { status: String(p.status).toUpperCase() as any } : {}),
              lastSeenAt: now,
            },
          });
        } else {
          await this.prisma.printer.create({
            data: {
              id: pid,
              shopId,
              name: pname,
              supportsColor: true,
              supportsDuplex: true,
              status: (p.status ? String(p.status).toUpperCase() : 'ONLINE') as any,
              lastSeenAt: now,
            },
          });
        }
      } catch (err) {
        // ignore individual printer insert errors
      }
    }
  }
}

