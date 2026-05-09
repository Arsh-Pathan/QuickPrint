import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async adminLogin(password: string) {
    const expected = this.config.get<string>('ADMIN_PASSWORD');
    if (!expected || password !== expected) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const user = await this.prisma.user.upsert({
      where: { phone: 'admin' },
      update: { role: 'ADMIN' },
      create: { phone: 'admin', role: 'ADMIN', name: 'Admin' },
    });
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, role: user.role } };
  }

  async anonymousLogin(name?: string) {
    await this.pruneAnonymousUsers().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`anonymous cleanup skipped: ${message}`);
    });

    const user = await this.prisma.user.create({
      data: { role: 'STUDENT', name: name?.trim() || null },
    });

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } };
  }

  private async pruneAnonymousUsers() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.prisma.user.deleteMany({
      where: {
        phone: null,
        role: 'STUDENT',
        createdAt: { lt: cutoff },
        printJobs: { none: {} },
        payments: { none: {} },
        notifications: { none: {} },
        auditLogs: { none: {} },
      },
    });
  }
}
