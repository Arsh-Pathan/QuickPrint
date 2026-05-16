import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET_TOKEN } from './jwt-secret.provider';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  role: 'STUDENT' | 'ADMIN' | 'AGENT';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(JWT_SECRET_TOKEN) secret: string,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Confirm the user the JWT references still exists. Anonymous student
  // users get pruned after a quiet period (see AuthService.pruneAnonymousUsers),
  // so a stale-but-unexpired token can otherwise reach controllers and trigger
  // FK violations on print-job / payment writes. Forcing 401 here lets the web
  // client re-issue an anonymous login cleanly.
  async validate(payload: JwtPayload) {
    if (!payload?.sub) throw new UnauthorizedException('invalid_token');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });
    if (!user) throw new UnauthorizedException('user_not_found');
    return { userId: user.id, role: user.role };
  }
}
