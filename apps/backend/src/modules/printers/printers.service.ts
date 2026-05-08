import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PrinterStatus as Status } from '@prisma/client';

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
