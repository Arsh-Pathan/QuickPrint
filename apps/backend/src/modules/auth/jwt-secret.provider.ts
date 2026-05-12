import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const JWT_SECRET_TOKEN = 'JWT_SECRET_RESOLVED';

export async function resolveJwtSecret(prisma: PrismaService, cfg: ConfigService): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'shop' } });
    if (row?.value) {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : (row.value as any);
      const fromDb = parsed?.secrets?.jwtSecret;
      if (typeof fromDb === 'string' && fromDb.length > 0) return fromDb;
    }
  } catch {
    // fall through to env
  }
  const fromEnv = cfg.get<string>('JWT_SECRET');
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  throw new Error(
    'JWT_SECRET not configured (no value in Setting.secrets.jwtSecret and no JWT_SECRET env var)',
  );
}

export const jwtSecretProvider: Provider = {
  provide: JWT_SECRET_TOKEN,
  inject: [PrismaService, ConfigService],
  useFactory: (prisma: PrismaService, cfg: ConfigService) => resolveJwtSecret(prisma, cfg),
};
