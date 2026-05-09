import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Dev/admin login. Issues an ADMIN-role JWT in exchange for the
   * ADMIN_PASSWORD env var. Reuses (or creates) a singleton admin user row
   * keyed by phone="admin" so foreign-key columns referencing User work.
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

  async requestOtp(phone: string) {
    await this.otp.send(phone);
    return { sent: true };
  }

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

  async anonymousLogin() {
    const user = await this.prisma.user.create({
      data: { role: 'STUDENT' },
    });

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, phone: user.phone, role: user.role } };
  }
}
