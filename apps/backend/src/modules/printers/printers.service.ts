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
}
