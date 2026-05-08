import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

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
