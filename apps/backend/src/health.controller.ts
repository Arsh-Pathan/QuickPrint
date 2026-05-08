import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  healthz() {
    return { status: 'ok', service: 'quickprint-backend' };
  }

  @Get('readyz')
  async readyz() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not_ready' };
    }
  }
}
