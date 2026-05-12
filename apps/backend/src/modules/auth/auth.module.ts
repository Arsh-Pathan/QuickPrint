import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsModule } from '../settings/settings.module';
import { JWT_SECRET_TOKEN, jwtSecretProvider } from './jwt-secret.provider';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SettingsModule,
    JwtModule.registerAsync({
      imports: [PrismaModule, ConfigModule],
      inject: [JWT_SECRET_TOKEN, ConfigService],
      useFactory: (secret: string, cfg: ConfigService) => ({
        secret,
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN') ?? '7d' },
      }),
      extraProviders: [jwtSecretProvider],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, jwtSecretProvider],
  exports: [AuthService],
})
export class AuthModule {}
