import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: {
    skip?: number;
    take?: number;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ id: string; [k: string]: unknown }[]> {
    const { skip, take, entityType, entityId, actorId, startDate, endDate } = options;

    return this.prisma.auditLog.findMany({
      skip,
      take,
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(actorId && { actorId }),
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(startDate && !endDate && {
          createdAt: {
            gte: startDate,
          },
        }),
        ...(!startDate && endDate && {
          createdAt: {
            lte: endDate,
          },
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async count(options: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const { entityType, entityId, actorId, startDate, endDate } = options;

    return this.prisma.auditLog.count({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(actorId && { actorId }),
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
        ...(startDate && !endDate && {
          createdAt: {
            gte: startDate,
          },
        }),
        ...(!startDate && endDate && {
          createdAt: {
            lte: endDate,
          },
        }),
      },
    });
  }
}