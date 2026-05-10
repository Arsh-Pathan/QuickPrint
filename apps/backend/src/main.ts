import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Fails fast at boot if any production-required env vars are missing or
 * still hold placeholder values. Errors are written to stderr in a clear
 * banner so they aren't swallowed by container log buffers.
 *
 * Single-shop deployment: SHOP_ID identifies the one shop this backend serves.
 */
function assertProdEnv() {
  if (process.env.NODE_ENV !== 'production') return;
  const required = [
    'SHOP_ID',
    'JWT_SECRET',
    'AGENT_TOKEN_SECRET',
    'ADMIN_PASSWORD',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'DATABASE_URL',
  ];
  const missing = required.filter((k) => !process.env[k] || process.env[k] === '');
  const placeholders = required.filter((k) => {
    const v = process.env[k] ?? '';
    return v.startsWith('replace-with-') || /^x{6,}$/i.test(v);
  });
  const errors: string[] = [];
  if (missing.length) errors.push(`missing: ${missing.join(', ')}`);
  if (placeholders.length)
    errors.push(`placeholder values still in env: ${placeholders.join(', ')}`);
  if (errors.length) {
    const banner =
      '\n' +
      '═══════════════════════════════════════════════════════════════════\n' +
      ' QuickPrint backend refusing to start (NODE_ENV=production)\n' +
      '═══════════════════════════════════════════════════════════════════\n' +
      errors.map((e) => `  • ${e}`).join('\n') +
      '\n' +
      '\n  Fix: edit apps/backend/.env or your deployment env, then restart.\n' +
      '  See docs/CRITICAL_FIXES_AND_SCENARIOS.md §3 for the full checklist.\n' +
      '═══════════════════════════════════════════════════════════════════\n';
    process.stderr.write(banner);
    process.exit(1);
  }
}

async function bootstrap() {
  assertProdEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS')?.split(',') ?? '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const swagger = new DocumentBuilder()
    .setTitle('QuickPrint API')
    .setDescription('Print job, payment, queue, and printer endpoints')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(config.get('BACKEND_PORT') ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`QuickPrint backend listening on 0.0.0.0:${port}`, 'Bootstrap');
}

void bootstrap().catch((err) => {
  process.stderr.write(`\nQuickPrint backend bootstrap failed:\n${(err as Error)?.stack ?? err}\n`);
  process.exit(1);
});
