import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Secure Admin login using a pre-configured environment password.
   * This reuses or creates a singleton admin user in the database
   * to maintain data integrity for foreign key references.
   */
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

  /**
   * Triggers the OTP delivery process for a given phone number.
   */
  async requestOtp(phone: string) {
    await this.otp.send(phone);
    return { sent: true };
  }

  /**
   * Validates the OTP and signs a JWT for the student.
   * If the user doesn't exist, they are automatically registered.
   */
  async verifyOtp(phone: string, code: string) {
    const ok = await this.otp.verify(phone, code);
    if (!ok) throw new UnauthorizedException('invalid_otp');

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, phone: user.phone, role: user.role } };
  }

  /**
   * Creates an ephemeral guest account. 
   * Useful for users who want to print without permanent registration.
   */
  async anonymousLogin() {
    await this.pruneAnonymousUsers().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`anonymous cleanup skipped: ${message}`);
    });

    const user = await this.prisma.user.create({
      data: { role: 'STUDENT' },
    });

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, phone: user.phone, role: user.role } };
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
