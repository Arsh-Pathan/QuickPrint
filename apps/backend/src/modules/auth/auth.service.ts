import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogService,
    private readonly settings: SettingsService,
  ) {}

  async adminLogin(password: string) {
    const expected =
      (await this.settings.getSecret('adminPassword')) ||
      this.config.get<string>('ADMIN_PASSWORD') ||
      '';
    if (!expected || password !== expected) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const user = await this.prisma.user.upsert({
      where: { phone: 'admin' },
      update: { role: 'ADMIN' },
      create: { phone: 'admin', role: 'ADMIN', name: 'Admin' },
    });
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    this.audit.record({
      action: 'auth.admin-login',
      entityType: 'User',
      entityId: user.id,
      after: { role: user.role },
    });
    return { token, user: { id: user.id, role: user.role } };
  }

  async anonymousLogin(name?: string, phone?: string) {
    await this.pruneAnonymousUsers().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`anonymous cleanup skipped: ${message}`);
    });

    const cleanName = name?.trim() || null;
    const cleanPhone = phone?.trim() || null;

    // If the student gave us a phone number they've used before, reuse the
    // same user (and refresh their name if they retyped it). Lets a returning
    // student see their job history without forcing a real account system.
    let user = null as Awaited<ReturnType<typeof this.prisma.user.findUnique>>;
    if (cleanPhone) {
      user = await this.prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (user) {
        if (cleanName && cleanName !== user.name) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { name: cleanName },
          });
        }
      }
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: { role: 'STUDENT', name: cleanName, phone: cleanPhone },
      });
    }

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } };
  }

  private async pruneAnonymousUsers() {
    // Cutoff must exceed the JWT lifetime (default 7d) so a returning student's
    // unexpired token can't reference a user we've already deleted — that
    // produced FK violations on POST /api/print-jobs in the field.
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
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
